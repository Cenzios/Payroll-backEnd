import { Request } from 'express';

/**
 * Safely extracts the real client IP address from the request.
 * Prioritizes the 'x-forwarded-for' header and falls back to socket remoteAddress.
 */
export const getClientIp = (req: Request): string => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        // x-forwarded-for can be a string or an array of strings. 
        // We take the first IP, which is the original client's IP.
        const forwardedIp = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
        return forwardedIp.trim();
    }
    return req.socket.remoteAddress || 'unknown';
};
