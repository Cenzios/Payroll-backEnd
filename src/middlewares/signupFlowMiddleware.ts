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
// Check subscription status and enforce strict payment blocking
import { getSubscriptionAccessStatus } from '../services/subscription.service';

export const requireActiveSubscription = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        // 1. Check Access Status (Computed based on invoices)
        const { status, message } = await getSubscriptionAccessStatus(userId);

        // 2. Enforce Blocking on Write Operations
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

        if (status === 'BLOCKED' && isWriteOperation) {
            res.status(403).json({
                success: false,
                code: 'SUBSCRIPTION_BLOCKED',
                message: message || 'Subscription access is blocked. Please renew your plan.',
            });
            return;
        }

        // 3. Populate req.subscription (Best Effort)
        // We find the most relevant subscription (ACTIVE or PENDING/EXPIRED if that's what we have)
        // so controllers can still access plan details if needed (e.g. for read-only displays).
        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                // If blocked, they might be technically 'ACTIVE' in DB but unpaid, or 'EXPIRED'.
                // We broaden the search to include statuses that might validly exist for a user who is "Blocked" but exists.
                status: { in: ['ACTIVE', 'PENDING_ACTIVATION', 'EXPIRED', 'FAILED'] }
            },
            include: {
                plan: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!subscription) {
            // Strictly speaking, if they have no subscription record at all, they shouldn't access anything.
            sendResponse(res, 403, false, 'No subscription found.');
            return;
        }

        // Attach subscription to request
        req.subscription = subscription;
        next();
    } catch (error) {
        next(error);
    }
};
