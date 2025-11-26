const prisma = require('../config/db');

const createEmployee = async (companyId, data) => {
    // Check for duplicate NIC or EmployeeID within company
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

const getEmployees = async (companyId, page = 1, limit = 10, search = '') => {
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

const getEmployeeById = async (companyId, id) => {
    return await prisma.employee.findFirst({
        where: { id, companyId },
    });
};

const updateEmployee = async (companyId, id, data) => {
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

const deleteEmployee = async (companyId, id) => {
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
