import prisma from '../config/db';
import { generateCheckoutHash, generateNotifyHash } from '../utils/payhere';

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

    // 📅 DYNAMIC NEXT BILLING DATE LOGIC (Monthly)
    const activatedDate = subscription.activatedAt || subscription.startDate;
    const billingDay = activatedDate.getDate();

    // Check for the most recent MONTHLY invoice
    const latestMonthlyInvoice = await prisma.invoice.findFirst({
        where: {
            userId,
            billingType: 'MONTHLY'
        },
        orderBy: {
            billingMonth: 'desc'
        }
    });

    let nextBillingDate: Date;
    if (latestMonthlyInvoice) {
        // Example: billingMonth is "2026-01". Next is 2026-02.
        const [year, month] = latestMonthlyInvoice.billingMonth.split('-').map(Number);
        // Billing month is 1-indexed (Jan=1), but Date month is 0-indexed (Jan=0)
        // new Date(year, month, day) will automatically move to next month
        // e.g. new Date(2026, 1, 22) -> Feb 22, 2026
        nextBillingDate = new Date(year, month, billingDay);
    } else {
        // No monthly invoice yet? Show first monthly billing date (activated + 1 month)
        nextBillingDate = new Date(activatedDate);
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

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
        pricePerEmployee: subscription.plan.employeePrice, // Use new field
        registrationFee: subscription.plan.registrationFee, // Add registration fee
        maxEmployees: planLimit,
        usedEmployees,
        totalAllowedEmployees,
        nextBillingDate: nextBillingDate, // Now dynamic monthly
        subscriptionId: subscription.id,
        description: subscription.plan.description,
        features: subscription.plan.features,
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

        // 🧾 INVOICE LOGIC (Update existing invoice)
        const existingInvoice = await prisma.invoice.findFirst({
            where: {
                subscriptionId: updated.id,
                billingType: 'REGISTRATION',
                status: 'PENDING'
            }
        });

        if (existingInvoice) {
            await prisma.invoice.update({
                where: { id: existingInvoice.id },
                data: {
                    planId: planId,
                    registrationFee: plan.registrationFee,
                    totalAmount: plan.registrationFee,
                    pricePerEmployee: plan.employeePrice
                }
            });
            console.log(`🧾 Updated REGISTRATION invoice for subscription ${updated.id}`);
        } else {
            await prisma.invoice.create({
                data: {
                    userId,
                    subscriptionId: updated.id,
                    planId,
                    billingType: 'REGISTRATION',
                    billingMonth: new Date().toISOString().slice(0, 7),
                    employeeCount: 0,
                    pricePerEmployee: plan.employeePrice,
                    registrationFee: plan.registrationFee,
                    totalAmount: plan.registrationFee,
                    status: 'PENDING'
                }
            });
            console.log(`🧾 Created REGISTRATION invoice for subscription ${updated.id}`);
        }

        return {
            subscriptionId: updated.id,
            // ... (lines truncated for brevity in replacementContent, but I will include them to match StartLine/EndLine)
            status: updated.status,
            plan: {
                id: plan.id,
                name: plan.name,
                price: plan.employeePrice,
                registrationFee: plan.registrationFee,
                maxEmployees: plan.maxEmployees,
                maxCompanies: plan.maxCompanies,
                description: plan.description,
                features: plan.features
            }
        };
    }

    // ✅ Create new subscription with PENDING_ACTIVATION status
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

    // 🧾 INVOICE LOGIC (Create new invoice)
    await prisma.invoice.create({
        data: {
            userId,
            subscriptionId: subscription.id,
            planId,
            billingType: 'REGISTRATION',
            billingMonth: new Date().toISOString().slice(0, 7),
            employeeCount: 0,
            pricePerEmployee: plan.employeePrice,
            registrationFee: plan.registrationFee,
            totalAmount: plan.registrationFee,
            status: 'PENDING'
        }
    });
    console.log(`🧾 Created REGISTRATION invoice for subscription ${subscription.id}`);

    return {
        subscriptionId: subscription.id,
        status: subscription.status,
        plan: {
            id: plan.id,
            name: plan.name,
            price: plan.employeePrice,
            registrationFee: plan.registrationFee,
            maxEmployees: plan.maxEmployees,
            maxCompanies: plan.maxCompanies,
            description: plan.description,
            features: plan.features
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

// ✅ Create PayHere Payment Session
const createPaymentSession = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) throw new Error('User not found');

    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'PENDING_ACTIVATION'
        },
        include: { plan: true }
    });

    if (!subscription) {
        throw new Error('No pending subscription found to pay for.');
    }

    const { plan } = subscription;
    const amount = plan.price;
    const currency = process.env.PAYHERE_CURRENCY || 'LKR';
    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';

    // Generate PayHere Hash
    const hash = generateCheckoutHash(
        merchantId,
        subscription.id,
        amount,
        currency,
        merchantSecret
    );

    // Prepare PayHere payload
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    return {
        sandbox: true,
        merchant_id: merchantId,
        return_url: process.env.PAYHERE_RETURN_URL,
        cancel_url: process.env.PAYHERE_CANCEL_URL,
        notify_url: process.env.PAYHERE_NOTIFY_URL,
        order_id: subscription.id,
        items: `${plan.name} Plan Subscription`,
        currency: currency,
        amount: amount,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        phone: '0771234567',
        address: 'No 1, Galle Road',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash: hash
    };
};

// ✅ Process PayHere Notify Webhook
const processPayHereNotify = async (data: any) => {
    const {
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig
    } = data;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';

    // 1. Verify Hash
    // Strategy A: Verify with raw amount (as received)
    let localHash = generateNotifyHash(
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        merchantSecret
    );

    // Strategy B: Verify with decimal formatted amount (PayHere standard 2 decimals)
    if (localHash !== md5sig) {
        console.warn(`⚠️ First hash attempt failed for ${order_id}. Retrying with decimal formatting...`);

        const formattedAmount = Number(payhere_amount).toFixed(2);
        const retryHash = generateNotifyHash(
            merchant_id,
            order_id,
            formattedAmount,
            payhere_currency,
            status_code,
            merchantSecret
        );

        if (retryHash === md5sig) {
            localHash = retryHash; // Success on second attempt
            console.log(`✅ Hash verified with formatted amount: ${formattedAmount}`);
        } else {
            // Debug Logs (Be careful not to expose secrets in prod logs if possible, but essential here)
            console.error(`❌ PayHere Hash Mismatch for order ${order_id}`);
            console.error(`   Received: ${md5sig}`);
            console.error(`   Computed (Raw): ${localHash}`);
            console.error(`   Computed (Fmt): ${retryHash}`);
            throw new Error('Invalid payment signature');
        }
    }

    // 2. Update Subscription Status
    const status = status_code === '2' ? 'ACTIVE' : 'FAILED';
    const activatedAt = status === 'ACTIVE' ? new Date() : null;

    console.log(`📡 PayHere Status Update for ${order_id}: ${status} (Code: ${status_code})`);

    return await prisma.subscription.update({
        where: { id: order_id },
        data: {
            status,
            activatedAt
        },
        include: { plan: true }
    });
};

// ✅ Activate Subscription using Payment Intent
const activateSubscriptionByIntent = async (intent: any) => {
    const { userId, planId, payhereOrderId } = intent;

    console.log(`🚀 Activating subscription for user ${userId} via Intent ${intent.id}`);

    // Check for existing ACTIVE subscription to handle UPGRADES
    const currentActive = await prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' }
    });

    if (currentActive) {
        if (currentActive.planId === planId) {
            console.log('User already has this plan active. Extending or Ignoring.');
            // TODO: Extend logic if needed. For now, valid payment = logic success.
            return currentActive;
        }

        // It's an upgrade/downgrade -> Cancel old one
        console.log(`🔄 Upgrading from ${currentActive.planId} to ${planId}. Cancelling old subscription ${currentActive.id}...`);
        await prisma.subscription.update({
            where: { id: currentActive.id },
            data: { status: 'CANCELLED', endDate: new Date() }
        });
    }

    // Find the PENDING subscription for this user and plan
    let subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            planId,
            status: 'PENDING_ACTIVATION'
        },
        orderBy: { createdAt: 'desc' }
    });

    // If no pending subscription found, create one
    if (!subscription) {
        console.log('Creating NEW PENDING subscription based on successful intent.');
        subscription = await prisma.subscription.create({
            data: {
                userId,
                planId,
                status: 'PENDING_ACTIVATION',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
            },
            include: { plan: true }
        });
    }

    // Activate it
    console.log(`✅ Activating subscription ${subscription.id}`);
    return await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
            status: 'ACTIVE',
            activatedAt: new Date(),
        }
    });
};

// ✅ Get All Plans
const getAllPlans = async () => {
    const plans = await prisma.plan.findMany({
        orderBy: { registrationFee: 'asc' }
    });

    return plans.map(plan => ({
        ...plan,
        features: plan.features
    }));
};

// ✅ Generate Monthly Invoice
const generateMonthlyInvoice = async (userId: string) => {
    // 1. Get Active Subscription with Add-ons
    const subscription = await prisma.subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
            plan: true,
            addons: true // ✅ Include Add-ons
        }
    });

    if (!subscription) {
        throw new Error('No active subscription found to generate invoice.');
    }

    // 2. Count Active Employees across all user's companies (Base Count)
    const baseEmployeeCount = await prisma.employee.count({
        where: {
            company: {
                ownerId: userId
            },
            status: 'ACTIVE'
        }
    });

    // 3. Calculate Add-on Extra Employee Count
    const addonExtraCount = subscription.addons
        .filter(addon => addon.type === 'EMPLOYEE_EXTRA')
        .reduce((sum, addon) => sum + (addon.value || 0), 0);

    const effectiveEmployeeCount = baseEmployeeCount + addonExtraCount;
    const billingMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const pricePerEmployee = subscription.plan.employeePrice;

    // ✅ Calculate Total with Add-ons
    const totalAmount = effectiveEmployeeCount * pricePerEmployee;

    console.log(`🧾 Generating Monthly Invoice for ${userId}. Base Employees: ${baseEmployeeCount}, Addon Extra: ${addonExtraCount}, Total Amount: ${totalAmount}`);

    // 3. Create Invoice (Check for existing first to avoid duplicates)
    const existingInvoice = await prisma.invoice.findFirst({
        where: {
            userId,
            subscriptionId: subscription.id,
            billingType: 'MONTHLY',
            billingMonth
        }
    });

    if (existingInvoice) {
        return existingInvoice;
    }

    return await prisma.invoice.create({
        data: {
            userId,
            subscriptionId: subscription.id,
            planId: subscription.planId,
            billingType: 'MONTHLY',
            billingMonth,
            employeeCount: baseEmployeeCount, // Store base count
            pricePerEmployee,
            registrationFee: 0,
            totalAmount, // Calculated with addons
            status: 'PENDING'
        }
    });
};

// ✅ Get Active Subscription (Simplified for Add-on Modal)
const getActiveSubscription = async (userId: string) => {
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE'
        },
        include: {
            plan: {
                select: {
                    employeePrice: true
                }
            }
        }
    });

    if (!subscription) {
        throw new Error('No active subscription found.');
    }

    return {
        subscription: {
            plan: {
                employeePrice: subscription.plan.employeePrice
            }
        }
    };
};

export {
    upgradeSubscription,
    addAddon,
    subscribeUserToPlan,
    selectPlan,
    activateSubscription,
    activateSubscriptionByIntent, // Exported
    getCurrentSubscriptionDetails,
    changePlan,
    createPaymentSession,
    processPayHereNotify,
    getAllPlans,
    generateMonthlyInvoice,
    getSubscriptionAccessStatus,
    getActiveSubscription
};

// ✅ Check Subscription Access Status
const getSubscriptionAccessStatus = async (userId: string): Promise<{ status: 'ACTIVE' | 'BLOCKED', message?: string }> => {
    // 1. Check for Pending/Failed REGISTRATION Invoice
    const registrationInvoice = await prisma.invoice.findFirst({
        where: {
            userId,
            billingType: 'REGISTRATION',
            status: { in: ['PENDING', 'FAILED'] }
        }
    });

    if (registrationInvoice) {
        return {
            status: 'BLOCKED',
            message: 'Registration fee payment is pending.'
        };
    }

    // 2. Check for Pending/Failed MONTHLY Invoice
    // We only care if there is ANY unpaid monthly invoice. 
    // Usually one is enough to block.
    const pendingMonthlyInvoice = await prisma.invoice.findFirst({
        where: {
            userId,
            billingType: 'MONTHLY',
            status: { in: ['PENDING', 'FAILED'] }
        }
    });

    if (pendingMonthlyInvoice) {
        return {
            status: 'BLOCKED',
            message: 'Monthly subscription payment is pending.'
        };
    }

    // 3. Default to ACTIVE
    return { status: 'ACTIVE' };
};

