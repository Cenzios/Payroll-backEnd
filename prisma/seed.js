const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const plans = [
        {
            name: 'Free',
            price: 0,
            maxEmployees: 5,
            maxCompanies: 1,
            features: {
                canViewReports: false,
                canExportData: false,
            },
        },
        {
            name: 'Professional',
            price: 29.99,
            maxEmployees: 50,
            maxCompanies: 3,
            features: {
                canViewReports: true,
                canExportData: true,
            },
        },
        {
            name: 'Enterprise',
            price: 99.99,
            maxEmployees: 1000,
            maxCompanies: 10,
            features: {
                canViewReports: true,
                canExportData: true,
                prioritySupport: true,
            },
        },
    ];

    for (const plan of plans) {
        await prisma.plan.create({
            data: plan,
        });
    }

    console.log('Default plans created');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
