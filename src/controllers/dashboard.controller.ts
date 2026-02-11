import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import sendResponse from '../utils/responseHandler';

const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { companyId } = req.query;

        const summary = await dashboardService.getSummary(userId, companyId as string);
        sendResponse(res, 200, true, 'Dashboard summary fetched', summary);
    } catch (error) {
        next(error);
    }
};

const getSalaryTrend = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { companyId, range } = req.query;

        const trend = await dashboardService.getSalaryTrend(userId, companyId as string, range as string);
        sendResponse(res, 200, true, 'Salary trend fetched', trend);
    } catch (error) {
        next(error);
    }
};

export { getSummary, getSalaryTrend };
