const { body } = require('express-validator');

const registerValidation = [
    body('companyName').notEmpty().withMessage('Company Name is required'),
    body('registrationNumber').notEmpty().withMessage('Registration Number is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('contactNumber').notEmpty().withMessage('Contact Number is required'),
    body('email').isEmail().withMessage('Valid Email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
    body('email').isEmail().withMessage('Valid Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

module.exports = {
    registerValidation,
    loginValidation,
};
