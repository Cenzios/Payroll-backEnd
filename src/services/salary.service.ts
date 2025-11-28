import prisma from '../config/db';
import { EMPLOYEE_EPF_PERCENTAGE, EMPLOYER_EPF_PERCENTAGE, ETF_PERCENTAGE } from '../constants/payroll.constants';

interface SalaryData {
    employeeId: string;
    month: number;
    year: number;
    workingDays: number;
    bonus?: number;
}

const calculateAndSaveSalary = async (companyId: string, data: SalaryData) => {
    const { employeeId, month, year, workingDays, bonus = 0 } = data;

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

    // 2. Perform Calculations
    const basicPay = employee.dailyRate * workingDays;
    const grossSalary = basicPay + bonus;

    let employeeEPF = 0;
    let employerEPF = 0;
    let etfAmount = 0;

    if (employee.epfEnabled) {
        employeeEPF = (basicPay * EMPLOYEE_EPF_PERCENTAGE) / 100;
        employerEPF = (basicPay * EMPLOYER_EPF_PERCENTAGE) / 100;
        etfAmount = (basicPay * ETF_PERCENTAGE) / 100;
    }

    // Net Salary calculation includes bonus
    const netSalary = (basicPay - employeeEPF) + bonus;

    // 3. Save to DB
    const salaryRecord = await prisma.salary.create({
        data: {
            month,
            year,
            workingDays,
            bonus,
            basicPay,
            grossSalary,
            employeeEPF,
            employerEPF,
            etfAmount,
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
