import { Request, Response, NextFunction } from 'express';
import * as companyService from '../services/company.service';
import sendResponse from '../utils/responseHandler';

const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const company = await companyService.createCompany(userId, req.body);
        sendResponse(res, 201, true, 'Company created successfully', company);
    } catch (error) {
        next(error);
    }
};

const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const companies = await companyService.getCompanies(userId);
        sendResponse(res, 200, true, 'Companies fetched successfully', companies);
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const companyId = req.params.id;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const company = await companyService.getCompanyProfile(userId, companyId);
        if (!company) {
            sendResponse(res, 404, false, 'Company not found');
            return;
        }
        sendResponse(res, 200, true, 'Company profile fetched', company);
    } catch (error: any) {
        if (error.message === 'Not authorized to view this company') {
            sendResponse(res, 403, false, error.message);
            return;
        }
        next(error);
    }
};

const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const companyId = req.params.id;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const company = await companyService.updateCompanyProfile(userId, companyId, req.body);
        sendResponse(res, 200, true, 'Company profile updated', company);
    } catch (error: any) {
        if (error.message === 'Not authorized to update this company') {
            sendResponse(res, 403, false, error.message);
            return;
        }
        next(error);
    }
};

export { create, getAll, getProfile, updateProfile };
