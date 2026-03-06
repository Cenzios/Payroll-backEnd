import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service';
import * as subscriptionService from '../services/subscription.service';
import sendResponse from '../utils/responseHandler';

// ✅ Create Payment Intent
export const createIntent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { planId, amount, currency } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!planId || !amount) {
            sendResponse(res, 400, false, 'planId and amount are required');
            return;
        }

        // Returns { clientSecret, intent }
        const result = await paymentService.createIntent(userId, planId, parseFloat(amount), currency);
        sendResponse(res, 201, true, 'Payment Intent Created', result);
    } catch (error) {
        next(error);
    }
};

// ✅ Get Intent Status
export const getIntent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const intent = await paymentService.getIntent(id);
        sendResponse(res, 200, true, 'Payment Intent Details', intent);
    } catch (error) {
        next(error);
    }
};

// ✅ Handle Stripe Webhook
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
    // 🔥 STEP 1: Confirm webhook endpoint is being hit at all
    console.log('🔥 STRIPE WEBHOOK HIT');

    try {
        const signature = req.headers['stripe-signature'] as string;

        if (!signature) {
            console.error('❌ Missing Stripe signature header');
            res.status(400).send('Missing stripe-signature header');
            return;
        }

        // req.body MUST be a Buffer (express.raw)
        console.log('🧾 Webhook raw body length:', req.body?.length);

        // 🔄 Process webhook (verify signature + activate subscription)
        await paymentService.handleStripeWebhook(signature, req.body);

        console.log('✅ Stripe webhook processed successfully');
        res.json({ received: true });

    } catch (err: any) {
        // ❌ STEP 2: Explicit signature verification failure log
        console.error('❌ Stripe webhook failed');
        console.error('❌ Error message:', err.message);

        // Very important for debugging in production
        if (err.type) {
            console.error('❌ Stripe error type:', err.type);
        }

        res.status(400).send(`Webhook Error: ${err.message}`);
    }
};


// ✅ Renew Monthly Subscription
export const renewMonthlySubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const result = await paymentService.renewMonthlySubscription(userId);
        sendResponse(res, 201, true, 'Renewal Payment Intent Created', result);
    } catch (error) {
        next(error);
    }
};
