const companyService = require('../services/company.service');
const sendResponse = require('../utils/responseHandler');

const getProfile = async (req, res, next) => {
    try {
        const company = await companyService.getCompanyProfile(req.user.companyId);
        if (!company) {
            return sendResponse(res, 404, false, 'Company not found');
        }
        sendResponse(res, 200, true, 'Company profile fetched', company);
    } catch (error) {
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const company = await companyService.updateCompanyProfile(req.user.companyId, req.body);
        sendResponse(res, 200, true, 'Company profile updated', company);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProfile,
    updateProfile,
};
