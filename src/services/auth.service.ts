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
        // If user exists but not verified, we could resend token, 
        // but for now we'll just throw error as per "block duplicate" requirement
        throw new Error('User with this email already exists. Please verify your email.');
    }

    // Generate token
    const emailVerifyToken = generateVerificationToken();
    const emailVerifyExpiry = generateTokenExpiry(parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRES || '15'));

    // Create User with minimal data
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

    // Send Verification Email
    await sendVerificationEmail(email, emailVerifyToken);

    return { success: true, message: 'Verification email sent. Please check your inbox.' };
};

const verifyEmail = async (token: string) => {
    // Find user by token
    const user = await prisma.user.findFirst({
        where: {
            emailVerifyToken: token,
            emailVerifyExpiry: {
                gt: new Date(), // Check if expiry is in the future
            },
        },
    });

    if (!user) {
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

    return { success: true, message: 'Email verified successfully' };
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
