import prisma from '../config/db';
import Stripe from 'stripe';
import { sendWelcomeEmail } from './emailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia' as any, // Use latest or a specific version
});

// ✅ Create Stripe Payment Intent
export const createIntent = async (
    userId: string,
    planId: string,
    requestedAmount: number, // We verify this against Invoice
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

    // 🧾 1. Find Pending Invoice (Single Source of Truth)
    const invoice = await prisma.invoice.findFirst({
        where: {
            userId,
            planId,
            status: 'PENDING'
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!invoice) {
        throw new Error('No pending invoice found. Please select a plan first.');
    }

    console.log(`🧾 Found Pending Invoice ${invoice.id}, Amount: ${invoice.totalAmount}`);

    // Use Invoice amount, ignore requestedAmount (or validate)
    const finalAmount = invoice.totalAmount;

    // 2. Create Internal Intent Record
    const intent = await prisma.paymentIntent.create({
        data: {
            userId,
            planId,
            amount: finalAmount,
            currency,
            metadata,
            status: 'CREATED',
            gateway: 'STRIPE',
        }
    });

    // 🔗 3. Link Invoice to Payment Intent
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentIntentId: intent.id }
    });

    // 4. Create Stripe Payment Intent
    const stripeIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalAmount * 100), // Stripe expects cents
        currency,
        metadata: {
            userId,
            planId,
            internalIntentId: intent.id,
            invoiceId: invoice.id // Good for tracking in Stripe Dashboard
        },
        automatic_payment_methods: {
            enabled: true,
        },
    });

    // 5. Update Internal Intent with Stripe ID
    const updatedIntent = await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
            paymentOrderId: stripeIntent.id,
            status: 'PROCESSING'
        }
    });

    console.log(`✅ Stripe Intent Created: ${stripeIntent.id} for User: ${userId}`);

    return {
        clientSecret: stripeIntent.client_secret,
        intent: updatedIntent
    };
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

// ✅ Handle Stripe Webhook
export const handleStripeWebhook = async (signature: string, rawBody: Buffer) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error('Stripe Webhook Secret is missing');
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed.`, err.message);
        throw new Error(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
        const stripeIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`💰 PaymentIntent was successful: ${stripeIntent.id}`);

        await handlePaymentSuccess(stripeIntent);
    } else {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return { received: true };
};

// ✅ Internal Logic for Payment Success
const handlePaymentSuccess = async (stripeIntent: Stripe.PaymentIntent) => {
    const stripeId = stripeIntent.id;
    console.log(`DEBUG: Entering handlePaymentSuccess for Stripe ID: ${stripeId}`);

    // 1. Find Intent
    const intent = await prisma.paymentIntent.findUnique({
        where: { paymentOrderId: stripeId }
    });

    if (!intent) {
        console.error(`❌ PaymentIntent NOT FOUND for Stripe ID: ${stripeId}`);
        return; // Or throw, but webhook should return 200
    }

    if (intent.status === 'SUCCEEDED') {
        console.log(`ℹ️ Intent ${intent.id} already SUCCEEDED. Ignoring duplicate notify.`);
        return;
    }

    // 2. Atomic Update (Intent Status + Subscription Activation)
    await prisma.$transaction(async (tx) => {
        // Update Intent
        await tx.paymentIntent.update({
            where: { id: intent.id },
            data: { status: 'SUCCEEDED' }
        });
        console.log(`✅ Intent ${intent.id} updated to SUCCEEDED`);

        // 🧾 UPDATE INVOICE STATUS
        const invoice = await tx.invoice.findFirst({
            where: { paymentIntentId: intent.id }
        });

        if (invoice) {
            await tx.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'PAID',
                    paidAt: new Date()
                }
            });
            console.log(`🧾 Invoice ${invoice.id} marked as PAID`);
        } else {
            console.warn(`⚠️ No invoice found linked to payment intent ${intent.id}`);
        }

        // Activate Subscription
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
        console.log(`🚀 [STRIPE ACTIVATION] Activating subscription ${subscription.id} for user ${userId}`);
        const activatedSubscription = await tx.subscription.update({
            where: { id: subscription.id },
            data: {
                status: 'ACTIVE',
                activatedAt: new Date()
            },
            include: {
                plan: true,
                user: true
            }
        });

        // 📝 LOG PAYMENT DETAILS FOR USER SIGNUP IDENTIFICATION
        console.log('************************************************');
        console.log('✅ SUCCESSFUL PAYMENT & SIGNUP IDENTIFIED');
        console.log(`Transaction ID: ${stripeId}`);
        console.log(`Amount        : ${intent.currency}${intent.amount}`);
        console.log(`Date          : ${new Date().toLocaleString()}`);
        console.log(`Plan          : ${activatedSubscription.plan.name}`);
        console.log('************************************************');

        console.log(`✅ [STRIPE ACTIVATION] Subscription ${subscription.id} confirmed ACTIVE`);

        // 📧 SEND WELCOME EMAIL (If Registration)
        if (invoice && invoice.billingType === 'REGISTRATION') {
            console.log(`📧 [EMAIL] Triggering welcome email (Stripe) to: ${activatedSubscription.user.email}`);
            sendWelcomeEmail(
                activatedSubscription.user.email,
                activatedSubscription.user.fullName,
                stripeId, // Transaction ID
                intent.currency,
                intent.amount,
                new Date(),
                activatedSubscription.plan.name
            ).then(() => {
                console.log(`✅ [EMAIL] Welcome email promise resolved (Stripe)`);
            }).catch(err => {
                console.error('❌ [EMAIL] Failed to send welcome email (Stripe):', err);
            });
        }
        else {
            console.log(`ℹ️ [EMAIL] Skipping welcome email (Stripe): Not a registration invoice or invoice missing.`);
        }
    });
};

// ✅ Renew Monthly Subscription (Generate Intent)
export const renewMonthlySubscription = async (userId: string) => {
    // 1. Find Pending Request (MONTHLY or REGISTRATION)
    const invoice = await prisma.invoice.findFirst({
        where: {
            userId,
            billingType: { in: ['MONTHLY', 'REGISTRATION'] }, // Handle both blocking types
            status: { in: ['PENDING', 'FAILED'] }
        },
        orderBy: { createdAt: 'desc' },
        include: { plan: true }
    });

    if (!invoice) {
        throw new Error('No pending blocking invoice found.');
    }

    // 2. Calculate Amount (Double Check)
    const amount = invoice.totalAmount;

    console.log(`🔄 Renewing Monthly Invoice ${invoice.id}, Amount: ${amount}`);

    // 3. Create Internal Intent
    const intent = await prisma.paymentIntent.create({
        data: {
            userId,
            planId: invoice.planId,
            amount,
            currency: 'LKR', // Default
            status: 'CREATED',
            gateway: 'STRIPE'
        }
    });

    // 4. Link Invoice
    await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentIntentId: intent.id }
    });

    // 5. Create Stripe Intent
    const stripeIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'LKR',
        metadata: {
            userId,
            planId: invoice.planId,
            internalIntentId: intent.id,
            invoiceId: invoice.id,
            type: 'RENEWAL'
        },
        automatic_payment_methods: { enabled: true }
    });

    // 6. Update Internal Intent
    const updatedIntent = await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: {
            paymentOrderId: stripeIntent.id,
            status: 'PROCESSING'
        }
    });

    return {
        clientSecret: stripeIntent.client_secret,
        intent: updatedIntent,
        invoice
    };
};
