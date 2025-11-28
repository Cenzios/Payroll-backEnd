import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/tokenUtils';
import sendResponse from '../utils/responseHandler';

const protect = (req: Request, res: Response, next: NextFunction): void => {
    let token: string | undefined;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        sendResponse(res, 401, false, 'Not authorized to access this route');
        return;
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Contains userId, role
        next();
    } catch (err) {
        sendResponse(res, 401, false, 'Not authorized to access this route');
    }
};

export { protect };
