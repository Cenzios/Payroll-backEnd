const { body } = require('express-validator');

const updateCompanyValidation = [
    body('name').optional().notEmpty().withMessage('Company Name cannot be empty'),
    body('employeeEPFPercentage').optional().isFloat({ min: 0, max: 100 }),
    body('employerEPFPercentage').optional().isFloat({ min: 0, max: 100 }),
    body('etfPercentage').optional().isFloat({ min: 0, max: 100 }),
    body('salaryType').optional().isIn(['DAILY', 'MONTHLY']),
];

module.exports = {
    updateCompanyValidation,
};
