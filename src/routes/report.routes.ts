import express from 'express';
import * as reportController from '../controllers/report.controller';
import {
    companyPayrollSummaryValidation,
    employeePayrollSummaryValidation
} from '../validations/report.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Protect all report routes - JWT authentication required
router.use(protect);

/**
 * GET /api/v1/reports/company-payroll-summary
 * Query params: companyId, month, year
 * Returns: Company payroll summary with employee list and totals
 */
router.get(
    '/company-payroll-summary',
    companyPayrollSummaryValidation,
    validate,
    reportController.getCompanyPayrollSummary
);

/**
 * GET /api/v1/reports/employee-payroll-summary
 * Query params: employeeId, year
 * Returns: Employee monthly breakdown and annual totals
 */
router.get(
    '/employee-payroll-summary',
    employeePayrollSummaryValidation,
    validate,
    reportController.getEmployeePayrollSummary
);

export default router;
