import prisma from '../config/db';

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
 * Returns payroll data for a date range, grouped by month
 */
const getCompanyPayrollSummary = async (
    userId: string,
    companyId: string,
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number
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

    // 2. Generate list of all months in the date range
    const monthsInRange: { month: number; year: number }[] = [];
    let currentMonth = startMonth;
    let currentYear = startYear;

    while (
        currentYear < endYear ||
        (currentYear === endYear && currentMonth <= endMonth)
    ) {
        monthsInRange.push({ month: currentMonth, year: currentYear });

        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
    }

    // 3. Fetch salary data for all months in range
    const monthlyData: any[] = [];
    let overallTotalEmployees = 0;
    let overallTotalGrossPay = 0;
    let overallTotalNetPay = 0;
    let overallTotalEmployeeEPF = 0;
    let overallTotalCompanyEPFETF = 0;
    let overallTotalBasicPay = 0;
    let overallTotalOtAmount = 0;
    let overallTotalTax = 0;
    let overallTotalSalaryAdvance = 0;
    let overallTotalDeductions = 0;

    for (const { month, year } of monthsInRange) {
        // Get all employees with their salary records for this specific month
        const employees = await prisma.employee.findMany({
            where: {
                companyId,
                status: 'ACTIVE' // Only active employees
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

        // Calculate employee-level data and totals for this month
        let monthTotalEmployees = 0;
        let monthTotalGrossPay = 0;
        let monthTotalNetPay = 0;
        let monthTotalEmployeeEPF = 0;
        let monthTotalCompanyEPFETF = 0;
        let monthTotalBasicPay = 0;
        let monthTotalOtAmount = 0;
        let monthTotalTax = 0;
        let monthTotalSalaryAdvance = 0;
        let monthTotalDeductions = 0;

        const employeeData = employees.map((employee) => {
            const salary = employee.salaries[0];

            if (!salary) {
                return null;
            }

            monthTotalEmployees++;

            const workingDays = salary.workingDays;
            const basicPay = Math.round((salary as any).basicPay);
            const otAmount = Math.round((salary as any).otAmount);
            const grossPay = basicPay + otAmount;
            const netPay = Math.round((salary as any).netSalary);
            const employeeEPF = Math.round((salary as any).employeeEPF);
            const tax = Math.round((salary as any).employeeTaxAmount);
            const salaryAdvance = Math.round((salary as any).salaryAdvance);
            const employerEPF = Math.round((salary as any).employerEPF);
            const etf = Math.round((salary as any).etfAmount);
            const companyEPFETF = employerEPF + etf;

            const deductions = employeeEPF + tax + salaryAdvance;

            monthTotalGrossPay += grossPay;
            monthTotalNetPay += netPay;
            monthTotalEmployeeEPF += employeeEPF;
            monthTotalCompanyEPFETF += companyEPFETF;
            monthTotalBasicPay += basicPay;
            monthTotalOtAmount += otAmount;
            monthTotalTax += tax;
            monthTotalSalaryAdvance += salaryAdvance;
            monthTotalDeductions += deductions;

            return {
                employeeId: employee.id,
                employeeCode: employee.employeeId,
                employeeName: employee.fullName,
                workingDays,
                basicPay,
                otHours: (salary as any).otHours,
                otAmount,
                grossPay,
                netPay,
                tax,
                employeeEPF,
                salaryAdvance,
                companyEPFETF,
            };
        }).filter(Boolean);

        // Determine status: Completed if has employees, Pending if no data
        const status = (employeeData as any[]).length > 0 ? 'Completed' : 'Pending';

        monthlyData.push({
            year,
            month: getMonthName(month),
            monthNumber: month,
            status,
            employees: employeeData,
            totals: {
                totalEmployees: monthTotalEmployees,
                totalGrossPay: monthTotalGrossPay,
                totalNetPay: monthTotalNetPay,
                totalEmployeeEPF: monthTotalEmployeeEPF,
                totalCompanyEPFETF: monthTotalCompanyEPFETF,
                totalBasicPay: monthTotalBasicPay,
                totalOtAmount: monthTotalOtAmount,
                totalTax: monthTotalTax,
                totalSalaryAdvance: monthTotalSalaryAdvance,
                totalDeductions: monthTotalDeductions,
            },
        });

        // Aggregate to overall totals
        overallTotalEmployees += monthTotalEmployees;
        overallTotalGrossPay += monthTotalGrossPay;
        overallTotalNetPay += monthTotalNetPay;
        overallTotalEmployeeEPF += monthTotalEmployeeEPF;
        overallTotalCompanyEPFETF += monthTotalCompanyEPFETF;
        overallTotalBasicPay += monthTotalBasicPay;
        overallTotalOtAmount += monthTotalOtAmount;
        overallTotalTax += monthTotalTax;
        overallTotalSalaryAdvance += monthTotalSalaryAdvance;
        overallTotalDeductions += monthTotalDeductions;
    }

    return {
        companyName: company.name,
        dateRange: {
            startMonth,
            startYear,
            endMonth,
            endYear,
        },
        monthlyData,
        overallTotals: {
            totalMonths: monthsInRange.length,
            totalEmployees: overallTotalEmployees,
            totalBasicPay: overallTotalBasicPay,
            totalOtAmount: overallTotalOtAmount,
            totalGrossPay: overallTotalGrossPay,
            totalTax: overallTotalTax,
            totalSalaryAdvance: overallTotalSalaryAdvance,
            totalDeductions: overallTotalDeductions,
            totalNetPay: overallTotalNetPay,
            totalEmployeeEPF: overallTotalEmployeeEPF,
            totalCompanyEPFETF: overallTotalCompanyEPFETF,
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
    let totalBasicPay = 0;
    let totalOtAmount = 0;
    let totalSalaryAdvance = 0;

    const employeeData = employees.map((employee) => {
        const salary = employee.salaries[0]; // Should only be one record per month

        if (!salary) {
            // Employee has no salary record for this month - still include them
            return {
                employeeId: employee.id,
                employeeCode: employee.employeeId,
                employeeName: employee.fullName,
                workedDays: 0,
                grossPay: 0,
                netPay: 0,
                deductions: 0,
                employeeEPF: 0,
                companyEPFETF: 0,
            };
        }

        // Calculate values and round EACH value BEFORE summing to avoid precision errors
        const workedDays = (salary as any).workingDays;
        const basicPay = Math.round((salary as any).basicPay);
        const otAmount = Math.round((salary as any).otAmount);
        const grossPay = basicPay + otAmount;
        const netPay = Math.round((salary as any).netSalary);
        const employeeEPF = Math.round((salary as any).employeeEPF);
        const tax = Math.round((salary as any).employeeTaxAmount);
        const salaryAdvance = Math.round((salary as any).salaryAdvance);
        const employerEPF = Math.round((salary as any).employerEPF);
        const etf = Math.round((salary as any).etfAmount);
        const companyEPFETF = employerEPF + etf;
        const deductions = employeeEPF + tax + salaryAdvance;

        // Aggregate totals - values are already rounded
        totalGrossPay += grossPay;
        totalNetPay += netPay;
        totalEmployeeEPF += employeeEPF;
        totalCompanyEPFETF += companyEPFETF;
        totalDeductions += deductions;
        totalBasicPay += basicPay;
        totalOtAmount += otAmount;
        totalSalaryAdvance += salaryAdvance;

        return {
            employeeId: employee.id,
            employeeCode: employee.employeeId,
            employeeName: employee.fullName,
            workedDays,
            basicPay,
            otHours: (salary as any).otHours,
            otAmount,
            grossPay,
            netPay,
            tax,
            salaryAdvance,
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
            basicPay: totalBasicPay,
            otAmount: totalOtAmount,
            grossPay: totalGrossPay,
            salaryAdvance: totalSalaryAdvance,
            deductions: totalDeductions,
            netPay: totalNetPay,
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
    year: number,
    month?: number
) => {
    // 1. Get employee with company info
    const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
            company: true,
            salaries: {
                where: {
                    year,
                    ...(month ? { month } : {}),
                },
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
    let annualBasicPay = 0;
    let annualOtAmount = 0;
    let annualSalaryAdvance = 0;
    let annualTax = 0;

    const monthlyBreakdown = employee.salaries.map((salary: any) => {
        const basicPay = (salary as any).basicPay;
        const otAmount = (salary as any).otAmount;
        const grossPay = basicPay + otAmount;
        const tax = (salary as any).employeeTaxAmount;
        const deductions = (salary as any).employeeEPF + tax + (salary as any).salaryAdvance;
        const netPay = (salary as any).netSalary;
        const companyEPFETF = (salary as any).employerEPF + (salary as any).etfAmount;

        // Aggregate annual totals
        annualWorkedDays += salary.workingDays;
        annualGrossPay += grossPay;
        annualNetPay += netPay;
        annualDeductions += deductions;
        annualEmployeeEPF += salary.employeeEPF;
        annualCompanyEPFETF += companyEPFETF;
        annualBasicPay += basicPay;
        annualOtAmount += otAmount;
        annualSalaryAdvance += salary.salaryAdvance;
        annualTax += tax;

        return {
            month: getMonthName(salary.month),
            workedDays: salary.workingDays,
            basicPay: Math.round(basicPay),
            otHours: salary.otHours,
            otAmount: Math.round(otAmount),
            grossPay: Math.round(grossPay),
            netPay: Math.round(netPay),
            tax: Math.round(tax),
            salaryAdvance: Math.round(salary.salaryAdvance),
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
            basicPay: Math.round(annualBasicPay),
            otAmount: Math.round(annualOtAmount),
            grossPay: Math.round(annualGrossPay),
            netPay: Math.round(annualNetPay),
            tax: Math.round(annualTax),
            salaryAdvance: Math.round(annualSalaryAdvance),
            deductions: Math.round(annualDeductions),
            employeeEPF: Math.round(annualEmployeeEPF),
            companyEPFETF: Math.round(annualCompanyEPFETF),
        },
    };
};

export { getCompanyPayrollSummary, getSelectedEmployeesSummary, getEmployeePayrollSummary };
