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

// ✅ Get Current User Subscription Details
const getCurrentSubscriptionDetails = async (userId: string) => {
    console.log(`🔍 Checking subscription for userId: ${userId}`);
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
        include: {
            plan: true,
            addons: true,
        },
    });

    console.log('✅ Found subscription:', subscription);

    if (!subscription) {
        throw new Error('No active subscription found.');
    }

    // Calculate total allowed employees
    const planLimit = subscription.plan.maxEmployees;
    const addonLimit = subscription.addons
        .filter((addon) => addon.type === 'EMPLOYEE_EXTRA')
        .reduce((sum, addon) => sum + addon.value, 0);

    const totalAllowedEmployees = planLimit + addonLimit;

    // Count currently used employees across all user's companies
    const usedEmployees = await prisma.employee.count({
        where: {
            company: {
                ownerId: userId,
            },
            status: 'ACTIVE', // Only count active employees
        },
    });

    return {
        planId: subscription.plan.id,
        planName: subscription.plan.name,
        pricePerEmployee: subscription.plan.price,
        maxEmployees: planLimit,
        usedEmployees,
        totalAllowedEmployees,
        nextBillingDate: subscription.endDate,
        subscriptionId: subscription.id,
        status: subscription.status,
    };
};

// ✅ Change Plan (Upgrade/Downgrade)
const changePlan = async (userId: string, newPlanId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const newPlan = await prisma.plan.findUnique({ where: { id: newPlanId } });
    if (!newPlan) throw new Error('Invalid plan selected');

    const activeSubscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
        include: {
            addons: true, // Fetch addons to carry them over
        },
    });

    if (!activeSubscription) {
        throw new Error('No active subscription to change from.');
    }

    return await prisma.$transaction(async (tx) => {
        // 1. Cancel current subscription
        await tx.subscription.update({
            where: { id: activeSubscription.id },
            data: {
                status: 'CANCELLED',
                endDate: new Date(),
            },
        });

        // 2. Create new subscription
        const newSubscription = await tx.subscription.create({
            data: {
                userId,
                planId: newPlanId,
                status: 'ACTIVE', // Immediate switch
                startDate: new Date(),
                // Logic for endDate: Keep original billing cycle or restart?
                // Requirement says "Next billing date" - usually implies keeping cycle or restarting year. 
                // Simple approach: Restart generic 1 year term for now as per `subscribeUserToPlan`.
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            },
        });

        // 3. Preserve Addons (Clone them to new subscription)
        if (activeSubscription.addons && activeSubscription.addons.length > 0) {
            const addonPromises = activeSubscription.addons.map((addon) =>
                tx.subscriptionAddon.create({
                    data: {
                        subscriptionId: newSubscription.id,
                        type: addon.type,
                        value: addon.value,
                    },
                })
            );
            await Promise.all(addonPromises);
        }

        return newSubscription;
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
    subscribeUserToPlan,
    getCurrentSubscriptionDetails, // ✅ Exported
    changePlan, // ✅ Exported
};
