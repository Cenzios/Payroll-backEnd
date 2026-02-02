import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { getClientIp } from '../utils/requestUtils';
import { getLocationFromIP } from '../utils/clientInfo';
import { createNotification } from '../services/notification.service';

export const auditLog = async (req: Request, res: Response, next: NextFunction) => {
    // 1. SKIP READ OPERATIONS
    if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
        return next();
    }

    // 2. IMPOSSIBLE TRAVEL CHECK (Fire and forget)
    const checkImpossibleTravel = async () => {
        try {
            const userId = (req as any).user?.userId;
            const loginSessionId = (req as any).loginSessionId;
            const ipAddress = getClientIp(req) || 'unknown';

            if (userId && loginSessionId && ipAddress !== 'unknown') {
                // Get current location
                const currentLocation = await getLocationFromIP(ipAddress);

                // Get Session Location
                const session = await prisma.userLoginSession.findUnique({
                    where: { id: loginSessionId }
                });

                // Compare locations if both are known and available
                if (session && session.country && currentLocation.country &&
                    session.country !== 'Unknown' && currentLocation.country !== 'Unknown') {

                    if (session.country !== currentLocation.country) {
                        // IMPOSSIBLE TRAVEL DETECTED
                        console.warn(`🚨 Impossible travel detected for user ${userId}. Session: ${session.country}, Current: ${currentLocation.country}`);

                        await createNotification(
                            userId,
                            'Suspicious Activity Detected',
                            `Action performed from ${currentLocation.country} while logged in from ${session.country}.`,
                            'WARNING'
                        );
                    }
                }
            }
        } catch (err) {
            console.error('Error checking impossible travel:', err);
        }
    };

    // Execute check without awaiting (non-blocking)
    checkImpossibleTravel();

    // 3. AUDIT LOGGING
    // We bind to 'finish' to get the final status code
    res.on('finish', async () => {
        try {
            // EXTRACT INFO
            const userId = (req as any).user?.userId;
            const loginSessionId = (req as any).loginSessionId;

            // Basic Info
            const method = req.method;
            const originalUrl = req.originalUrl;

            // Resource Detection (Best Effort)
            const parts = originalUrl.split('/').filter(p => p && p !== 'api' && p !== 'v1');
            let resourceType = parts.length > 0 ? parts[0] : 'unknown';

            // Try to find an ID in params or URL
            let resourceId = req.params.id || null;
            if (!resourceId) {
                // Heuristic: check if the last part of URL resembles an ID
                const lastPart = parts[parts.length - 1];
                if (lastPart && (lastPart.match(/^[0-9]+$/) || lastPart.length > 20)) {
                    resourceId = lastPart;
                }
            }

            // Action Name
            const action = `${method}_${resourceType.toUpperCase()}`;

            // IP & User Agent
            const ipAddress = getClientIp(req) || 'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            const statusCode = res.statusCode;

            // INSERT INTO DB
            await prisma.auditLog.create({
                data: {
                    userId: userId || null,
                    loginSessionId: loginSessionId || null,
                    action: action,
                    httpMethod: method,
                    endpoint: originalUrl,
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
