import { Request, Response } from 'express';
import * as reportService from '../services/report.service';
import sendResponse from '../utils/responseHandler';

/**
 * Get Company Payroll Summary
 * GET /api/v1/reports/company-payroll-summary?companyId={UUID}&startMonth={MM}&startYear={YYYY}&endMonth={MM}&endYear={YYYY}
 */
const getCompanyPayrollSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.userId;
        
        // ✅ LOG ALL REQUEST DETAILS
        console.log('═══════════════════════════════════════');
        console.log('📥 Company Payroll Summary Request');
        console.log('═══════════════════════════════════════');
        console.log('User ID:', userId);
        console.log('Query Params:', req.query);
        console.log('Headers:', {
            authorization: req.headers.authorization ? 'Present' : 'Missing',
            contentType: req.headers['content-type'],
            origin: req.headers.origin
        });
        console.log('Full URL:', req.originalUrl);
        console.log('Method:', req.method);
        console.log('═══════════════════════════════════════');
        
        if (!userId) {
            console.log('❌ No userId found');
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        const { companyId, startMonth, startYear, endMonth, endYear } = req.query;

        // ✅ LOG PARSED VALUES
        console.log('Parsed Parameters:', {
            companyId,
            startMonth,
            startYear,
            endMonth,
            endYear,
            types: {
                startMonth: typeof startMonth,
                startYear: typeof startYear,
                endMonth: typeof endMonth,
                endYear: typeof endYear
            }
        });

        const data = await reportService.getCompanyPayrollSummary(
            userId,
            companyId as string,
            parseInt(startMonth as string),
            parseInt(startYear as string),
            parseInt(endMonth as string),
            parseInt(endYear as string)
        );

        console.log('✅ Report generated successfully');
        console.log('═══════════════════════════════════════\n');
        sendResponse(res, 200, true, 'Company payroll summary retrieved successfully', data);
    } catch (error: any) {
        console.log('❌ Error in getCompanyPayrollSummary:', error.message);
        console.log('Error Stack:', error.stack);
        console.log('═══════════════════════════════════════\n');
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
