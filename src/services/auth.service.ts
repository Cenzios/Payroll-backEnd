import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateVerificationToken, generateTokenExpiry } from '../utils/tokenGenerator';
import { sendVerificationEmail } from './emailService';
import jwt from 'jsonwebtoken';

interface StartSignupData {
    fullName: string;
    email: string;
}

const startSignup = async (data: StartSignupData) => {
    const { fullName, email } = data;

    // Check if user already exists with password set
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser && existingUser.isPasswordSet) {
        throw new Error('User with this email already exists');
    }

    // Generate verification token
    const emailVerifyToken = generateVerificationToken();

    // Create signed JWT containing signup data (NO DATABASE WRITE)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    const signupToken = jwt.sign(
        {
            fullName,
            email,
            verifyToken: emailVerifyToken
        },
        secret,
        { expiresIn: '24h' }
    );

    // Send verification email
    try {
        await sendVerificationEmail(email, signupToken);
    } catch (emailError) {
        throw new Error('Failed to send verification email. Please check your email address and try again.');
    }

    console.log('Signup verification email sent with JWT:', {
        email,
        tokenLength: signupToken.length
    });

    return {
        success: true,
        message: 'Verification email sent. Please check your inbox.',
        signupToken // Return JWT to frontend
    };
};

const verifyEmail = async (token: string) => {
    console.log('Verifying signup token:', {
        tokenLength: token.length,
        currentTime: new Date()
    });

    // Decode JWT to get signup data
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    let decoded: any;
    try {
        decoded = jwt.verify(token, secret);
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Verification link has expired. Please sign up again.');
        }
        throw new Error('Invalid verification link');
    }

    const { email, verifyToken } = decoded;

    if (!email || !verifyToken) {
        throw new Error('Invalid verification token');
    }

    console.log('Token verified successfully for:', email);

    // Just verify the token is valid, no database changes
    return {
        success: true,
        message: 'Email verified successfully. You can now set your password.',
        email // Return email for frontend convenience
    };
};

const setPassword = async (signupToken: string, password: string) => {
    // Decode JWT to get signup data
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }

    let decoded: any;
    try {
        decoded = jwt.verify(signupToken, secret);
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Signup session expired. Please sign up again.');
        }
        throw new Error('Invalid signup token');
    }

    const { fullName, email } = decoded;

    if (!fullName || !email) {
        throw new Error('Invalid signup token data');
    }

    // Check if user already exists with password
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser && existingUser.isPasswordSet) {
        throw new Error('User already exists. Please login instead.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // NOW create user record in database (FIRST TIME!)
    const user = await prisma.user.create({
        data: {
            fullName,
            email,
            password: hashedPassword,
            role: 'USER',
            isEmailVerified: true, // Already verified via JWT
            isPasswordSet: true,
        },
    });

    console.log('User created with password:', {
        id: user.id,
        email: user.email
    });

    return { success: true, message: 'Password set successfully. You can now login.' };
};

const login = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    if (!user.isEmailVerified) {
        throw new Error('Please verify your email before logging in');
    }

    if (!user.isPasswordSet || !user.password) {
        throw new Error('Please set your password before logging in');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // Check for active subscription
    const subscription = await prisma.subscription.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
    });

    const hasActivePlan = !!subscription;

    console.log(`📊 Login subscription check for ${email}:`, {
        userId: user.id,
        hasActivePlan,
        subscriptionId: subscription?.id || 'none'
    });

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, hasActivePlan };
};

const updateProfile = async (userId: string, data: { fullName: string }) => {
    return await prisma.user.update({
        where: { id: userId },
        data: { fullName: data.fullName },
        select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
        }
    });
};

const changePassword = async (userId: string, data: any) => {
    const { currentPassword, newPassword } = data;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.password) {
        throw new Error('User not found or password not set');
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
        throw new Error('Current password is incorrect');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
    });

    return { success: true, message: 'Password updated successfully' };
};

import { detectDevice, getLocationFromIP } from '../utils/clientInfo';

// Shared function to log user session (used in controller and passport callback)
const logUserSession = async (userId: string, email: string, ip: string, userAgent: string) => {
    try {
        const deviceInfo = detectDevice(userAgent);
        const locationInfo = await getLocationFromIP(ip);

        console.log('🌍 New Login Session:', {
            user: email,
            ip: locationInfo.ip,
            city: locationInfo.city,
            country: locationInfo.country,
            device: deviceInfo.device
        });

        await prisma.userLoginSession.create({
            data: {
                userId,
                ipAddress: locationInfo.ip || ip,
                userAgent,
                deviceType: deviceInfo.device,
                browser: deviceInfo.browser,
                os: deviceInfo.os,
                country: locationInfo.country,
                city: locationInfo.city,
                loginAt: new Date()
            }
        });
    } catch (err: any) {
        console.error('❌ Failed to save login session:', err.message);
    }
};

export { startSignup, verifyEmail, setPassword, login, updateProfile, changePassword, logUserSession };
