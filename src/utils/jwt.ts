import jwt from 'jsonwebtoken';

export const signToken = (userId: string, role: string, fullName: string, email: string) => {
    return jwt.sign(
        { userId, role, fullName, email },
        process.env.JWT_SECRET as string,
        { expiresIn: '1d' }
    );
};
