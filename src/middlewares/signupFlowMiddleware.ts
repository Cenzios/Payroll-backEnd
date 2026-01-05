import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import sendResponse from '../utils/responseHandler';

// Check email is verified
export const requireEmailVerified = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isEmailVerified: true }
        });

        if (!user?.isEmailVerified) {
            sendResponse(res, 403, false, 'Please verify your email first');
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Check password is set
export const requirePasswordSet = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isPasswordSet: true }
        });

        if (!user?.isPasswordSet) {
            sendResponse(res, 403, false, 'Please set your password first');
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Check subscription exists (PENDING_ACTIVATION or ACTIVE)
export const requireSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: { in: ['PENDING_ACTIVATION', 'ACTIVE'] }
            }
        });

        if (!subscription) {
            sendResponse(res, 403, false, 'No subscription found. Please select a plan.');
            return;
        }

        next();
    } catch (error) {
        next(error);
    }
};

// Check subscription is ACTIVE
export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                status: 'ACTIVE'
            },
            include: {
                plan: true
            }
        });

        if (!subscription) {
            sendResponse(res, 403, false, 'Please activate your subscription to continue');
            return;
        }

        // Attach subscription to request for use in controllers
        req.subscription = subscription;
        next();
    } catch (error) {
        next(error);
    }
};
