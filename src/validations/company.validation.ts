import { body } from 'express-validator';

const updateCompanyValidation = [
    body('name').optional().notEmpty().withMessage('Company Name cannot be empty'),
];

export { updateCompanyValidation };
