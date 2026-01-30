import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seeding...');

    // Seed initial PayrollRates configuration
    console.log('Creating initial payroll rates configuration...');

    const payrollRatesDate = [
        {
            id: "PR_2025_04",
            effectiveFrom: new Date("2025-04-01 00:00:00"),
            taxFreeMonthlyLimit: 150000.00,
            slab1Limit: 83333.00,
            slab1Rate: 6.00,
            slab2Limit: 41666.00,
            slab2Rate: 18.00,
            slab3Limit: 41666.00,
            slab3Rate: 24.00,
            slab4Limit: 41666.00,
            slab4Rate: 30.00,
            slab5Rate: 36.00,
            employeeEPFRate: 8.00,
            employerEPFRate: 12.00,
            etfRate: 3.00,
            isActive: true,
            createdAt: new Date("2026-01-23 11:54:06.863"),
            updatedAt: new Date("2026-01-23 11:54:06.863")
        }
    ];

    for (const rate of payrollRatesDate) {
        await prisma.payrollRates.upsert({
            where: { id: rate.id },
            update: rate,
            create: rate
        });
    }
    console.log('✅ Payroll rates seeded successfully!');

    // Seed Plans
    console.log('Seeding plans...');
    const plansData = [
        {
            id: "0f022c11-2a3c-49f5-9d11-30082882a8e9",
            name: "Basic",
            price: 0.0,
            maxEmployees: 29,
            maxCompanies: 2,
            features: "{\"canExportData\": false, \"canViewReports\": false}",
            createdAt: "2026-01-20 08:22:32.885",
            description: "",
            employeePrice: 100.0,
            registrationFee: 2500.0
        },
        {
            id: "3a9f7d42-5b6a-4d6b-b3d2-9b4d6d5a1c21",
            name: "Professional",
            price: 75.0,
            maxEmployees: 99,
            maxCompanies: 3,
            features: "{\"canExportData\": true, \"canViewReports\": true, \"prioritySupport\": false}",
            createdAt: "2026-01-20 08:22:34.855",
            description: "",
            employeePrice: 175.0,
            registrationFee: 5000.0
        },
        {
            id: "9e1c4b2a-8d7f-4b9a-a5c2-2c3f4d6e7b88",
            name: "Enterprise",
            price: 50.0,
            maxEmployees: 100,
            maxCompanies: 10,
            features: "{\"canExportData\": true, \"canViewReports\": true, \"customBranding\": true, \"prioritySupport\": true}",
            createdAt: "2026-01-20 08:22:36.051",
            description: "",
            employeePrice: 200.0,
            registrationFee: 7500.0
        }
    ];

    for (const planData of plansData) {
        const { features, ...planFields } = planData;

        const plan = await prisma.plan.upsert({
            where: { id: planData.id },
            update: {
                ...planFields,
                createdAt: new Date(planData.createdAt)
            },
            create: {
                ...planFields,
                createdAt: new Date(planData.createdAt)
            }
        });

        // Seed Plan Features
        const featuresJson = JSON.parse(features);

        // Clear existing features for this plan to avoid duplicates during re-seed
        await prisma.planFeature.deleteMany({
            where: { planId: plan.id }
        });

        for (const [name, enabled] of Object.entries(featuresJson)) {
            await prisma.planFeature.create({
                data: {
                    planId: plan.id,
                    featureName: name,
                    isEnabled: !!enabled
                }
            });
        }
    }
    console.log('✅ Plans and features seeded successfully!');

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
