import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import sendResponse from '../utils/responseHandler';

const validate = (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // ✅ LOG VALIDATION ERRORS IN DETAIL
        console.log('═══════════════════════════════════════');
        console.log('❌ VALIDATION ERROR');
        console.log('═══════════════════════════════════════');
        console.log('URL:', req.originalUrl);
        console.log('Method:', req.method);
        console.log('Query Params:', req.query);
        console.log('Body:', req.body);
        console.log('Validation Errors:', JSON.stringify(errors.array(), null, 2));
        console.log('═══════════════════════════════════════\n');
        
        sendResponse(res, 400, false, 'Validation Error', errors.array());
        return;
    }
    next();
};

export default validate;