import { Request, Response, NextFunction } from 'express';
import * as subscriptionService from '../services/subscription.service';
import sendResponse from '../utils/responseHandler';

const upgrade = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

const addAddon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export { upgrade, addAddon };
