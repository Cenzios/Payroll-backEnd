import { body, query } from 'express-validator';

const startSignupValidation = [
    body('fullName').notEmpty().withMessage('Full Name is required'),
    body('email').isEmail().withMessage('Valid Email is required'),
];

const verifyEmailValidation = [
    query('token').notEmpty().withMessage('Verification token is required'),
];

const setPasswordValidation = [
    body('email').isEmail().withMessage('Valid Email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
    body('email').isEmail().withMessage('Valid Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
    body('fullName').notEmpty().withMessage('Full Name is required'),
];

const changePasswordValidation = [
    body('currentPassword').notEmpty().withMessage('Current Password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New Password must be at least 6 characters'),
];

export {
    startSignupValidation,
    verifyEmailValidation,
    setPasswordValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation
};
