const subscriptionService = require('../services/subscription.service');
const sendResponse = require('../utils/responseHandler');

const upgrade = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { planId } = req.body;

        if (!planId) {
            return sendResponse(res, 400, false, 'planId is required');
        }

        const subscription = await subscriptionService.upgradeSubscription(userId, planId);
        sendResponse(res, 200, true, 'Plan upgraded successfully', subscription);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    upgrade,
};
