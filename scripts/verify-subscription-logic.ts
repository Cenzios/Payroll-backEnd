import prisma from '../src/config/db';
import { getSubscriptionAccessStatus } from '../src/services/subscription.service';

async function main() {
    console.log('🧪 Starting Subscription Logic Verification...');

    // 1. Setup Test User
    const email = `test_logic_${Date.now()}@example.com`;
    console.log(`Creating test user: ${email}`);

    const user = await prisma.user.create({
        data: {
            email,
            fullName: 'Test User',
            password: 'hashedpassword',
            isEmailVerified: true
        }
    });

    // 1.1 Create Plan
    const plan = await prisma.plan.create({
        data: {
            name: 'Test Plan',
            price: 1000,
            employeePrice: 100,
            registrationFee: 5000,
            maxEmployees: 10,
            maxCompanies: 1,
            features: {},
            description: 'Test Plan Desc'
        }
    });

    // 1.2 Create Subscription
    const subscription = await prisma.subscription.create({
        data: {
            userId: user.id,
            planId: plan.id,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        }
    });

    try {
        // Scenario 1: New User (Likely ACTIVE if no invoices generated yet, or BLOCKED if strictly requiring invoice)
        // My Logic: No invoices -> ACTIVE (for now, assuming free tier or initial grace)
        let status = await getSubscriptionAccessStatus(user.id);
        console.log(`Scenario 1 (No Invoices): ${status.status} (Expected: ACTIVE)`);

        // Scenario 2: Create PENDING Registration Invoice
        console.log('Creating PENDING Registration Invoice...');
        await prisma.invoice.create({
            data: {
                userId: user.id,
                subscriptionId: subscription.id,
                planId: plan.id,
                billingType: 'REGISTRATION',
                billingMonth: '2025-01',
                employeeCount: 0,
                pricePerEmployee: plan.employeePrice,
                registrationFee: plan.registrationFee,
                totalAmount: plan.registrationFee,
                status: 'PENDING'
            }
        });

        status = await getSubscriptionAccessStatus(user.id);
        console.log(`Scenario 2 (Pending Reg Invoice): ${status.status} (Expected: BLOCKED)`);

        // Scenario 3: Pay Registration Invoice
        console.log('Marking Registration Invoice as PAID...');
        await prisma.invoice.updateMany({
            where: { userId: user.id, billingType: 'REGISTRATION' },
            data: { status: 'PAID' }
        });

        status = await getSubscriptionAccessStatus(user.id);
        console.log(`Scenario 3 (Paid Reg Invoice): ${status.status} (Expected: ACTIVE)`);

        // Scenario 4: Create PENDING Monthly Invoice
        console.log('Creating PENDING Monthly Invoice...');
        await prisma.invoice.create({
            data: {
                userId: user.id,
                subscriptionId: subscription.id,
                planId: plan.id,
                billingType: 'MONTHLY',
                billingMonth: '2025-02',
                employeeCount: 5,
                pricePerEmployee: plan.employeePrice,
                registrationFee: 0,
                totalAmount: 500,
                status: 'PENDING'
            }
        });

        status = await getSubscriptionAccessStatus(user.id);
        console.log(`Scenario 4 (Pending Monthly Invoice): ${status.status} (Expected: BLOCKED)`);

        // Scenario 5: Pay Monthly Invoice
        console.log('Marking Monthly Invoice as PAID...');
        await prisma.invoice.updateMany({
            where: { userId: user.id, billingType: 'MONTHLY' },
            data: { status: 'PAID' }
        });

        status = await getSubscriptionAccessStatus(user.id);
        console.log(`Scenario 5 (Paid Monthly Invoice): ${status.status} (Expected: ACTIVE)`);

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        try {
            await prisma.invoice.deleteMany({ where: { userId: user.id } });
            await prisma.subscription.deleteMany({ where: { userId: user.id } }); // Delete sub first
            await prisma.plan.delete({ where: { id: plan.id } }); // Delete plan
            await prisma.user.delete({ where: { id: user.id } });
        } catch (cleanupErr) {
            console.error('Cleanup Error:', cleanupErr);
        }
        await prisma.$disconnect();
    }
}

main();
