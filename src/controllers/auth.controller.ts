import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import sendResponse from '../utils/responseHandler';
import { generateToken } from '../utils/tokenUtils';

const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        if (error.message === 'Invalid credentials') {
            sendResponse(res, 401, false, error.message);
            return;
        }
        next(error);
    }
};

export { register, login };
