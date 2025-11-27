const companyService = require('../services/company.service');
const sendResponse = require('../utils/responseHandler');

const create = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const company = await companyService.createCompany(userId, req.body);
        sendResponse(res, 201, true, 'Company created successfully', company);
    } catch (error) {
        next(error);
    }
};

const getAll = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const companies = await companyService.getCompanies(userId);
        sendResponse(res, 200, true, 'Companies fetched successfully', companies);
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const companyId = req.params.id; // Now comes from params

        const company = await companyService.getCompanyProfile(userId, companyId);
        if (!company) {
            return sendResponse(res, 404, false, 'Company not found');
        }
        sendResponse(res, 200, true, 'Company profile fetched', company);
    } catch (error) {
        if (error.message === 'Not authorized to view this company') {
            return sendResponse(res, 403, false, error.message);
        }
        next(error);
    }
};

const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const companyId = req.params.id;

        const company = await companyService.updateCompanyProfile(userId, companyId, req.body);
        sendResponse(res, 200, true, 'Company profile updated', company);
    } catch (error) {
        if (error.message === 'Not authorized to update this company') {
            return sendResponse(res, 403, false, error.message);
        }
        next(error);
    }
};

module.exports = {
    create,
    getAll,
    getProfile,
    updateProfile,
};