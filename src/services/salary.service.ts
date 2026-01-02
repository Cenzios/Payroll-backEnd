import prisma from '../config/db';
import { getActivePayrollRates } from './payroll-config.service';
import { calculateMonthlyPAYE } from './tax-calculation.service';
import { Decimal } from '@prisma/client/runtime/library';

interface SalaryData {
    employeeId: string;
    month: number;
    year: number;
    workingDays: number;
}

const calculateAndSaveSalary = async (companyId: string, data: SalaryData) => {
    const { employeeId, month, year, workingDays } = data;

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
    const basicPay = employee.dailyRate * workingDays;

    // Convert Decimal to number for calculations
    const employeeEPFRate = Number(payrollConfig.employeeEPFRate);
    const employerEPFRate = Number(payrollConfig.employerEPFRate);
    const etfRateValue = Number(payrollConfig.etfRate);

    let employeeEPF = 0;
    let employerEPF = 0;
    let etfAmount = 0;

    if (employee.epfEnabled) {
        employeeEPF = (basicPay * employeeEPFRate) / 100;
        employerEPF = (basicPay * employerEPFRate) / 100;
        etfAmount = (basicPay * etfRateValue) / 100;
    }

    // 4. Calculate Monthly PAYE Tax
    const employeeTaxAmount = calculateMonthlyPAYE(basicPay, {
        taxFreeMonthlyLimit: Number(payrollConfig.taxFreeMonthlyLimit),
        slab1Limit: Number(payrollConfig.slab1Limit),
        slab1Rate: Number(payrollConfig.slab1Rate),
        slab2Limit: Number(payrollConfig.slab2Limit),
        slab2Rate: Number(payrollConfig.slab2Rate),
        slab3Limit: Number(payrollConfig.slab3Limit),
        slab3Rate: Number(payrollConfig.slab3Rate),
        slab4Limit: Number(payrollConfig.slab4Limit),
        slab4Rate: Number(payrollConfig.slab4Rate),
        slab5Rate: Number(payrollConfig.slab5Rate),
    });

    // 5. Calculate Net Salary
    // Net Salary = Basic Pay - Employee EPF - PAYE Tax
    const netSalary = basicPay - employeeEPF - employeeTaxAmount;

    // 6. Save to DB with rate snapshots
    const salaryRecord = await prisma.salary.create({
        data: {
            month,
            year,
            workingDays,
            basicPay,
            employeeEPF,
            employerEPF,
            etfAmount,
            employeeTaxAmount,
            // Snapshot rates used for this calculation (legal compliance)
            employeeEPFRate: new Decimal(employeeEPFRate),
            employerEPFRate: new Decimal(employerEPFRate),
            etfRate: new Decimal(etfRateValue),
            taxConfigId: payrollConfig.id,
            netSalary,
            employeeId,
            companyId
        }
    });

    return salaryRecord;
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

