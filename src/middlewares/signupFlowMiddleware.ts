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

export const requireActiveSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    console.log('══════════════════════════════════════');
    console.log('🔥 requireActiveSubscription HIT');
    console.log('➡️ METHOD:', req.method);
    console.log('➡️ URL:', req.originalUrl);

    try {
        const userId = req.user?.userId;
        console.log('👤 USER ID:', userId);

        if (!userId) {
            console.log('❌ NO USER ID IN REQUEST');
            res.status(401).json({ success: false, message: 'User not authenticated' });
            return;
        }

        // 1️⃣ Check computed subscription access status
        console.log('🔍 Checking subscription access status...');
        const { status, message } = await getSubscriptionAccessStatus(userId);
        console.log('📦 COMPUTED ACCESS STATUS:', status);
        if (message) console.log('💬 STATUS MESSAGE:', message);

        // 2️⃣ Determine write operation
        const isWriteOperation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);
        console.log('✍️ IS WRITE OPERATION:', isWriteOperation);

        // 3️⃣ Enforce strict blocking
        if (status === 'BLOCKED' && isWriteOperation) {
            console.log('⛔ BLOCKING REQUEST DUE TO UNPAID INVOICE');

            res.status(403).json({
                success: false,
                code: 'SUBSCRIPTION_BLOCKED',
                message: message || 'Subscription access is blocked. Please renew your plan.',
            });
            return;
        }

        console.log('✅ ACCESS ALLOWED');

        // 4️⃣ Attach subscription (best-effort)
        console.log('🔗 Fetching subscription record...');
        const subscription = await prisma.subscription.findFirst({
            where: {
                userId,
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
            console.log('❌ NO SUBSCRIPTION RECORD FOUND');
            res.status(403).json({ success: false, message: 'No subscription found.' });
            return;
        }

        console.log('📄 SUBSCRIPTION FOUND:', {
            id: subscription.id,
            status: subscription.status,
            plan: subscription.plan?.name
        });

        req.subscription = subscription;
        console.log('➡️ Passing control to next middleware/controller');
        next();
    } catch (error) {
        console.error('💥 ERROR IN requireActiveSubscription:', error);
        next(error);
    }
};
