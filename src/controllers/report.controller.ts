import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import sendResponse from '../utils/responseHandler';

/**
 * Get Company Payroll Summary
 * GET /api/v1/reports/company-payroll-summary?companyId={UUID}&month={MM}&year={YYYY}
 */
const getCompanyPayrollSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { companyId, month, year } = req.query;

        const data = await reportService.getCompanyPayrollSummary(
            userId,
            companyId as string,
            parseInt(month as string),
            parseInt(year as string)
        );

        sendResponse(res, 200, true, 'Company payroll summary retrieved successfully', data);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        sendResponse(res, statusCode, false, error.message);
    }
};

/**
 * Get Employee Payroll Summary
 * GET /api/v1/reports/employee-payroll-summary?employeeId={UUID}&companyId={UUID}&year={YYYY}
 */
const getEmployeePayrollSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { employeeId, companyId, year } = req.query;

        const data = await reportService.getEmployeePayrollSummary(
            userId,
            employeeId as string,
            companyId as string,
            parseInt(year as string)
        );

        sendResponse(res, 200, true, 'Employee payroll summary retrieved successfully', data);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        sendResponse(res, statusCode, false, error.message);
    }
};

/**
 * Get Selected Employees Payroll Summary
 * POST /api/v1/reports/selected-employees-summary
 * Body: { companyId, employeeIds[], month, year }
 */
const getSelectedEmployeesSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { companyId, employeeIds, month, year } = req.body;

        const data = await reportService.getSelectedEmployeesSummary(
            userId,
            companyId,
            employeeIds,
            month,
            year
        );

        sendResponse(res, 200, true, 'Selected employees summary retrieved successfully', data);
    } catch (error: any) {
        const statusCode = error.statusCode || 500;
        sendResponse(res, statusCode, false, error.message);
    }
};

export { getCompanyPayrollSummary, getEmployeePayrollSummary, getSelectedEmployeesSummary };
