import prisma from '../config/db';
import { Decimal } from '@prisma/client/runtime/library';

interface CreatePayrollRatesData {
    effectiveFrom: Date;
    taxFreeMonthlyLimit: number;
    slab1Limit: number;
    slab1Rate: number;
    slab2Limit: number;
    slab2Rate: number;
    slab3Limit: number;
    slab3Rate: number;
    slab4Limit: number;
    slab4Rate: number;
    slab5Rate: number;
    employeeEPFRate: number;
    employerEPFRate: number;
    etfRate: number;
}

/**
 * Create a new payroll rates configuration
 * Automatically deactivates any previously active configuration
 */
const createPayrollRates = async (data: CreatePayrollRatesData) => {
    // 1. Deactivate all existing configurations
    await prisma.payrollRates.updateMany({
        where: { isActive: true },
        data: { isActive: false }
    });

    // 2. Create new configuration
    const payrollRates = await prisma.payrollRates.create({
        data: {
            effectiveFrom: data.effectiveFrom,
            taxFreeMonthlyLimit: new Decimal(data.taxFreeMonthlyLimit),
            slab1Limit: new Decimal(data.slab1Limit),
            slab1Rate: new Decimal(data.slab1Rate),
            slab2Limit: new Decimal(data.slab2Limit),
            slab2Rate: new Decimal(data.slab2Rate),
            slab3Limit: new Decimal(data.slab3Limit),
            slab3Rate: new Decimal(data.slab3Rate),
            slab4Limit: new Decimal(data.slab4Limit),
            slab4Rate: new Decimal(data.slab4Rate),
            slab5Rate: new Decimal(data.slab5Rate),
            employeeEPFRate: new Decimal(data.employeeEPFRate),
            employerEPFRate: new Decimal(data.employerEPFRate),
            etfRate: new Decimal(data.etfRate),
            isActive: true
        }
    });

    return payrollRates;
};

/**
 * Seed default payroll rates if none exist
 */
const seedDefaultPayrollRates = async () => {
    console.log('🌱 Seeding default payroll rates (SL PAYE 2025)...');
    return await prisma.payrollRates.create({
        data: {
            id: 'PR_2025_04',
            effectiveFrom: new Date('2025-04-01T00:00:00Z'),
            taxFreeMonthlyLimit: new Decimal(150000.00),
            slab1Limit: new Decimal(83333.00),
            slab1Rate: new Decimal(6.00),
            slab2Limit: new Decimal(41666.00),
            slab2Rate: new Decimal(18.00),
            slab3Limit: new Decimal(41666.00),
            slab3Rate: new Decimal(24.00),
            slab4Limit: new Decimal(41666.00),
            slab4Rate: new Decimal(30.00),
            slab5Rate: new Decimal(36.00),
            employeeEPFRate: new Decimal(8.00),
            employerEPFRate: new Decimal(12.00),
            etfRate: new Decimal(3.00),
            isActive: true
        }
    });
};

/**
 * Get the currently active payroll rates configuration
 */
const getActivePayrollRates = async () => {
    let activeRates = await prisma.payrollRates.findFirst({
        where: { isActive: true },
        orderBy: { effectiveFrom: 'desc' }
    });

    if (!activeRates) {
        // Fall back to seeding if no rates exist
        activeRates = await seedDefaultPayrollRates();
    }

    return activeRates;
};

/**
 * Get payroll rates configuration effective for a specific date
 */
const getPayrollRatesForDate = async (date: Date) => {
    const rates = await prisma.payrollRates.findFirst({
        where: {
            effectiveFrom: {
                lte: date
            }
        },
        orderBy: { effectiveFrom: 'desc' }
    });

    if (!rates) {
        // Fall back to active/seed configuration
        return getActivePayrollRates();
    }

    return rates;
};

/**
 * Get all payroll rates configurations
 */
const getAllPayrollRates = async () => {
    return await prisma.payrollRates.findMany({
        orderBy: { effectiveFrom: 'desc' }
    });
};

/**
 * Update an existing payroll rates configuration
 * If setting as active, deactivates all other configurations
 */
const updatePayrollRates = async (id: string, data: Partial<CreatePayrollRatesData> & { isActive?: boolean }) => {
    // If setting this configuration as active, deactivate others
    if (data.isActive === true) {
        await prisma.payrollRates.updateMany({
            where: {
                id: { not: id },
                isActive: true
            },
            data: { isActive: false }
        });
    }

    const updateData: any = {};

    if (data.effectiveFrom) updateData.effectiveFrom = data.effectiveFrom;
    if (data.taxFreeMonthlyLimit !== undefined) updateData.taxFreeMonthlyLimit = new Decimal(data.taxFreeMonthlyLimit);
    if (data.slab1Limit !== undefined) updateData.slab1Limit = new Decimal(data.slab1Limit);
    if (data.slab1Rate !== undefined) updateData.slab1Rate = new Decimal(data.slab1Rate);
    if (data.slab2Limit !== undefined) updateData.slab2Limit = new Decimal(data.slab2Limit);
    if (data.slab2Rate !== undefined) updateData.slab2Rate = new Decimal(data.slab2Rate);
    if (data.slab3Limit !== undefined) updateData.slab3Limit = new Decimal(data.slab3Limit);
    if (data.slab3Rate !== undefined) updateData.slab3Rate = new Decimal(data.slab3Rate);
    if (data.slab4Limit !== undefined) updateData.slab4Limit = new Decimal(data.slab4Limit);
    if (data.slab4Rate !== undefined) updateData.slab4Rate = new Decimal(data.slab4Rate);
    if (data.slab5Rate !== undefined) updateData.slab5Rate = new Decimal(data.slab5Rate);
    if (data.employeeEPFRate !== undefined) updateData.employeeEPFRate = new Decimal(data.employeeEPFRate);
    if (data.employerEPFRate !== undefined) updateData.employerEPFRate = new Decimal(data.employerEPFRate);
    if (data.etfRate !== undefined) updateData.etfRate = new Decimal(data.etfRate);
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    return await prisma.payrollRates.update({
        where: { id },
        data: updateData
    });
};

export {
    createPayrollRates,
    getActivePayrollRates,
    getPayrollRatesForDate,
    getAllPayrollRates,
    updatePayrollRates
};
