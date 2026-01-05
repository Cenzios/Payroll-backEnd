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
            status: { in: ['ACTIVE', 'PENDING_ACTIVATION'] },
        },
        include: {
            plan: true,
            addons: true,
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log('✅ Found subscription:', subscription);

    if (!subscription) {
        throw new Error('No active or pending subscription found.');
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

// ✅ Subscribe User by EMAIL (creates PENDING_ACTIVATION subscription)
const subscribeUserToPlan = async (email: string, planId: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Validate plan exists
    const plan = await prisma.plan.findUnique({
        where: { id: planId }
    });

    if (!plan) {
        throw new Error('Invalid plan selected');
    }

    // Check for existing subscription
    const existingSubscription = await prisma.subscription.findFirst({
        where: {
            userId: user.id,
            status: { in: ['PENDING_ACTIVATION', 'ACTIVE'] },
        },
    });

    if (existingSubscription) {
        throw new Error('User already has a subscription');
    }

    // Create subscription with PENDING_ACTIVATION status (not ACTIVE)
    const subscription = await prisma.subscription.create({
        data: {
            userId: user.id,
            planId,
            status: 'PENDING_ACTIVATION',
            selectedAt: new Date(),
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        },
        include: { plan: true },
    });

    return subscription;
};

// ✅ Select Plan during Signup (creates PENDING_ACTIVATION subscription)
const selectPlan = async (userId: string, planId: string) => {
    // Validate user exists and has completed required steps
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    // 🔍 Context Detection: Is this a signup flow or an account management flow?
    const activeSubscription = await prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' }
    });

    const isSignupFlow = !activeSubscription;

    if (isSignupFlow) {
        // 🛡️ SIGNUP FLOW RULES
        if (!user.isEmailVerified) {
            throw new Error('Please verify your email before selecting a plan');
        }

        // Only enforce password check for email users (Google users have no password)
        if (user.password && !user.isPasswordSet) {
            throw new Error('Please set your password before selecting a plan');
        }

        console.log(`🛡️ Signup plan selection for user ${userId}: Checks passed.`);
    } else {
        // 🔄 ACCOUNT MANAGEMENT FLOW (Logged-in)
        console.log(`🔄 Logged-in plan change for user ${userId}: Skipping signup guards.`);
    }

    // Validate plan exists
    const plan = await prisma.plan.findUnique({
        where: { id: planId }
    });

    if (!plan) {
        throw new Error('Invalid plan selected');
    }

    // 🔍 Find existing PENDING_ACTIVATION intent to reuse/update
    const existingPending = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'PENDING_ACTIVATION'
        }
    });

    if (existingPending) {
        // ✅ Update existing pending intent
        const updated = await prisma.subscription.update({
            where: { id: existingPending.id },
            data: {
                planId,
                selectedAt: new Date()
            },
            include: { plan: true }
        });

        console.log(`✅ Updated existing pending subscription ${updated.id} to new plan ${planId}`);

        return {
            subscriptionId: updated.id,
            status: updated.status,
            plan: {
                id: plan.id,
                name: plan.name,
                price: plan.price,
                maxEmployees: plan.maxEmployees,
                maxCompanies: plan.maxCompanies
            }
        };
    }

    // ✅ Create new subscription with PENDING_ACTIVATION status
    // (Preserves any ACTIVE subscription until this one is activated)
    const subscription = await prisma.subscription.create({
        data: {
            userId,
            planId,
            status: 'PENDING_ACTIVATION',
            selectedAt: new Date(),
            startDate: new Date(),
            endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        },
        include: { plan: true }
    });

    console.log(`✅ Created new pending subscription ${subscription.id} for user ${userId}`);

    return {
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: {
            id: plan.id,
            name: plan.name,
            price: plan.price,
            maxEmployees: plan.maxEmployees,
            maxCompanies: plan.maxCompanies
        }
    };
};

// ✅ Activate Subscription (temporary - until payment integration)
const activateSubscription = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'PENDING_ACTIVATION'
        }
    });

    if (!subscription) {
        throw new Error('No pending subscription found');
    }

    return await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            status: 'ACTIVE',
            activatedAt: new Date()
        },
        include: { plan: true }
    });
};

export {
    upgradeSubscription,
    addAddon,
    subscribeUserToPlan,
    selectPlan,
    activateSubscription,
    getCurrentSubscriptionDetails,
    changePlan,
};
