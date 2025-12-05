import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { generateVerificationToken, generateTokenExpiry } from '../utils/tokenGenerator';
import { sendVerificationEmail } from './emailService';

interface StartSignupData {
    fullName: string;
    email: string;
}

const startSignup = async (data: StartSignupData) => {
    const { fullName, email } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        // If user exists and is verified, block
        if (existingUser.isEmailVerified) {
            throw new Error('User with this email already exists');
        }
        // If user exists but not verified, resend verification email
        const emailVerifyToken = generateVerificationToken();
        const emailVerifyExpiry = generateTokenExpiry(parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRES || '15'));

        // Try to send email FIRST
        try {
            await sendVerificationEmail(email, emailVerifyToken);
        } catch (emailError) {
            throw new Error('Failed to send verification email. Please try again later.');
        }

        // Update the existing user with new token AFTER email is sent
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                emailVerifyToken,
                emailVerifyExpiry,
            },
        });

        return { success: true, message: 'Verification email resent. Please check your inbox.' };
    }

    // Generate token
    const emailVerifyToken = generateVerificationToken();
    const emailVerifyExpiry = generateTokenExpiry(parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRES || '15'));

    // IMPORTANT: Try to send email FIRST before saving to database
    try {
        await sendVerificationEmail(email, emailVerifyToken);
    } catch (emailError) {
        // If email fails, don't create the user
        throw new Error('Failed to send verification email. Please check your email address and try again.');
    }

    // Only create user if email was sent successfully
    const user = await prisma.user.create({
        data: {
            fullName,
            email,
            password: null, // Password set later
            role: 'ADMIN',
            isEmailVerified: false,
            emailVerifyToken,
            emailVerifyExpiry,
            isPasswordSet: false,
        },
    });

    console.log('User created successfully:', {
        id: user.id,
        email: user.email,
        tokenLength: emailVerifyToken.length,
        expiresAt: emailVerifyExpiry
    });

    return { success: true, message: 'Verification email sent. Please check your inbox.' };
};

const verifyEmail = async (token: string) => {
    console.log('Verifying token:', {
        token,
        tokenLength: token.length,
        currentTime: new Date()
    });

    // Find user by token
    const user = await prisma.user.findFirst({
        where: {
            emailVerifyToken: token,
            emailVerifyExpiry: {
                gt: new Date(), // Check if expiry is in the future
            },
        },
    });

    console.log('User found:', user ? {
        id: user.id,
        email: user.email,
        tokenMatch: user.emailVerifyToken === token,
        expiryValid: user.emailVerifyExpiry && user.emailVerifyExpiry > new Date()
    } : 'No user found');

    if (!user) {
        // Check if token exists but expired
        const expiredUser = await prisma.user.findFirst({
            where: {
                emailVerifyToken: token,
            },
        });

        if (expiredUser) {
            throw new Error('Verification token has expired. Please request a new verification email.');
        }

        throw new Error('Invalid or expired verification token');
    }

    // Update user status
    await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerifyToken: null,
            emailVerifyExpiry: null,
        },
    });

    console.log('Email verified successfully for:', user.email);

    return { success: true, message: 'Email verified successfully. You can now set your password.' };
};

const setPassword = async (email: string, password: string) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error('User not found');
    }

    if (!user.isEmailVerified) {
        throw new Error('Email not verified');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            isPasswordSet: true,
        },
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

    // Check verification status
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

    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword };
};

export { startSignup, verifyEmail, setPassword, login };