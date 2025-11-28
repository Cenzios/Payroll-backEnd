import { Request, Response, NextFunction } from 'express';
import * as salaryService from '../services/salary.service';
import sendResponse from '../utils/responseHandler';

const calculate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { companyId } = req.body;

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const salary = await salaryService.calculateAndSaveSalary(companyId, req.body);
        sendResponse(res, 201, true, 'Salary calculated and saved successfully', salary);
    } catch (error) {
        next(error);
    }
};

const getHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { employeeId, companyId } = req.query;

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const history = await salaryService.getSalaryHistory(companyId as string, employeeId as string);
        sendResponse(res, 200, true, 'Salary history fetched', history);
    } catch (error) {
        next(error);
    }
};

const getPayslip = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { companyId } = req.query;

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const payslip = await salaryService.getPayslip(companyId as string, req.params.id);
        sendResponse(res, 200, true, 'Payslip details fetched', payslip);
    } catch (error) {
        next(error);
    }
};

export { calculate, getHistory, getPayslip };
