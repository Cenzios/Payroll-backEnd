const { body } = require('express-validator');

const createEmployeeValidation = [
    body('fullName').notEmpty().withMessage('Full Name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('nic').notEmpty().withMessage('NIC is required'),
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('contactNumber').notEmpty().withMessage('Contact Number is required'),
    body('joinedDate').isISO8601().toDate().withMessage('Valid Joined Date is required'),
    body('designation').notEmpty().withMessage('Designation is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('dailyRate').isFloat({ min: 0 }).withMessage('Daily Rate must be positive'),
    body('otRate').isFloat({ min: 0 }).withMessage('OT Rate must be positive'),
];

const updateEmployeeValidation = [
    body('fullName').optional().notEmpty(),
    body('joinedDate').optional().isISO8601().toDate(),
    body('dailyRate').optional().isFloat({ min: 0 }),
];

module.exports = {
    createEmployeeValidation,
    updateEmployeeValidation,
};
