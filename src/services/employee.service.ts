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
    // Bank Details
    bankName?: string;
    accountNumber?: string;
    branchName?: string;
    accountHolderName?: string;
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
        bankName,
        accountNumber,
        branchName,
        accountHolderName,
        ...employeeFields
    } = data;

    console.log('🔥 CREATE EMPLOYEE PAYLOAD:', employeeFields);

    // 7. Create employee and related records in a transaction
    return await prisma.$transaction(async (tx) => {
        const employee = await tx.employee.create({
            data: {
                ...employeeFields,
                companyId,
            },
        });

        // 8. Save recurring allowances if enabled and provided
        if (data.allowanceEnabled && recurringAllowances && recurringAllowances.length > 0) {
            const validAllowances = recurringAllowances.filter(a => a.type?.trim() && Number(a.amount) > 0);
            if (validAllowances.length > 0) {
                await tx.recurringAllowance.createMany({
                    data: validAllowances.map(a => ({
                        employeeId: employee.id,
                        type: a.type.trim(),
                        amount: Number(a.amount),
                    })),
                });
            }
        }

        // 9. Save recurring deductions if enabled and provided
        if (data.deductionEnabled && recurringDeductions && recurringDeductions.length > 0) {
            const validDeductions = recurringDeductions.filter(d => d.type?.trim() && Number(d.amount) > 0);
            if (validDeductions.length > 0) {
                await tx.recurringDeduction.createMany({
                    data: validDeductions.map(d => ({
                        employeeId: employee.id,
                        type: d.type.trim(),
                        amount: Number(d.amount),
                    })),
                });
            }
        }

        // 10. Save Bank Details if provided
        if (data.bankName && data.accountNumber) {
            await tx.employeeBank.create({
                data: {
                    employeeId: employee.id,
                    bankName: data.bankName,
                    accountNumber: data.accountNumber,
                    branchName: data.branchName || '',
                    accountHolderName: data.accountHolderName || employee.fullName,
                    updatedAt: new Date()
                }
            });
        }

        return employee;
    });
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

    const [employeesRaw, total] = await Promise.all([
        prisma.employee.findMany({
            where,
            skip,
            take: parseInt(limit.toString()),
            orderBy: { createdAt: 'desc' },
            include: {
                recurringAllowances: true,
                recurringDeductions: true,
                bank: true
            }
        }),
        prisma.employee.count({ where }),
    ]);

    const employees = employeesRaw.map(emp => ({
        ...emp,
        bankName: emp.bank?.bankName,
        accountNumber: emp.bank?.accountNumber,
        branchName: emp.bank?.branchName,
        accountHolderName: emp.bank?.accountHolderName,
        bank: undefined // Clean up if desired
    }));

    return { employees, total, page, totalPages: Math.ceil(total / limit) };
};

const getEmployeeById = async (userId: string, companyId: string, id: string) => {
    const company = await prisma.company.findFirst({
        where: { id: companyId, ownerId: userId },
    });
    if (!company) {
        throw new Error('Company not found or you do not have permission to access it');
    }

    const employee = await prisma.employee.findFirst({
        where: { id, companyId },
        include: {
            recurringAllowances: true,
            recurringDeductions: true,
            bank: true
        }
    });

    if (!employee) return null;

    return {
        ...employee,
        bankName: employee.bank?.bankName,
        accountNumber: employee.bank?.accountNumber,
        branchName: employee.bank?.branchName,
        accountHolderName: employee.bank?.accountHolderName,
        bank: undefined
    };
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
        bankName,
        accountNumber,
        branchName,
        accountHolderName,
        ...validData
    } = data;

    return await prisma.$transaction(async (tx) => {
        const updatedEmployee = await tx.employee.update({
            where: { id },
            data: validData,
        });

        if (bankName && accountNumber) {
            await tx.employeeBank.upsert({
                where: { employeeId: id },
                update: {
                    bankName,
                    accountNumber,
                    branchName: branchName || '',
                    accountHolderName: accountHolderName || updatedEmployee.fullName,
                    updatedAt: new Date()
                },
                create: {
                    employeeId: id,
                    bankName,
                    accountNumber,
                    branchName: branchName || '',
                    accountHolderName: accountHolderName || updatedEmployee.fullName,
                    updatedAt: new Date()
                }
            });
        }

        return updatedEmployee;
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
