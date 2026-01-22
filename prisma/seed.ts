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

    // Seed Plans
    console.log('Seeding plans...');
    const plans = [
        {
            id: "0f022c11-2a3c-49f5-9d11-30082882a8e9",
            name: "Basic",
            price: 2500,
            employeePrice: 100,
            registrationFee: 2500,
            maxEmployees: 30,
            maxCompanies: 2,
            description: "",
            features: { canExportData: false, canViewReports: false }
        },
        {
            id: "3a9f7d42-5b6a-4d6b-b3d2-9b4d6d5a1c21",
            name: "Professional",
            price: 5000,
            employeePrice: 175,
            registrationFee: 5000,
            maxEmployees: 99,
            maxCompanies: 3,
            description: "",
            features: { canExportData: true, canViewReports: true, prioritySupport: false }
        },
        {
            id: "9e1c4b2a-8d7f-4b9a-a5c2-2c3f4d6e7b88",
            name: "Enterprise",
            price: 7500,
            employeePrice: 200,
            registrationFee: 7500,
            maxEmployees: 100,
            maxCompanies: 10,
            description: "",
            features: { canExportData: true, canViewReports: true, customBranding: true, prioritySupport: true }
        }
    ];

    for (const plan of plans) {
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: plan,
            create: plan
        });
    }
    console.log('✅ Plans seeded successfully!');

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
