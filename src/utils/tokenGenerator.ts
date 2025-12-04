import crypto from 'crypto';

export const generateVerificationToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

export const generateTokenExpiry = (minutes: number = 15): Date => {
    return new Date(Date.now() + minutes * 60 * 1000);
};
