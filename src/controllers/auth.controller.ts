import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import sendResponse from '../utils/responseHandler';
import { generateToken } from '../utils/tokenUtils'; // ✅ USE THIS

const startSignup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await authService.startSignup(req.body);
        sendResponse(res, 200, true, result.message, { signupToken: result.signupToken });
    } catch (error) {
        next(error);
    }
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;
        const result = await authService.verifyEmail(token as string);
        sendResponse(res, 200, true, result.message, { email: result.email });
    } catch (error: any) {
        if (error.message === 'Invalid verification link' ||
            error.message === 'Verification link has expired. Please sign up again.') {
            sendResponse(res, 400, false, error.message);
            return;
        }
        next(error);
    }
};

const setPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { signupToken, password } = req.body;
        const result = await authService.setPassword(signupToken, password);
        sendResponse(res, 200, true, result.message);
    } catch (error) {
        next(error);
    }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const result = await authService.login(email, password);

        // ✅ GENERATE JWT TOKEN WITH FULL USER DATA
        const token = generateToken({
            userId: result.user.id,
            role: result.user.role,
            fullName: result.user.fullName, // ✅ ADD
            email: result.user.email         // ✅ ADD
        });

        sendResponse(res, 200, true, 'Login successful', {
            user: result.user,
            token: token,
            hasActivePlan: result.hasActivePlan
        });
    } catch (error: any) {
        if (error.message === 'Invalid credentials' ||
            error.message === 'Please verify your email before logging in' ||
            error.message === 'Please set your password before logging in') {
            sendResponse(res, 401, false, error.message);
            return;
        }
        next(error);
    }
};

const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }
        const result = await authService.updateProfile(userId, req.body);
        sendResponse(res, 200, true, 'Profile updated successfully', result);
    } catch (error) {
        next(error);
    }
};

const changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }
        const result = await authService.changePassword(userId, req.body);
        sendResponse(res, 200, true, result.message);
    } catch (error: any) {
        if (error.message === 'Current password is incorrect') {
            sendResponse(res, 400, false, error.message);
            return;
        }
        next(error);
    }
};

export { startSignup, verifyEmail, setPassword, login, updateProfile, changePassword };