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

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        if (existingUser.isEmailVerified) {
            throw new Error('User with this email already exists');
        }
        const emailVerifyToken = generateVerificationToken();
        const emailVerifyExpiry = generateTokenExpiry(parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRES || '15'));

        try {
            await sendVerificationEmail(email, emailVerifyToken);
        } catch (emailError) {
            throw new Error('Failed to send verification email. Please try again later.');
        }

        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                emailVerifyToken,
                emailVerifyExpiry,
            },
        });

        return { success: true, message: 'Verification email resent. Please check your inbox.' };
    }

    const emailVerifyToken = generateVerificationToken();
    const emailVerifyExpiry = generateTokenExpiry(parseInt(process.env.EMAIL_VERIFY_TOKEN_EXPIRES || '15'));

    try {
        await sendVerificationEmail(email, emailVerifyToken);
    } catch (emailError) {
        throw new Error('Failed to send verification email. Please check your email address and try again.');
    }

    const user = await prisma.user.create({
        data: {
            fullName,
            email,
            password: null,
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

    // ✅ First check if user is already verified
    const alreadyVerified = await prisma.user.findFirst({
        where: {
            isEmailVerified: true,
            email: {
                in: await prisma.user.findMany({
                    where: { emailVerifyToken: token },
                    select: { email: true }
                }).then(users => users.map(u => u.email))
            }
        }
    });

    if (alreadyVerified) {
        console.log('User already verified:', alreadyVerified.email);
        return {
            success: true,
            message: 'Email already verified. You can now set your password.'
        };
    }

    // Find user by token
    const user = await prisma.user.findFirst({
        where: {
            emailVerifyToken: token,
            emailVerifyExpiry: {
                gt: new Date(),
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

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

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

export { startSignup, verifyEmail, setPassword, login };