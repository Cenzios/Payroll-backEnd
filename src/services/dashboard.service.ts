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
    const totalCompanyETF = salaries.reduce((sum, s) => sum + s.etfAmount, 0);

    return {
        totalEmployees,
        totalSalaryPaidThisMonth,
        totalEmployeeEPF,
        totalCompanyETF,
        planName: subscription.plan.name,
        maxEmployees,
        remainingSlots: maxEmployees - totalEmployees,
    };
};

export { getSummary };
