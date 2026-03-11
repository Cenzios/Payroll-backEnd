import prisma from '../config/db';

interface RecurringEntry {
    type: string;
    amount: number;
}

interface EmployeeData {
    fullName: string;
    address: string;
    employeeId: string;
    contactNumber: string;
    email?: string;
    joinedDate: Date;
    designation: string;
    department: string;
    // Salary
    basicSalary: number;
    salaryType?: 'DAILY' | 'MONTHLY';
    otRate?: number;
    // EPF
    epfEnabled?: boolean;
    epfNumber?: string;
    epfEtfAmount?: number;
    // Allowance / Deduction toggles
    allowanceEnabled?: boolean;
    deductionEnabled?: boolean;
    employeeNIC?: string;
    // Recurring arrays (not stored directly on employee)
    recurringAllowances?: RecurringEntry[];
    recurringDeductions?: RecurringEntry[];
    status?: string;
    // Deprecated — filtered out
    dailyRate?: number;
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
            addons: true
        },
    });

    if (!subscription) {
        throw new Error('No active subscription found. Please upgrade your plan.');
    }

    // 3. Count existing employees in this company
    const employeeCount = await prisma.employee.count({
        where: { companyId, deletedAt: null },
    });

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
            deletedAt: null
        }
    });

    if (existing) {
        throw new Error('Employee with this Employee ID already exists');
    }

    // 6. Strip non-DB fields before creating employee
    const {
        transportAllowance,
        mealAllowance,
        otherAllowance,
        dailyRate,           // deprecated — ignored
        recurringAllowances,
        recurringDeductions,
        ...employeeFields
    } = data;

    console.log('🔥 CREATE EMPLOYEE PAYLOAD:', employeeFields);

    // 7. Create employee
    const employee = await prisma.employee.create({
        data: {
            ...employeeFields,
            companyId,
        },
    });

    // 8. Save recurring allowances if enabled and provided
    if (data.allowanceEnabled && recurringAllowances && recurringAllowances.length > 0) {
        const validAllowances = recurringAllowances.filter(a => a.type?.trim() && a.amount > 0);
        if (validAllowances.length > 0) {
            await prisma.recurringAllowance.createMany({
                data: validAllowances.map(a => ({
                    employeeId: employee.id,
                    type: a.type.trim(),
                    amount: a.amount,
                })),
            });
        }
    }

    // 9. Save recurring deductions if enabled and provided
    if (data.deductionEnabled && recurringDeductions && recurringDeductions.length > 0) {
        const validDeductions = recurringDeductions.filter(d => d.type?.trim() && d.amount > 0);
        if (validDeductions.length > 0) {
            await prisma.recurringDeduction.createMany({
                data: validDeductions.map(d => ({
                    employeeId: employee.id,
                    type: d.type.trim(),
                    amount: d.amount,
                })),
            });
        }
    }

    return employee;
};

const getEmployees = async (userId: string, companyId: string, page: number = 1, limit: number = 10, search: string = '', status?: string) => {
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    const skip = (page - 1) * limit;

    const where: any = {
        companyId,
        deletedAt: null,
        OR: [
            { fullName: { contains: search } },
            { employeeId: { contains: search } },
        ]
    };

    if (status) {
        where.status = status;
    }

    const [employees, total] = await Promise.all([
        prisma.employee.findMany({
            where,
            skip,
            take: parseInt(limit.toString()),
            orderBy: { createdAt: 'desc' },
            include: {
                recurringAllowances: true,
                recurringDeductions: true,
            }
        }),
        prisma.employee.count({ where }),
    ]);

    return { employees, total, page, totalPages: Math.ceil(total / limit) };
};

const getEmployeeById = async (userId: string, companyId: string, id: string) => {
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    return await prisma.employee.findFirst({
        where: { id, companyId },
        include: {
            recurringAllowances: true,
            recurringDeductions: true,
        }
    });
};

const updateEmployee = async (userId: string, companyId: string, id: string, data: Partial<EmployeeData>) => {
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
        transportAllowance,
        mealAllowance,
        otherAllowance,
        dailyRate,
        recurringAllowances,
        recurringDeductions,
        ...validData
    } = data;

    return await prisma.employee.update({
        where: { id },
        data: validData,
    });
};

const deleteEmployee = async (userId: string, companyId: string, id: string) => {
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

    return await prisma.employee.update({
        where: { id },
        data: {
            deletedAt: new Date(),
        },
    });
};

export { createEmployee, getEmployees, getEmployeeById, updateEmployee, deleteEmployee };
