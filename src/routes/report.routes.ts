import express from 'express';
import * as reportController from '../controllers/report.controller';
import {
    companyPayrollSummaryValidation,
    employeePayrollSummaryValidation,
    selectedEmployeesSummaryValidation
} from '../validations/report.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Protect all report routes - JWT authentication required
router.use(protect);

/**
 * GET /api/v1/reports/company-payroll-summary
 * Query params: companyId, startMonth, startYear, endMonth, endYear
 * Returns: Company payroll summary grouped by month with overall totals
 */
router.get(
    '/company-payroll-summary',
    companyPayrollSummaryValidation,
    validate,
    reportController.getCompanyPayrollSummary
);

/**
 * GET /api/v1/reports/employee-payroll-summary
 * Query params: employeeId, companyId, year
 * Returns: Employee monthly breakdown and annual totals
 */
router.get(
    '/employee-payroll-summary',
    employeePayrollSummaryValidation,
    validate,
    reportController.getEmployeePayrollSummary
);

/**
 * POST /api/v1/reports/selected-employees-summary
 * Body: { companyId, employeeIds[], month, year }
 * Returns: Selected employees summary with metadata and totals
 */
router.post(
    '/selected-employees-summary',
    selectedEmployeesSummaryValidation,
    validate,
    reportController.getSelectedEmployeesSummary
);

export default router;
