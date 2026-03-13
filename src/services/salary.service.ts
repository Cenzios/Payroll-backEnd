import prisma from '../config/db';
import { getActivePayrollRates } from './payroll-config.service';
import { calculateMonthlyPAYE } from './tax-calculation.service';
import { Decimal } from '@prisma/client/runtime/library';

interface SalaryData {
    employeeId: string;
    month: number;
    year: number;
    workingDays: number;
    otHours?: number;
    otAmount?: number;
    salaryAdvance?: number;
    isEpfEnabled?: boolean;
    companyWorkingDays: number;
    allowances?: { type: string, amount: number }[];
    deductions?: { type: string, amount: number }[];
    isLoanEnabled?: boolean;
}

const calculateAndSaveSalary = async (companyId: string, data: SalaryData) => {
    const {
        employeeId,
        month,
        year,
        workingDays,
        otHours = 0,
        otAmount = 0,
        salaryAdvance = 0,
        isEpfEnabled = true,
        companyWorkingDays,
        allowances = [],
        deductions = [],
        isLoanEnabled = true
    } = data;

    // 1. Fetch Employee
    const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId }
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    // Check if salary already exists for this month
    const existingSalary = await prisma.salary.findFirst({
        where: {
            employeeId,
            month,
            year,
        }
    });

    if (existingSalary) {
        throw new Error('Salary record already exists for this month');
    }

    // 2. Load Active Payroll Configuration
    const payrollConfig = await getActivePayrollRates();

    // 3. Perform Calculations
    const basicPay = employee.salaryType === 'MONTHLY'
        ? (employee.basicSalary / companyWorkingDays) * workingDays
        : employee.basicSalary * workingDays;

    const calculatedOtAmount = otHours * (employee.otRate || 0);

    // Calculate custom allowances and deductions
    const allowanceTotal = allowances.reduce((sum, a) => sum + a.amount, 0);
    const extraDeductionTotal = deductions.reduce((sum, d) => sum + d.amount, 0);

    // Convert Decimal to number for calculations
    const employeeEPFRate = Number(payrollConfig.employeeEPFRate);
    const employerEPFRate = Number(payrollConfig.employerEPFRate);
    const etfRateValue = Number(payrollConfig.etfRate);

    let employeeEPF = 0;
    let employerEPF = 0;
    let etfAmount = 0;

    if (isEpfEnabled) {
        employeeEPF = (basicPay * employeeEPFRate) / 100;
        employerEPF = (basicPay * employerEPFRate) / 100;
        etfAmount = (basicPay * etfRateValue) / 100;
    }

    // 4. Calculate Monthly PAYE Tax (only if EPF is enabled)
    const employeeTaxAmount = isEpfEnabled ? calculateMonthlyPAYE(basicPay, {
        taxFreeMonthlyLimit: Number(payrollConfig.taxFreeMonthlyLimit),
        slab1Limit: Number(payrollConfig.slab1Limit),
        slab1Rate: Number(payrollConfig.slab1Rate),
        slab2Limit: Number(payrollConfig.slab2Limit),
        slab3Limit: Number(payrollConfig.slab3Limit),
        slab3Rate: Number(payrollConfig.slab3Rate),
        slab4Limit: Number(payrollConfig.slab4Limit),
        slab4Rate: Number(payrollConfig.slab4Rate),
        slab5Rate: Number(payrollConfig.slab5Rate),
    } as any) : 0;

    // 4.5 Handle Loan Installments
    // Find installments due in THIS month that are PENDING or PARTIAL
    const pendingInstallments = await prisma.loanInstallment.findMany({
        where: {
            loan: { employeeId, companyId, deletedAt: null },
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1)
            }
        }
    });

    // Only calculate loan deduction if loan is enabled
    const loanDeductionTotal = isLoanEnabled
        ? pendingInstallments.reduce((sum, inst) => sum + (inst.amount - inst.paidAmount), 0)
        : 0;

    // 5. Calculate Net Salary
    // Net Salary = (Basic Pay + OT Amount + Allowances) - Employee EPF - PAYE Tax - Salary Advance - Custom Deductions - Loan Deductions
    const totalDeductionCalc = employeeEPF + employeeTaxAmount + salaryAdvance + extraDeductionTotal + loanDeductionTotal;
    const grossSalaryCalc = basicPay + calculatedOtAmount + allowanceTotal;
    const netSalary = grossSalaryCalc - totalDeductionCalc;

    // 6. Save to DB with nested allowances and deductions in a transaction
    return await prisma.$transaction(async (tx) => {
        const salaryRecord = await tx.salary.create({
            data: {
                month,
                year,
                workingDays,
                basicSalary: employee.basicSalary,
                salaryType: employee.salaryType,
                allowanceTotal,
                deductionTotal: extraDeductionTotal + loanDeductionTotal,
                grossSalary: grossSalaryCalc,
                totalDeduction: totalDeductionCalc,
                loanDeduction: loanDeductionTotal,
                basicPay,
                employeeEPF,
                employerEPF,
                etfAmount,
                employeeTaxAmount,
                employeeEPFRate: new Decimal(employeeEPFRate),
                employerEPFRate: new Decimal(employerEPFRate),
                etfRate: new Decimal(etfRateValue),
                taxConfigId: payrollConfig.id,
                netSalary,
                otHours,
                otAmount: calculatedOtAmount,
                salaryAdvance,
                employeeId,
                companyId,
                allowances: {
                    create: allowances.map(a => ({ type: a.type, amount: a.amount }))
                },
                deductions: {
                    create: [
                        ...deductions.map(d => ({ type: d.type, amount: d.amount })),
                        ...(isLoanEnabled ? pendingInstallments.map(inst => ({
                            type: `Loan Installment #${inst.installmentNumber}`,
                            amount: inst.amount - inst.paidAmount
                        })) : [])
                    ]
                }
            }
        });

        // Update Loan Installments status
        if (pendingInstallments.length > 0) {
            for (const inst of pendingInstallments) {
                await tx.loanInstallment.update({
                    where: { id: inst.id },
                    data: {
                        status: isLoanEnabled ? 'PAID' : 'SKIPPED',
                        paidAmount: isLoanEnabled ? inst.amount : inst.paidAmount,
                        salaryId: salaryRecord.id, // Link to salary even if skipped for tracking
                        updatedAt: new Date()
                    }
                });
            }
        }

        return salaryRecord;
    });
};

const getSalaryHistory = async (companyId: string, employeeId?: string) => {
    return await prisma.salary.findMany({
        where: {
            companyId,
            ...(employeeId && { employeeId })
        },
        include: {
            employee: {
                select: { fullName: true, employeeId: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const getPayslip = async (companyId: string, salaryId: string) => {
    const salary = await prisma.salary.findFirst({
        where: { id: salaryId, companyId },
        include: {
            employee: true,
            company: true
        }
    });

    if (!salary) {
        throw new Error('Salary record not found');
    }

    return salary;
};

export { calculateAndSaveSalary, getSalaryHistory, getPayslip };

