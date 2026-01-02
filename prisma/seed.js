import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      id: '0f022c11-2a3c-49f5-9d11-30082882a8e9',
      name: 'Basic',
      price: 0,
      maxEmployees: 30,
      maxCompanies: 2,
      features: {
        canExportData: false,
        canViewReports: false,
      },
    },
    {
      id: '3a9f7d42-5b6a-4d6b-b3d2-9b4d6d5a1c21',
      name: 'Professional',
      price: 75,
      maxEmployees: 99,
      maxCompanies: 3,
      features: {
        canExportData: true,
        canViewReports: true,
        prioritySupport: false,
      },
    },
    {
      id: '9e1c4b2a-8d7f-4b9a-a5c2-2c3f4d6e7b88',
      name: 'Enterprise',
      price: 50,
      maxEmployees: 100,
      maxCompanies: 10,
      features: {
        canExportData: true,
        canViewReports: true,
        customBranding: true,
        prioritySupport: true,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        price: plan.price,
        maxEmployees: plan.maxEmployees,
        maxCompanies: plan.maxCompanies,
        features: plan.features,
      },
      create: plan,
    });
  }

  console.log('✅ Plan table seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
