import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Seed initial PayrollRates configuration
    // Effective from 01.04.2025 (Sri Lanka PAYE effective date)
    console.log('Creating initial payroll rates configuration...');

    const existingConfig = await prisma.payrollRates.findFirst({
        where: { isActive: true }
    });

    if (existingConfig) {
        console.log('✅ Active payroll configuration already exists. Skipping...');
    } else {
        await prisma.payrollRates.create({
            data: {
                effectiveFrom: new Date('2025-04-01'),
                // Tax Free Monthly Limit
                taxFreeMonthlyLimit: 150000, // Rs. 150,000
                // Tax Slabs (Monthly)
                slab1Limit: 83333, // First Rs. 83,333 @ 6%
                slab1Rate: 6,
                slab2Limit: 41667, // Next Rs. 41,667 @ 18%
                slab2Rate: 18,
                slab3Limit: 41667, // Next Rs. 41,667 @ 24%
                slab3Rate: 24,
                slab4Limit: 41667, // Next Rs. 41,667 @ 30%
                slab4Rate: 30,
                slab5Rate: 36, // Remaining @ 36%
                // EPF/ETF Rates
                employeeEPFRate: 8,
                employerEPFRate: 12,
                etfRate: 3,
                isActive: true
            }
        });
        console.log('✅ Initial payroll rates configuration created successfully!');
    }

    console.log('🌱 Seeding completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
