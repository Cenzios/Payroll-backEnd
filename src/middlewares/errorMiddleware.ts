import { Request, Response, NextFunction } from 'express';
import sendResponse from '../utils/responseHandler';

interface CustomError extends Error {
    statusCode?: number;
    code?: string;
}

const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction): void => {
    console.error(err.stack);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';

    // Prisma specific errors (optional refinement)
    if (err.code === 'P2002') {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    sendResponse(res, statusCode, false, message);
};

export default errorHandler;
