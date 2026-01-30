import { query, body } from 'express-validator';

/**
 * Validation for Company Payroll Summary API
 * Accepts date range: startMonth/startYear to endMonth/endYear
 */
const companyPayrollSummaryValidation = [
    query('companyId')
        .notEmpty()
        .withMessage('Company ID is required')
        .isUUID()
        .withMessage('Company ID must be a valid UUID'),

    query('startMonth')
        .notEmpty()
        .withMessage('Start month is required')
        .isInt({ min: 1, max: 12 })
        .withMessage('Start month must be between 1 and 12'),

    query('startYear')
        .notEmpty()
        .withMessage('Start year is required')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('Start year must be a valid 4-digit year'),

    query('endMonth')
        .notEmpty()
        .withMessage('End month is required')
        .isInt({ min: 1, max: 12 })
        .withMessage('End month must be between 1 and 12'),

    query('endYear')
        .notEmpty()
        .withMessage('End year is required')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('End year must be a valid 4-digit year'),
];

/**
 * Validation for Employee Payroll Summary API
 */
const employeePayrollSummaryValidation = [
    query('employeeId')
        .notEmpty()
        .withMessage('Employee ID is required')
        .isUUID()
        .withMessage('Employee ID must be a valid UUID'),

    query('companyId')
        .notEmpty()
        .withMessage('Company ID is required')
        .isUUID()
        .withMessage('Company ID must be a valid UUID'),

    query('year')
        .notEmpty()
        .withMessage('Year is required')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('Year must be a valid 4-digit year'),
];

/**
 * Validation for Selected Employees Summary API
 */
const selectedEmployeesSummaryValidation = [
    body('companyId')
        .notEmpty()
        .withMessage('Company ID is required')
        .isUUID()
        .withMessage('Company ID must be a valid UUID'),

    body('employeeIds')
        .isArray({ min: 1 })
        .withMessage('Employee IDs must be a non-empty array'),

    body('employeeIds.*')
        .isUUID()
        .withMessage('Each employee ID must be a valid UUID'),

    body('month')
        .isInt({ min: 1, max: 12 })
        .withMessage('Month must be between 1 and 12'),

    body('year')
        .isInt({ min: 2000, max: 2100 })
        .withMessage('Year must be a valid 4-digit year'),
];

export { companyPayrollSummaryValidation, employeePayrollSummaryValidation, selectedEmployeesSummaryValidation };
