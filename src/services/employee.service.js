const prisma = require('../config/db');

const createEmployee = async (userId, companyId, data) => {
    // 1. Verify Company Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    // 2. Get User's Active Subscription & Plan & Addons
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
        include: {
            plan: true,
            addons: true // Include addons
        },
    });

    if (!subscription) {
        throw new Error('No active subscription found. Please upgrade your plan.');
    }

    // 3. Count existing employees in this company
    // NOTE: The limit is usually per company or per subscription? 
    // The prompt says "Final employee limit must be calculated as: FINAL_LIMIT = Plan.maxEmployees + SUM(SubscriptionAddon.value)".
    // And "Modify employee creation logic so that: It checks against FINAL_LIMIT".
    // Usually SaaS limits are per subscription (User), not just per company if multiple companies allowed.
    // However, the current logic checks `prisma.employee.count({ where: { companyId } })`.
    // If a user has multiple companies, does the limit apply to each or total?
    // Plan.maxEmployees usually implies total employees across all companies or per company?
    // The Plan model has `maxCompanies`.
    // If I have 2 companies, can I have maxEmployees in EACH?
    // The current code counts per company: `where: { companyId }`.
    // I will stick to the current logic (per company check) but using the global subscription limit.
    // Wait, if the limit is per subscription, I should count ALL employees of the user?
    // `prisma.employee.count({ where: { company: { ownerId: userId } } })`?
    // The current code was: `where: { companyId }`. This implies the limit is PER COMPANY.
    // I will keep it PER COMPANY as per existing logic, but update the LIMIT calculation.

    const employeeCount = await prisma.employee.count({
        where: { companyId },
    });

    // Calculate FINAL_LIMIT
    const addonCapacity = subscription.addons
        .filter(addon => addon.type === 'EMPLOYEE_EXTRA')
        .reduce((sum, addon) => sum + addon.value, 0);

    const finalLimit = subscription.plan.maxEmployees + addonCapacity;

    // 4. Check Limit
    if (employeeCount >= finalLimit) {
        throw new Error(`Employee limit reached (${finalLimit}). Upgrade your plan or buy add-ons to add more employees.`);
    }

    // 5. Check for duplicate NIC or EmployeeID within company
    const existing = await prisma.employee.findFirst({
        where: {
            companyId,
            OR: [
                { nic: data.nic },
                { employeeId: data.employeeId }
            ]
        }
    });

    if (existing) {
        throw new Error('Employee with this NIC or Employee ID already exists');
    }

    // Remove deprecated fields
    const {
        otRate,
        transportAllowance,
        mealAllowance,
        otherAllowance,
        ...validData
    } = data;

    return await prisma.employee.create({
        data: {
            ...validData,
            companyId,
        },
    });
};

const getEmployees = async (userId, companyId, page = 1, limit = 10, search = '') => {
    // Verify Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    const skip = (page - 1) * limit;

    const where = {
        companyId,
        OR: [
            { fullName: { contains: search } },
            { employeeId: { contains: search } },
            { nic: { contains: search } },
        ]
    };

    const [employees, total] = await Promise.all([
        prisma.employee.findMany({
            where,
            skip,
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
        }),
        prisma.employee.count({ where }),
    ]);

    return { employees, total, page, totalPages: Math.ceil(total / limit) };
};

const getEmployeeById = async (userId, companyId, id) => {
    // Verify Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    return await prisma.employee.findFirst({
        where: { id, companyId },
    });
};

const updateEmployee = async (userId, companyId, id, data) => {
    // Verify Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    // Ensure employee belongs to company
    const employee = await prisma.employee.findFirst({
        where: { id, companyId },
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    const {
        otRate,
        transportAllowance,
        mealAllowance,
        otherAllowance,
        ...validData
    } = data;

    return await prisma.employee.update({
        where: { id },
        data: validData,
    });
};

const deleteEmployee = async (userId, companyId, id) => {
    // Verify Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    const employee = await prisma.employee.findFirst({
        where: { id, companyId },
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    return await prisma.employee.delete({
        where: { id },
    });
};

module.exports = {
    createEmployee,
    getEmployees,
    getEmployeeById,
    updateEmployee,
    deleteEmployee,
};
