import prisma from '../config/db';

interface TaxConfig {
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
}

/**
 * Calculate Monthly PAYE Tax according to Sri Lanka tax rules
 * effective from 01.04.2025
 * 
 * This is a MONTHLY slab-based calculation (NOT annual progressive recalculation)
 * 
 * @param monthlyGrossSalary - Employee's gross monthly salary
 * @param taxConfig - Tax configuration with slabs and rates
 * @returns Monthly PAYE tax amount
 */
const calculateMonthlyPAYE = (monthlyGrossSalary: number, taxConfig: TaxConfig): number => {
    // Convert Decimal to number
    const taxFreeLimit = Number(taxConfig.taxFreeMonthlyLimit);
    const slab1Limit = Number(taxConfig.slab1Limit);
    const slab1Rate = Number(taxConfig.slab1Rate);
    const slab2Limit = Number(taxConfig.slab2Limit);
    const slab2Rate = Number(taxConfig.slab2Rate);
    const slab3Limit = Number(taxConfig.slab3Limit);
    const slab3Rate = Number(taxConfig.slab3Rate);
    const slab4Limit = Number(taxConfig.slab4Limit);
    const slab4Rate = Number(taxConfig.slab4Rate);
    const slab5Rate = Number(taxConfig.slab5Rate);

    // 1. Apply tax-free allowance
    if (monthlyGrossSalary <= taxFreeLimit) {
        return 0;
    }

    const taxableIncome = monthlyGrossSalary - taxFreeLimit;
    let remainingIncome = taxableIncome;
    let totalTax = 0;

    // 2. Apply progressive tax slabs

    // Slab 1: First Rs. 83,333 @ 6%
    if (remainingIncome > 0) {
        const taxableAmount = Math.min(remainingIncome, slab1Limit);
        totalTax += (taxableAmount * slab1Rate) / 100;
        remainingIncome -= taxableAmount;
    }

    // Slab 2: Next Rs. 41,667 @ 18%
    if (remainingIncome > 0) {
        const taxableAmount = Math.min(remainingIncome, slab2Limit);
        totalTax += (taxableAmount * slab2Rate) / 100;
        remainingIncome -= taxableAmount;
    }

    // Slab 3: Next Rs. 41,667 @ 24%
    if (remainingIncome > 0) {
        const taxableAmount = Math.min(remainingIncome, slab3Limit);
        totalTax += (taxableAmount * slab3Rate) / 100;
        remainingIncome -= taxableAmount;
    }

    // Slab 4: Next Rs. 41,667 @ 30%
    if (remainingIncome > 0) {
        const taxableAmount = Math.min(remainingIncome, slab4Limit);
        totalTax += (taxableAmount * slab4Rate) / 100;
        remainingIncome -= taxableAmount;
    }

    // Slab 5: Remaining balance @ 36%
    if (remainingIncome > 0) {
        totalTax += (remainingIncome * slab5Rate) / 100;
    }

    // Round to 2 decimal places
    return Math.round(totalTax * 100) / 100;
};

export { calculateMonthlyPAYE };
