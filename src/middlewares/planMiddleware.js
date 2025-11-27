const prisma = require('../config/db');
const sendResponse = require('../utils/responseHandler');

const checkPlanFeature = (featureName) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId;

            // Get Active Subscription & Plan
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'ACTIVE',
                },
                include: { plan: true },
            });

            if (!subscription) {
                return sendResponse(res, 403, false, 'No active subscription found. Please upgrade your plan.');
            }

            const features = subscription.plan.features || {};

            // Check if feature is enabled
            if (!features[featureName]) {
                return sendResponse(res, 403, false, `Upgrade plan to unlock ${featureName}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { checkPlanFeature };
