const prisma = require('../config/db');

const getSummary = async (userId) => {
    // Get Active Subscription
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { plan: true },
    });

    if (!subscription) {
        throw new Error('No active subscription found');
    }

    // Get Companies owned by user
    const companies = await prisma.company.findMany({
        where: { ownerId: userId },
        select: { id: true },
    });
    const companyIds = companies.map(c => c.id);

    // Stats
    const totalEmployees = await prisma.employee.count({
        where: { companyId: { in: companyIds } },
    });

    // Calculate Salary Stats (This Month)
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const salaries = await prisma.salary.findMany({
        where: {
            companyId: { in: companyIds },
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
    const totalCompanyETF = salaries.reduce((sum, s) => sum + s.etfAmount, 0); // User asked for ETF, usually Employer ETF

    return {
        totalEmployees,
        totalSalaryPaidThisMonth,
        totalEmployeeEPF,
        totalCompanyETF,
        planName: subscription.plan.name,
        maxEmployees: subscription.plan.maxEmployees,
        remainingSlots: subscription.plan.maxEmployees - totalEmployees,
    };
};

module.exports = {
    getSummary,
};
