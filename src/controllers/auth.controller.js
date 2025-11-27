const authService = require('../services/auth.service');
const sendResponse = require('../utils/responseHandler');
const { generateToken } = require('../utils/tokenUtils');

const register = async (req, res, next) => {
    try {
        const result = await authService.registerUser(req.body);

        // Generate token for registered user
        const token = generateToken({
            userId: result.user.id,
            role: result.user.role
        });

        sendResponse(res, 201, true, 'User registered successfully', {
            user: result.user,
            plan: result.plan,
            subscription: result.subscription,
            token: token
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);

        // Generate JWT token
        const token = generateToken({
            userId: result.user.id,
            role: result.user.role
        });

        sendResponse(res, 200, true, 'Login successful', {
            user: result.user,
            token: token
        });
    } catch (error) {
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
