import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import sendResponse from '../utils/responseHandler';

const checkPlanFeature = (featureName: string) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = req.user?.userId;

            if (!userId) {
                sendResponse(res, 401, false, 'User not authenticated');
                return;
            }

            // Get Active Subscription & Plan with features
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE',
                },
                include: {
                    plan: {
                        include: {
                            features: true
                        }
                    }
                },
            });

            if (!subscription) {
                sendResponse(res, 403, false, 'No active subscription found. Please upgrade your plan.');
                return;
            }

            // Check if feature exists and is enabled in the PlanFeature table
            const feature = subscription.plan.features.find(
                f => f.featureName === featureName && f.isEnabled
            );

            if (!feature) {
                sendResponse(res, 403, false, `Upgrade plan to unlock ${featureName}`);
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

export { checkPlanFeature };
