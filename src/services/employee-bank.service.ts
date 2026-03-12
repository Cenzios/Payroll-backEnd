import prisma from '../config/db';

export const createOrUpdateBankDetails = async (employeeId: string, companyId: string, data: {
    accountHolderName: string;
    bankName: string;
    branchName: string;
    accountNumber: string;
}) => {
    // Verify employee belongs to company
    const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null }
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    return await prisma.employeeBank.upsert({
        where: { employeeId },
        update: {
            ...data,
            updatedAt: new Date()
        },
        create: {
            ...data,
            employeeId
        }
    });
};

export const getBankDetails = async (employeeId: string, companyId: string) => {
    const employee = await prisma.employee.findFirst({
        where: { id: employeeId, companyId, deletedAt: null }
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    return await prisma.employeeBank.findUnique({
        where: { employeeId }
    });
};
