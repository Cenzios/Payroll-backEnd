const prisma = require('../config/db');

const createEmployee = async (userId, companyId, data) => {
    // 1. Verify Company Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    // 2. Get User's Active Subscription & Plan
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
        include: { plan: true },
    });

    if (!subscription) {
        throw new Error('No active subscription found. Please upgrade your plan.');
    }

    // 3. Count existing employees in this company
    const employeeCount = await prisma.employee.count({
        where: { companyId },
    });

    // 4. Check Limit
    if (employeeCount >= subscription.plan.maxEmployees) {
        throw new Error(`Employee limit reached (${subscription.plan.maxEmployees}). Upgrade your plan to add more employees.`);
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

    return await prisma.employee.create({
        data: {
            ...data,
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

    return await prisma.employee.update({
        where: { id },
        data,
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
