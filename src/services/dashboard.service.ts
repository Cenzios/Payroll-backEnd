import prisma from '../config/db';

const getSummary = async (userId: string, companyId?: string) => {
    // Get Active Subscription
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { plan: true, addons: true },
    });

    if (!subscription) {
        throw new Error('No active subscription found');
    }

    // Get Companies owned by user (Verify ownership if companyId is provided)
    const companies = await prisma.company.findMany({
        where: { ownerId: userId },
        select: { id: true },
    });
    const companyIds = companies.map(c => c.id);

    // Filter Logic
    let employeeFilter: any = { companyId: { in: companyIds } };
    let salaryFilter: any = { companyId: { in: companyIds } };

    if (companyId) {
        if (!companyIds.includes(companyId)) {
            // If requested companyId is not owned by user, return empty/error or just fallback
            // For now, throw error for security
            throw new Error('Company not found or access denied');
        }
        employeeFilter = { companyId };
        salaryFilter = { companyId };
    }

    // Stats
    const totalEmployees = await prisma.employee.count({
        where: employeeFilter,
    });

    // Calculate addon capacity
    const addonCapacity = subscription.addons
        .filter(addon => addon.type === 'EMPLOYEE_EXTRA')
        .reduce((sum, addon) => sum + addon.value, 0);

    const maxEmployees = subscription.plan.maxEmployees + addonCapacity;

    // Calculate Salary Stats (This Month)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const salaries = await prisma.salary.findMany({
        where: {
            ...salaryFilter,
            month: currentMonth,
            year: currentYear,
        },
        select: {
            netSalary: true,
            employeeEPF: true,
            employerEPF: true,
            etfAmount: true,
        },
    });

    const totalSalaryPaidThisMonth = salaries.reduce((sum, s) => sum + s.netSalary, 0);
    const totalEmployeeEPF = salaries.reduce((sum, s) => sum + s.employeeEPF, 0);
    const totalCompanyEPF = salaries.reduce((sum, s) => sum + s.employerEPF, 0);
    const totalCompanyETF = salaries.reduce((sum, s) => sum + s.etfAmount, 0);

    return {
        totalEmployees,
        totalSalaryPaidThisMonth,
        totalEmployeeEPF,
        totalCompanyEPF,
        totalCompanyETF,
        planName: subscription.plan.name,
        maxEmployees,
        remainingSlots: maxEmployees - totalEmployees,
    };
};

const getSalaryTrend = async (userId: string, companyId?: string, range: string = 'yearly') => {
    // Get Companies owned by user
    const companies = await prisma.company.findMany({
        where: { ownerId: userId },
        select: { id: true },
    });
    const companyIds = companies.map(c => c.id);

    let salaryFilter: any = { companyId: { in: companyIds } };

    if (companyId) {
        if (!companyIds.includes(companyId)) {
            throw new Error('Company not found or access denied');
        }
        salaryFilter = { companyId };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    let monthsToFetch = 12; // default yearly
    if (range === 'monthly') monthsToFetch = 1;
    else if (range === '3months') monthsToFetch = 3;
    else if (range === '6months') monthsToFetch = 6;

    // We want to fetch the last N months of data
    // For yearly, we fetch the whole current year's data or last 12 months? 
    // The design shows Jan to Dec, so let's fetch for the current year.

    // If range is 'yearly', we fetch all 12 months of the current year.
    // If range is shorter, we can fetch the last N months.

    const results: { name: string; total: number }[] = [];

    if (range === 'yearly') {
        // Fetch all months of the current year
        const salaries = await prisma.salary.findMany({
            where: {
                ...salaryFilter,
                year: currentYear
            },
            select: {
                month: true,
                netSalary: true
            }
        });

        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let m = 1; m <= 12; m++) {
            const monthlySalaries = salaries.filter(s => s.month === m);
            const total = monthlySalaries.reduce((sum, s) => sum + s.netSalary, 0);
            results.push({
                name: monthNames[m - 1],
                total: total
            });
        }
    } else {
        // Fetch last N months
        for (let i = monthsToFetch - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = date.getMonth() + 1;
            const y = date.getFullYear();

            const salaries = await prisma.salary.findMany({
                where: {
                    ...salaryFilter,
                    month: m,
                    year: y
                },
                select: {
                    netSalary: true
                }
            });

            const total = salaries.reduce((sum, s) => sum + s.netSalary, 0);
            results.push({
                name: date.toLocaleString('default', { month: 'short' }),
                total: total
            });
        }
    }

    return results;
};

export { getSummary, getSalaryTrend };
