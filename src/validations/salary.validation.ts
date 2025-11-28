import { body } from 'express-validator';

const calculateSalaryValidation = [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Valid month (1-12) is required'),
    body('year').isInt({ min: 2000 }).withMessage('Valid year is required'),
    body('workingDays').isInt({ min: 0 }).withMessage('Working days must be a positive integer'),
    body('bonus').optional().isFloat({ min: 0 }),
];

export { calculateSalaryValidation };
