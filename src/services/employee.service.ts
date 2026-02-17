import prisma from '../config/db';

interface EmployeeData {
    fullName: string;
    address: string;
    employeeId: string;
    contactNumber: string;
    joinedDate: Date;
    designation: string;
    department: string;
    dailyRate: number;
    epfEnabled?: boolean;
    status?: string;
    // Deprecated fields that should be filtered out
    otRate?: number;
    transportAllowance?: number;
    mealAllowance?: number;
    otherAllowance?: number;
}

const createEmployee = async (userId: string, companyId: string, data: EmployeeData) => {
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
    const employeeCount = await prisma.employee.count({
        where: { companyId, deletedAt: null },
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

    // 5. Check for duplicate EmployeeID within company (Only Active Employees)
    const existing = await prisma.employee.findFirst({
        where: {
            companyId,
            employeeId: data.employeeId,
            deletedAt: null // Only check active employees
        }
    });

    if (existing) {
        throw new Error('Employee with this Employee ID already exists');
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

const getEmployees = async (userId: string, companyId: string, page: number = 1, limit: number = 10, search: string = '', status?: string) => {
    // Verify Ownership
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    const skip = (page - 1) * limit;

    const where: any = {
        companyId,
        deletedAt: null, // ✅ Filter out soft-deleted employees
        OR: [
            { fullName: { contains: search } },
            { employeeId: { contains: search } },
        ]
    };

    // ✅ Add Status Filter if provided
    if (status) {
        where.status = status;
    }

    const [employees, total] = await Promise.all([
        prisma.employee.findMany({
            where,
            skip,
            take: parseInt(limit.toString()),
            orderBy: { createdAt: 'desc' },
        }),
        prisma.employee.count({ where }),
    ]);

    return { employees, total, page, totalPages: Math.ceil(total / limit) };
};

const getEmployeeById = async (userId: string, companyId: string, id: string) => {
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

const updateEmployee = async (userId: string, companyId: string, id: string, data: Partial<EmployeeData>) => {
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

    if (data.employeeId) {
        const existing = await prisma.employee.findFirst({
            where: {
                companyId,
                employeeId: data.employeeId,
                deletedAt: null,
                NOT: { id }
            }
        });
        if (existing) {
            throw new Error('Employee with this Employee ID already exists');
        }
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

const deleteEmployee = async (userId: string, companyId: string, id: string) => {
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

    // Soft Delete (Update deletedAt timestamp)
    return await prisma.employee.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
    });
};

export { createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee };
