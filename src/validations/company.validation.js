const { body } = require('express-validator');

const updateCompanyValidation = [
    body('name').optional().notEmpty().withMessage('Company Name cannot be empty'),
];

module.exports = {
    updateCompanyValidation,
};
