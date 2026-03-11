import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/tokenUtils';
import sendResponse from '../utils/responseHandler';

import prisma from '../config/db';

const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

        // Attach Login Session ID for Audit Log
        const session = await prisma.userLoginSession.findFirst({
            where: {
                userId: decoded.userId,
                logoutAt: null
            },
            orderBy: { loginAt: 'desc' }
        });

        if (session) {
            (req as any).loginSessionId = session.id;
        }

        next();
    } catch (err) {
        sendResponse(res, 401, false, 'Not authorized to access this route');
    }
};

export { protect };
