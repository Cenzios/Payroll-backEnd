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

    const employeeData = employees.map((employee) => {
        const salary = employee.salaries[0]; // Should only be one record per month

        if (!salary) {
            // Employee has no salary record for this month
            return null;
        }

        totalEmployees++;

        // Calculate values
        const workingDays = salary.workingDays;
        const basicPay = salary.basicPay;
        const netPay = salary.netSalary;
        const employeeEPF = salary.employeeEPF;
        const companyEPFETF = salary.employerEPF + salary.etfAmount;

        // Aggregate totals
        totalGrossPay += basicPay;
        totalNetPay += netPay;
        totalEmployeeEPF += employeeEPF;
        totalCompanyEPFETF += companyEPFETF;

        return {
            employeeCode: employee.employeeId,
            employeeName: employee.fullName,
            workingDays,
            netPay: Math.round(netPay),
            employeeEPF: Math.round(employeeEPF),
            companyEPFETF: Math.round(companyEPFETF),
        };
    }).filter(Boolean); // Remove null entries

    return {
        companyName: company.name,
        month: getMonthName(month),
        year,
        employees: employeeData,
        totals: {
            totalEmployees,
            totalGrossPay: Math.round(totalGrossPay),
            totalNetPay: Math.round(totalNetPay),
            totalEmployeeEPF: Math.round(totalEmployeeEPF),
            totalCompanyEPFETF: Math.round(totalCompanyEPFETF),
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

    // 2. Verify user owns the company
    if (employee.company.ownerId !== userId) {
        const error = new Error('Not authorized to access this employee data') as any;
        error.statusCode = 403;
        throw error;
    }

    // 3. Build monthly breakdown
    let annualWorkedDays = 0;
    let annualGrossSalary = 0;
    let annualNetSalary = 0;
    let annualEmployeeEPF = 0;
    let annualCompanyEPFETF = 0;

    const monthlyBreakdown = employee.salaries.map((salary) => {
        const companyEPFETF = salary.employerEPF + salary.etfAmount;

        // Aggregate annual totals
        annualWorkedDays += salary.workingDays;
        annualGrossSalary += salary.basicPay;
        annualNetSalary += salary.netSalary;
        annualEmployeeEPF += salary.employeeEPF;
        annualCompanyEPFETF += companyEPFETF;

        return {
            month: getMonthName(salary.month),
            workedDays: salary.workingDays,
            basicSalary: Math.round(salary.basicPay),
            employeeEPF: Math.round(salary.employeeEPF),
            companyEPFETF: Math.round(companyEPFETF),
            netPay: Math.round(salary.netSalary),
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
            grossSalary: Math.round(annualGrossSalary),
            netSalary: Math.round(annualNetSalary),
            employeeEPF: Math.round(annualEmployeeEPF),
            companyEPFETF: Math.round(annualCompanyEPFETF),
        },
    };
};

export { getCompanyPayrollSummary, getEmployeePayrollSummary };
