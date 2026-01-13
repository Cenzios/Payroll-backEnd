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

        const intent = await paymentService.createIntent(userId, planId, parseFloat(amount), currency);
        sendResponse(res, 201, true, 'Payment Intent Created', intent);
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

// ✅ Get PayHere Payload for Intent
export const getPayHerePayload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const payload = await paymentService.generatePayHerePayload(id);
        sendResponse(res, 200, true, 'PayHere Payload Generated', payload);
    } catch (error) {
        next(error);
    }
};

// ✅ Handle PayHere Webhook
export const handlePayHereNotify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('🔔 Received PayHere Notify (Intent System):', req.body);

        // 1. Verify & Update Intent
        const intent = await paymentService.processPayHereNotify(req.body);

        // 2. Activate Subscription if Verified
        if (intent.status === 'SUCCEEDED') {
            console.log(`🚀 Intent ${intent.id} Succeeded. Activating Subscription...`);
            await subscriptionService.activateSubscriptionByIntent(intent);
        }

        // Return 200 to PayHere purely to acknowledge receipt
        res.status(200).send('OK');
    } catch (error: any) {
        console.error('❌ Error in PayHere Notify:', error.message);
        // Return 200 to stop PayHere retries if it's a logic error (hash mismatch etc)
        // If it's a transient system error, maybe 500? But usually 200 is safest to stop loops.
        res.status(200).send('Error Processed');
    }
};
