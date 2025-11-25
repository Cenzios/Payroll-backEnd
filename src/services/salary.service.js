const prisma = require('../config/db');

const calculateAndSaveSalary = async (companyId, data) => {
    const { employeeId, month, year, workingDays, otHours, bonus = 0 } = data;

    // 1. Fetch Employee & Company Settings
    const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId },
        include: { company: true } // To get EPF percentages
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
    const otAmount = employee.otRate * otHours;
    const totalAllowances = employee.transportAllowance + employee.mealAllowance + employee.otherAllowance + bonus;

    const grossSalary = basicPay + otAmount + totalAllowances;

    let employeeEPF = 0;
    let employerEPF = 0;
    let etfAmount = 0;

    if (employee.epfEnabled) {
        // EPF usually calculated on Basic Pay (or Basic + Fixed Allowances depending on local laws, assuming Basic here for simplicity based on prompt)
        // Adjust base if needed (e.g. Basic + Budgetary Relief)
        const epfBase = basicPay;

        employeeEPF = (epfBase * employee.company.employeeEPFPercentage) / 100;
        employerEPF = (epfBase * employee.company.employerEPFPercentage) / 100;
        etfAmount = (epfBase * employee.company.etfPercentage) / 100;
    }

    const netSalary = grossSalary - employeeEPF;

    // 3. Save to DB
    const salaryRecord = await prisma.salary.create({
        data: {
            month,
            year,
            workingDays,
            otHours,
            bonus,
            basicPay,
            otAmount,
            totalAllowances,
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

const getSalaryHistory = async (companyId, employeeId) => {
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

const getPayslip = async (companyId, salaryId) => {
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

module.exports = {
    calculateAndSaveSalary,
    getSalaryHistory,
    getPayslip,
};
