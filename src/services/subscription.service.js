const prisma = require('../config/db');

const upgradeSubscription = async (userId, newPlanId) => {
    // 1. Verify New Plan Exists
    const newPlan = await prisma.plan.findUnique({
        where: { id: newPlanId },
    });
    if (!newPlan) {
        throw new Error('Invalid plan selected');
    }

    // 2. Get Current Active Subscription
    const currentSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
    });

    // 3. Transaction to Upgrade
    return await prisma.$transaction(async (prisma) => {
        // Expire current subscription if exists
        if (currentSubscription) {
            await prisma.subscription.update({
                where: { id: currentSubscription.id },
                data: {
                    status: 'EXPIRED',
                    endDate: new Date(),
                },
            });
        }

        // Create new subscription
        const newSubscription = await prisma.subscription.create({
            data: {
                userId,
                planId: newPlanId,
                status: 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Default 1 year
            },
            include: { plan: true },
        });

        return newSubscription;
    });
};

const addAddon = async (userId, data) => {
    const { type, value } = data;

    // 1. Get Active Subscription
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
    });

    if (!subscription) {
        throw new Error('No active subscription found.');
    }

    // 2. Create Addon
    return await prisma.subscriptionAddon.create({
        data: {
            subscriptionId: subscription.id,
            type,
            value,
        },
    });
};

module.exports = {
    upgradeSubscription,
    addAddon,
};
