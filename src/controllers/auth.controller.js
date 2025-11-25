const authService = require('../services/auth.service');
const sendResponse = require('../utils/responseHandler');

const register = async (req, res, next) => {
    try {
        const result = await authService.registerCompany(req.body);
        sendResponse(res, 201, true, 'Company registered successfully', result);
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);
        sendResponse(res, 200, true, 'Login successful', result);
    } catch (error) {
        // For security, don't expose exact error in production usually, but here we pass message
        if (error.message === 'Invalid credentials') {
            return sendResponse(res, 401, false, error.message);
        }
        next(error);
    }
};

module.exports = {
    register,
    login,
};
