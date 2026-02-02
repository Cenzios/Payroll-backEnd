import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { getClientIp } from '../utils/requestUtils';

export const auditLog = (req: Request, res: Response, next: NextFunction) => {
    // 1. SKIP READ OPERATIONS
    if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
        return next();
    }

    // 2. LISTEN FOR RESPONSE FINISH
    // We bind to 'finish' to get the final status code
    res.on('finish', async () => {
        try {
            // 3. EXTRACT INFO
            // Logic to perform best-effort audit logging
            // We ignore errors here to not crash the application if logging fails

            const userId = (req as any).user?.userId;
            const loginSessionId = (req as any).loginSessionId;

            // Basic Info
            const method = req.method;
            const originalUrl = req.originalUrl;
            // Clean URL query params for "endpoint" field if desired, but originalUrl is usually fine

            // Resource Detection (Best Effort)
            const parts = originalUrl.split('/').filter(p => p && p !== 'api' && p !== 'v1');
            let resourceType = parts.length > 0 ? parts[0] : 'unknown';

            // Try to find an ID in params or URL
            let resourceId = req.params.id || null;
            if (!resourceId) {
                // Heuristic: check if the last part of URL resembles an ID (uuid or int)
                const lastPart = parts[parts.length - 1];
                if (lastPart && (lastPart.match(/^[0-9]+$/) || lastPart.length > 20)) {
                    resourceId = lastPart;
                }
            }

            // Action Name
            const action = `${method}_${resourceType.toUpperCase()}`;

            // IP & User Agent
            const ipAddress = getClientIp(req) || 'unknown'; // getClientIp should already be robust
            const userAgent = req.headers['user-agent'] || 'unknown';
            const statusCode = res.statusCode;

            // 4. INSERT INTO DB
            await prisma.auditLog.create({
                data: {
                    userId: userId || null,
                    loginSessionId: loginSessionId || null,
                    action: action,
                    httpMethod: method,
                    endpoint: originalUrl, // Full URL with query params
                    resourceType: resourceType,
                    resourceId: resourceId,
                    ipAddress: ipAddress,
                    userAgent: userAgent,
                    statusCode: statusCode
                }
            });

        } catch (error) {
            // Fail silently for audit logging
            console.error('⚠️ Audit Logging Failed:', error);
        }
    });

    next();
};
