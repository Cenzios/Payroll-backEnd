import prisma from '../config/db';
import { generateCheckoutHash, generateNotifyHash } from '../utils/payhere';

// ✅ Create Payment Intent
export const createIntent = async (
    userId: string,
    planId: string,
    amount: number,
    currency: string = 'LKR',
    metadata: any = {}
) => {
    // Check if user exists
    const user = await prisma.user.findUnique({
        where: { id: userId }
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Create Intent
    const intent = await prisma.paymentIntent.create({
        data: {
            userId,
            planId,
            amount,
            currency,
            metadata,
            status: 'CREATED',
            gateway: 'PAYHERE',
        }
    });

    console.log(`✅ Payment Intent Created: ${intent.id} for User: ${userId}`);
    return intent;
};

// ✅ Get Intent by ID
export const getIntent = async (intentId: string) => {
    const intent = await prisma.paymentIntent.findUnique({
        where: { id: intentId },
        include: { user: true }
    });

    if (!intent) {
        throw new Error('Payment Intent not found');
    }

    return intent;
};

// ✅ Generate PayHere Payload for an Intent
export const generatePayHerePayload = async (intentId: string) => {
    const intent = await getIntent(intentId);

    if (intent.status === 'SUCCEEDED') {
        throw new Error('This intent has already been paid.');
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID || '';
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';

    // 1. Generate Unique PayHere Order ID
    const payhereOrderId = `PH_${intent.id}`;

    // 2. Update Intent with this Order ID (to link it later)
    await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
            payhereOrderId,
            status: 'REDIRECTED'
        }
    });

    // 3. Generate Hash using the PayHere Order ID (NOT the intent ID)
    const hash = generateCheckoutHash(
        merchantId,
        payhereOrderId,
        intent.amount,
        intent.currency,
        merchantSecret
    );

    // Prepare Payload
    const { user } = intent;
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    console.log(`✅ Generated PayHere Payload for Intent: ${intent.id} (Order ID: ${payhereOrderId})`);

    return {
        sandbox: true,
        merchant_id: merchantId,
        return_url: process.env.PAYHERE_RETURN_URL, // Frontend success page
        cancel_url: process.env.PAYHERE_CANCEL_URL, // Frontend cancel page
        notify_url: process.env.PAYHERE_NOTIFY_URL, // Backend webhook
        order_id: payhereOrderId, // Use the generated PH_ ID
        items: `Subscription Plan: ${intent.planId}`,
        currency: intent.currency,
        amount: intent.amount,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        phone: '0000000000',
        address: 'Digital Subscription',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash: hash
    };
};

// ✅ Update Intent Status (Internal or Webhook)
export const updateIntentStatus = async (intentId: string, status: any, payhereOrderId?: string) => {
    const intent = await prisma.paymentIntent.update({
        where: { id: intentId },
        data: {
            status,
            payhereOrderId
        }
    });

    return intent;
};

// ✅ Process Webhook Logic (Atomic Transaction)
export const processPayHereNotify = async (data: any) => {
    const {
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        md5sig
    } = data;

    console.log(`POST /notify hit with Order ID: ${order_id} | Status: ${status_code}`);

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET || '';

    // 1. Verify Hash
    let localHash = generateNotifyHash(
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        merchantSecret
    );

    if (localHash !== md5sig) {
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
            localHash = retryHash;
        } else {
            console.error(`❌ PayHere Hash Mismatch for Order ${order_id}`);
            throw new Error('Invalid payment signature');
        }
    }

    // 2. Find Intent by PayHere Order ID
    const intent = await prisma.paymentIntent.findUnique({
        where: { payhereOrderId: order_id }
    });

    if (!intent) {
        console.error(`❌ PaymentIntent NOT FOUND for PayHere Order ID: ${order_id}`);
        throw new Error('Payment Intent not found for this order.');
    }

    if (intent.status === 'SUCCEEDED') {
        console.log(`ℹ️ Intent ${intent.id} already SUCCEEDED. Ignoring duplicate notify.`);
        return intent;
    }

    // 3. Determine Status
    let intentStatus: any = 'FAILED';
    if (status_code === '2') {
        intentStatus = 'SUCCEEDED';
    } else if (status_code === '0') {
        intentStatus = 'PROCESSING';
    } else if (status_code === '-3') {
        intentStatus = 'CANCELED';
    }

    // 4. Atomic Update (Intent Status + Subscription Activation)
    return await prisma.$transaction(async (tx) => {
        // Update Intent
        const updatedIntent = await tx.paymentIntent.update({
            where: { id: intent.id },
            data: { status: intentStatus }
        });
        console.log(`✅ Intent ${intent.id} updated to ${intentStatus}`);

        // If Succeeded, Activate Subscription
        if (intentStatus === 'SUCCEEDED') {
            const { userId, planId } = intent;

            // Handle Upgrade: Cancel existing active if different plan
            const currentActive = await tx.subscription.findFirst({
                where: { userId, status: 'ACTIVE' }
            });

            if (currentActive && currentActive.planId !== planId) {
                await tx.subscription.update({
                    where: { id: currentActive.id },
                    data: { status: 'CANCELLED', endDate: new Date() }
                });
            }

            // Find Pending Subscription
            let subscription = await tx.subscription.findFirst({
                where: { userId, planId, status: 'PENDING_ACTIVATION' },
                orderBy: { createdAt: 'desc' }
            });

            if (!subscription) {
                // If missing, create new
                subscription = await tx.subscription.create({
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

            // ACTIVATE
            await tx.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: 'ACTIVE',
                    activatedAt: new Date()
                }
            });
            console.log(`✅ Subscription ${subscription.id} ACTIVATED for User ${userId}`);
        }

        return updatedIntent;
    });
};
