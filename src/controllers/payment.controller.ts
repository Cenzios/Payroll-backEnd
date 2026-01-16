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
    try {
        const signature = req.headers['stripe-signature'] as string;

        // req.body is a Buffer because of express.raw()
        await paymentService.handleStripeWebhook(signature, req.body);

        res.json({ received: true });
    } catch (error: any) {
        console.error('❌ Stripe Webhook Error:', error.message);
        res.status(400).send(`Webhook Error: ${error.message}`);
    }
};

