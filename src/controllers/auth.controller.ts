import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import sendResponse from '../utils/responseHandler';
import { generateToken } from '../utils/tokenUtils';

const startSignup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await authService.startSignup(req.body);
        sendResponse(res, 200, true, result.message);
    } catch (error) {
        next(error);
    }
};

const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { token } = req.query;
        const result = await authService.verifyEmail(token as string);
        sendResponse(res, 200, true, result.message);
    } catch (error: any) {
        if (error.message === 'Invalid or expired verification token' ||
            error.message === 'Verification token has expired. Please request a new verification email.') {
            sendResponse(res, 400, false, error.message);
            return;
        }
        next(error);
    }
};

const setPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const result = await authService.setPassword(email, password);
        sendResponse(res, 200, true, result.message);
    } catch (error) {
        next(error);
    }
};

const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export { startSignup, verifyEmail, setPassword, login };
