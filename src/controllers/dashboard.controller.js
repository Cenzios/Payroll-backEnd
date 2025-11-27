const dashboardService = require('../services/dashboard.service');
const sendResponse = require('../utils/responseHandler');

const getSummary = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const summary = await dashboardService.getSummary(userId);
        sendResponse(res, 200, true, 'Dashboard summary fetched', summary);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSummary,
};
