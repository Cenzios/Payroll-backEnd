const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

const registerUser = async (data) => {
    const {
        name,
        email,
        password,
        planId,
    } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
        where: { id: planId },
    });
    if (!plan) {
        throw new Error('Invalid plan selected');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Transaction to create User and Subscription
    const result = await prisma.$transaction(async (prisma) => {
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'ADMIN', // Default role for new signups
            },
        });

        // Create Subscription
        const subscription = await prisma.subscription.create({
            data: {
                userId: user.id,
                planId: plan.id,
                status: 'ACTIVE',
                startDate: new Date(),
                endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)), // Default 1 year
            },
        });

        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;

        return { user: userWithoutPassword, plan, subscription };
    });

    return result;
};

const login = async (email, password) => {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        throw new Error('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error('Invalid credentials');
    }

    // Remove password from user object before returning
    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword };
};

module.exports = {
    registerUser,
    login,
};