import { body } from 'express-validator';

const createEmployeeValidation = [
    body('fullName').notEmpty().withMessage('Full Name is required'),
    body('address').optional({ values: 'falsy' }).trim(),
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('contactNumber').notEmpty().withMessage('Contact Number is required'),
    body('joinedDate').isISO8601().toDate().withMessage('Valid Joined Date is required'),
    body('designation').optional({ values: 'falsy' }).trim(),
    body('department').default('General'),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Valid Email is required'),
    body('basicSalary').isFloat({ min: 0 }).withMessage('Basic Salary must be a positive number'),
    body('salaryType').optional().isIn(['DAILY', 'MONTHLY']).withMessage('Salary type must be DAILY or MONTHLY'),
    body('otRate').optional().isFloat({ min: 0 }).withMessage('OT Rate must be a positive number'),
    body('epfEnabled').optional().isBoolean(),
    body('epfNumber').optional({ values: 'falsy' }).trim(),
    body('epfEtfAmount').optional().isFloat({ min: 0 }),
    body('allowanceEnabled').optional().isBoolean(),
    body('deductionEnabled').optional().isBoolean(),
    body('employeeNIC').optional({ values: 'falsy' }).trim(),
    body('recurringAllowances').optional().isArray(),
    body('recurringAllowances.*.type').optional().notEmpty().withMessage('Allowance type is required'),
    body('recurringAllowances.*.amount').optional().isFloat({ min: 0 }).withMessage('Allowance amount must be positive'),
    body('recurringDeductions').optional().isArray(),
    body('recurringDeductions.*.type').optional().notEmpty().withMessage('Deduction type is required'),
    body('recurringDeductions.*.amount').optional().isFloat({ min: 0 }).withMessage('Deduction amount must be positive'),
];

const updateEmployeeValidation = [
    body('fullName').optional().notEmpty(),
    body('joinedDate').optional().isISO8601().toDate(),
    body('basicSalary').optional().isFloat({ min: 0 }),
    body('salaryType').optional().isIn(['DAILY', 'MONTHLY']),
    body('designation').optional({ values: 'falsy' }).trim(),
    body('address').optional({ values: 'falsy' }).trim(),
    body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Valid Email is required'),
    body('epfEnabled').optional().isBoolean(),
    body('epfNumber').optional({ values: 'falsy' }).trim(),
    body('epfEtfAmount').optional().isFloat({ min: 0 }),
    body('allowanceEnabled').optional().isBoolean(),
    body('deductionEnabled').optional().isBoolean(),
    body('employeeNIC').optional({ values: 'falsy' }).trim(),
];

export { createEmployeeValidation, updateEmployeeValidation };
