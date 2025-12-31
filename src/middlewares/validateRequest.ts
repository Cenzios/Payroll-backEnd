import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import sendResponse from '../utils/responseHandler';

const validate = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        sendResponse(res, 400, false, 'Validation Error', errors.array());
        return;
    }
    next();
};

export default validate;
