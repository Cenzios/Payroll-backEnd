import prisma from '../config/db';
import { InterestRateType, LoanInstallmentStatus } from '@prisma/client';

export const createLoan = async (companyId: string, data: {
    loanId: string;
    employeeId: string;
    loanTitle: string;
    description?: string;
    startDate: string;
    endDate: string;
    interestRateType: InterestRateType;
    amount: number;
    installmentCount: number;
    interestRate: number;
    monthlyPremium: number;
    supportingDocId?: string;
}) => {
    const { employeeId, ...loanFields } = data;

    const employee = await prisma.employee.findUnique({
        where: { id: employeeId, companyId }
    });

    if (!employee) {
        throw new Error('Employee not found');
    }

    // Create Loan & Installments in a transaction
    return await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.create({
            data: {
                ...loanFields,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                employeeId,
                companyId,
                employeeNameSnapshot: employee.fullName,
                updatedAt: new Date()
            }
        });

        // Generate installments
        const installments: any[] = [];
        const startDate = new Date(data.startDate);

        for (let i = 1; i <= data.installmentCount; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i); // Due dates start 1 month after start date

            installments.push({
                loanId: loan.id,
                installmentNumber: i,
                dueDate,
                amount: data.monthlyPremium,
                status: LoanInstallmentStatus.PENDING,
                updatedAt: new Date()
            });
        }

        await tx.loanInstallment.createMany({
            data: installments
        });

        return loan;
    });
};

export const getLoans = async (companyId: string) => {
    return await prisma.loan.findMany({
        where: { companyId, deletedAt: null },
        include: {
            employee: {
                select: { fullName: true, employeeId: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const getLoanById = async (companyId: string, loanId: string) => {
    return await prisma.loan.findFirst({
        where: { id: loanId, companyId, deletedAt: null },
        include: {
            employee: true,
            installments: {
                orderBy: { installmentNumber: 'asc' }
            }
        }
    });
};
