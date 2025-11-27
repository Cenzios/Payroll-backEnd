const { body } = require('express-validator');

const registerValidation = [
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
