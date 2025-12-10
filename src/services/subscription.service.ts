import prisma from '../config/db';

interface AddonData {
    type: string;
    value: number;
}

// ✅ Upgrade Existing Subscription
const upgradeSubscription = async (userId: string, newPlanId: string) => {
    const newPlan = await prisma.plan.findUnique({
        where: { id: newPlanId },
    });

    if (!newPlan) {
        throw new Error('Invalid plan selected');
    }

    const currentSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
    });

    return await prisma.$transaction(async (tx) => {
        if (currentSubscription) {
            await tx.subscription.update({
                where: { id: currentSubscription.id },
                data: {
                    status: 'EXPIRED',
                    endDate: new Date(),
                },
            });
        }

        const newSubscription = await tx.subscription.create({
            data: {
                userId,
                planId: newPlanId,
                status: 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            },
            include: { plan: true },
        });

        return newSubscription;
    });
};

// ✅ Add Addon to Active Subscription
const addAddon = async (userId: string, data: AddonData) => {
    const { type, value } = data;

    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
    });

    if (!subscription) {
        throw new Error('No active subscription found.');
    }

    return await prisma.subscriptionAddon.create({
        data: {
            subscriptionId: subscription.id,
            type,
            value,
        },
    });
};

// ✅ ✅ ✅ MAIN FIX — Subscribe User by EMAIL (NO new registration)
const subscribeUserToPlan = async (email: string, planId: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // ✅ Attach plan via real subscription system
    const existingSubscription = await prisma.subscription.findFirst({
        where: {
            userId: user.id,
            status: 'ACTIVE',
        },
    });

    if (existingSubscription) {
        throw new Error('User already has an active subscription');
    }

    const subscription = await prisma.subscription.create({
        data: {
            userId: user.id,
            planId,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
        include: { plan: true },
    });

    return subscription;
};

export {
    upgradeSubscription,
    addAddon,
    subscribeUserToPlan, // ✅ ✅ ✅ IMPORTANT EXPORT
};
