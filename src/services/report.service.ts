import prisma from '../config/db';
import { EMPLOYEE_EPF_PERCENTAGE, EMPLOYER_EPF_PERCENTAGE, ETF_PERCENTAGE } from '../constants/payroll.constants';

// Helper function to get month name
const getMonthName = (month: number): string => {
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
};

/**
 * Get Company Payroll Summary Report
 * Returns all employees with their payroll data for a specific month
 */
const getCompanyPayrollSummary = async (
    userId: string,
    companyId: string,
    month: number,
    year: number
) => {
    // 1. Verify company exists and user is the owner
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        throw new Error('Company not found');
    }

    if (company.ownerId !== userId) {
        const error = new Error('Not authorized to access this company data') as any;
        error.statusCode = 403;
        throw error;
    }

    // 2. Get all employees with their salary records for the specified month
    const employees = await prisma.employee.findMany({
        where: { companyId },
        include: {
            salaries: {
                where: {
                    month,
                    year,
                },
            },
        },
        orderBy: { employeeId: 'asc' },
    });

    // 3. Calculate employee-level data and totals
    let totalEmployees = 0;
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalEmployeeEPF = 0;
    let totalCompanyEPFETF = 0;
    let totalDeductions = 0;

    const employeeData = employees.map((employee) => {
        const salary = employee.salaries[0]; // Should only be one record per month

        if (!salary) {
            // Employee has no salary record for this month
            return null;
        }

        totalEmployees++;

        // Calculate values and round EACH value BEFORE summing to avoid precision errors
        const workingDays = salary.workingDays;
        const grossPay = Math.round(salary.basicPay);
        const netPay = Math.round(salary.netSalary);
        const employeeEPF = Math.round(salary.employeeEPF);
        const employerEPF = Math.round(salary.employerEPF);
        const etf = Math.round(salary.etfAmount);
        const companyEPFETF = employerEPF + etf;
        const deductions = employeeEPF;

        // Aggregate totals - values are already rounded
        totalGrossPay += grossPay;
        totalNetPay += netPay;
        totalEmployeeEPF += employeeEPF;
        totalCompanyEPFETF += companyEPFETF;
        totalDeductions += deductions;

        return {
            employeeId: employee.id,  // Database UUID for fetching employee details
            employeeCode: employee.employeeId,  // Internal company ID like "E005"
            employeeName: employee.fullName,
            workingDays,
            grossPay,
            netPay,
            deductions,
            employeeEPF,
            companyEPFETF,
        };
    }).filter(Boolean); // Remove null entries

    return {
        companyName: company.name,
        month: getMonthName(month),
        year,
        employees: employeeData,
        totals: {
            totalEmployees,
            totalGrossPay,  // Already rounded, no Math.round needed
            totalNetPay,
            totalDeductions,
            totalEmployeeEPF,
            totalCompanyEPFETF,
        },
    };
};

/**
 * Get Selected Employees Payroll Summary Report
 * Returns payroll data for selected employees only
 */
const getSelectedEmployeesSummary = async (
    userId: string,
    companyId: string,
    employeeIds: string[],
    month: number,
    year: number
) => {
    // 1. Verify company exists and user is the owner
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        throw new Error('Company not found');
    }

    if (company.ownerId !== userId) {
        const error = new Error('Not authorized to access this company data') as any;
        error.statusCode = 403;
        throw error;
    }

    // 2. Get selected employees with their salary records for the specified month
    const employees = await prisma.employee.findMany({
        where: {
            companyId,
            id: { in: employeeIds },  // Filter by selected employee IDs
        },
        include: {
            salaries: {
                where: {
                    month,
                    year,
                },
            },
        },
        orderBy: { employeeId: 'asc' },
    });

    // 3. Calculate employee-level data and totals
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalEmployeeEPF = 0;
    let totalCompanyEPFETF = 0;
    let totalDeductions = 0;

    const employeeData = employees.map((employee) => {
        const salary = employee.salaries[0]; // Should only be one record per month

        if (!salary) {
            // Employee has no salary record for this month - still include them
            return {
                employeeId: employee.id,
                employeeCode: employee.employeeId,
                employeeName: employee.fullName,
                workingDays: 0,
                grossPay: 0,
                netPay: 0,
                deductions: 0,
                employeeEPF: 0,
                companyEPFETF: 0,
            };
        }

        // Calculate values and round EACH value BEFORE summing to avoid precision errors
        const workingDays = salary.workingDays;
        const grossPay = Math.round(salary.basicPay);
        const netPay = Math.round(salary.netSalary);
        const employeeEPF = Math.round(salary.employeeEPF);
        const employerEPF = Math.round(salary.employerEPF);
        const etf = Math.round(salary.etfAmount);
        const companyEPFETF = employerEPF + etf;
        const deductions = employeeEPF;

        // Aggregate totals - values are already rounded
        totalGrossPay += grossPay;
        totalNetPay += netPay;
        totalEmployeeEPF += employeeEPF;
        totalCompanyEPFETF += companyEPFETF;
        totalDeductions += deductions;

        return {
            employeeId: employee.id,
            employeeCode: employee.employeeId,
            employeeName: employee.fullName,
            workingDays,
            grossPay,
            netPay,
            deductions,
            employeeEPF,
            companyEPFETF,
        };
    });

    // 4. Build metadata
    const metadata = {
        employeeCount: employeeData.length,
        datePeriod: `${getMonthName(month)} ${year}`,
        department: 'ALL',  // TODO: Add department filtering if needed
        reportType: 'Monthly Payroll Overview',
        totalGrossPay,
    };

    return {
        metadata,
        employees: employeeData,
        totals: {
            grossPay: totalGrossPay,
            netPay: totalNetPay,
            deductions: totalDeductions,
            employeeEPF: totalEmployeeEPF,
            companyEPFETF: totalCompanyEPFETF,
        },
    };
};

/**
 * Get Employee Payroll Summary Report
 * Returns an employee's monthly breakdown for an entire year
 */
const getEmployeePayrollSummary = async (
    userId: string,
    employeeId: string,
    companyId: string,
    year: number
) => {
    // 1. Get employee with company info
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
            company: true,
            salaries: {
                where: { year },
                orderBy: { month: 'asc' },
            },
        },
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    // 2. Verify employee belongs to the specified company
    if (employee.companyId !== companyId) {
        const error = new Error('Employee does not belong to the specified company') as any;
        error.statusCode = 400;
        throw error;
    }

    // 3. Verify user owns the company
    if (employee.company.ownerId !== userId) {
        const error = new Error('Not authorized to access this employee data') as any;
        error.statusCode = 403;
        throw error;
    }

    // 4. Build monthly breakdown
    let annualWorkedDays = 0;
    let annualGrossPay = 0;
    let annualNetPay = 0;
    let annualDeductions = 0;
    let annualEmployeeEPF = 0;
    let annualCompanyEPFETF = 0;

    const monthlyBreakdown = employee.salaries.map((salary) => {
        const grossPay = salary.basicPay;
        const deductions = salary.employeeEPF;
        const netPay = salary.netSalary;
        const companyEPFETF = salary.employerEPF + salary.etfAmount;

        // Aggregate annual totals
        annualWorkedDays += salary.workingDays;
        annualGrossPay += grossPay;
        annualNetPay += netPay;
        annualDeductions += deductions;
        annualEmployeeEPF += salary.employeeEPF;
        annualCompanyEPFETF += companyEPFETF;

        return {
            month: getMonthName(salary.month),
            workedDays: salary.workingDays,
            grossPay: Math.round(grossPay),
            netPay: Math.round(netPay),
            deductions: Math.round(deductions),
            employeeEPF: Math.round(salary.employeeEPF),
            companyEPFETF: Math.round(companyEPFETF),
        };
    });

    return {
        employeeName: employee.fullName,
        employeeCode: employee.employeeId,
        designation: employee.designation,
        dailyRate: employee.dailyRate,
        joinedDate: employee.joinedDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        monthlyBreakdown,
        annualTotals: {
            workedDays: annualWorkedDays,
            grossPay: Math.round(annualGrossPay),
            netPay: Math.round(annualNetPay),
            deductions: Math.round(annualDeductions),
            employeeEPF: Math.round(annualEmployeeEPF),
            companyEPFETF: Math.round(annualCompanyEPFETF),
        },
    };
};

export { getCompanyPayrollSummary, getSelectedEmployeesSummary, getEmployeePayrollSummary };
