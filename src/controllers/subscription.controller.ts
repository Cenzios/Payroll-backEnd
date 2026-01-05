import { Request, Response, NextFunction } from 'express';
import * as subscriptionService from '../services/subscription.service';
import sendResponse from '../utils/responseHandler';

// ✅ Upgrade Existing Plan
export const upgrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { planId } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!planId) {
            sendResponse(res, 400, false, 'planId is required');
            return;
        }

        const subscription = await subscriptionService.upgradeSubscription(userId, planId);
        sendResponse(res, 200, true, 'Plan upgraded successfully', subscription);
    } catch (error) {
        next(error);
    }
};

// ✅ Add Addon
export const addAddon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { type, value } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!type || !value) {
            sendResponse(res, 400, false, 'Type and Value are required');
            return;
        }

        const addon = await subscriptionService.addAddon(userId, { type, value });
        sendResponse(res, 201, true, 'Addon added successfully', addon);
    } catch (error) {
        next(error);
    }
};

// ✅ Get Current Subscription Details
export const getCurrent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const details = await subscriptionService.getCurrentSubscriptionDetails(userId);
        sendResponse(res, 200, true, 'Subscription details fetched', details);
    } catch (error) {
        next(error);
    }
};

// ✅ Change Plan
export const changePlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { newPlanId } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!newPlanId) {
            sendResponse(res, 400, false, 'newPlanId is required');
            return;
        }

        const result = await subscriptionService.changePlan(userId, newPlanId);
        sendResponse(res, 200, true, 'Plan changed successfully', result);
    } catch (error) {
        next(error);
    }
};

// ✅ Select Plan (New Secure Endpoint)
export const selectPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { planId } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!planId) {
            sendResponse(res, 400, false, 'planId is required');
            return;
        }

        const result = await subscriptionService.selectPlan(userId, planId);
        sendResponse(res, 200, true, 'Plan selected successfully', result);
    } catch (error) {
        next(error);
    }
};

// ✅ Activate Pending Subscription (Temporary - until payment integration)
export const activatePending = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const result = await subscriptionService.activateSubscription(userId);
        sendResponse(res, 200, true, 'Subscription activated successfully', result);
    } catch (error) {
        next(error);
    }
};

// ✅ Create PayHere Payment Session
export const createPaymentSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const session = await subscriptionService.createPaymentSession(userId);
        sendResponse(res, 200, true, 'Payment session created', session);
    } catch (error) {
        next(error);
    }
};

// ✅ Handle PayHere Notify Webhook
export const handlePayHereNotify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        console.log('🔔 Received PayHere Notify:', req.body);

        // This endpoint logic is moved to service
        await subscriptionService.processPayHereNotify(req.body);

        // Always return 200 to PayHere to stop retries if hash was valid
        res.status(200).send('OK');
    } catch (error: any) {
        console.error('❌ Error in PayHere Notify:', error.message);
        // Still return 200/OK if it's a known error to stop retries, 
        // OR return error if you want PayHere to retry. 
        // Usually better to return 200 if we logged the error.
        res.status(200).send('Error Processed');
    }
};

export const subscribePlan = async (req: Request, res: Response) => {
    try {
        const { email, planId } = req.body;

        if (!email || !planId) {
            return res.status(400).json({
                success: false,
                message: 'Email and planId are required',
            });
        }

        const result = await subscriptionService.subscribeUserToPlan(email, planId);

        return res.status(200).json({
            success: true,
            message: 'Plan subscribed successfully',
            data: result,
        });
    } catch (error: any) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
