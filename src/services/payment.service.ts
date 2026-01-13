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

    // Generate Hash
    const hash = generateCheckoutHash(
        merchantId,
        intent.id, // Order ID = Intent ID
        intent.amount,
        intent.currency,
        merchantSecret
    );

    // Prepare Payload
    const { user } = intent;
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'Customer';

    return {
        sandbox: true,
        merchant_id: merchantId,
        return_url: process.env.PAYHERE_RETURN_URL, // Frontend success page
        cancel_url: process.env.PAYHERE_CANCEL_URL, // Frontend cancel page
        notify_url: process.env.PAYHERE_NOTIFY_URL, // Backend webhook
        order_id: intent.id,
        items: `Subscription Plan: ${intent.planId}`,
        currency: intent.currency,
        amount: intent.amount,
        first_name: firstName,
        last_name: lastName,
        email: user.email,
        phone: '0000000000', // Optional or fetch if available
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

// ✅ Process Webhook Logic (Moved from subscription service)
export const processPayHereNotify = async (data: any) => {
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
    let localHash = generateNotifyHash(
        merchant_id,
        order_id,
        payhere_amount,
        payhere_currency,
        status_code,
        merchantSecret
    );

    // Strategy B: Verify with decimal formatted amount
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
            console.error(`❌ PayHere Hash Mismatch for intent ${order_id}`);
            throw new Error('Invalid payment signature');
        }
    }

    // 2. Determine Status
    // PayHere Status 2 = Success. Others (0, -1, -2, -3) are pending/failed/canceled.
    let intentStatus: any = 'FAILED';
    if (status_code === '2') {
        intentStatus = 'SUCCEEDED';
    } else if (status_code === '0') {
        intentStatus = 'PROCESSING';
    } else if (status_code === '-3') {
        intentStatus = 'CANCELED';
    }

    // 3. Update Intent
    const updatedIntent = await updateIntentStatus(order_id, intentStatus, order_id);
    console.log(`✅ Intent ${order_id} updated to ${intentStatus}`);

    return updatedIntent;
};
