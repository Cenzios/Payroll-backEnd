const bcrypt = require('bcryptjs');
const prisma = require('../config/db');

const registerCompany = async (data) => {
    const {
        companyName,
        registrationNumber,
        address,
        contactNumber,
        email,
        password,
        employeeEPFPercentage,
        employerEPFPercentage,
        etfPercentage,
        salaryType,
    } = data;

    // Check if company or user already exists
    const existingCompany = await prisma.company.findUnique({
        where: { registrationNumber },
    });
    if (existingCompany) {
        throw new Error('Company with this registration number already exists');
    }

    const existingUser = await prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Transaction to create Company and Admin User
    const result = await prisma.$transaction(async (prisma) => {
        const company = await prisma.company.create({
            data: {
                name: companyName,
                registrationNumber,
                address,
                contactNumber,
                employeeEPFPercentage: employeeEPFPercentage || 8.0,
                employerEPFPercentage: employerEPFPercentage || 12.0,
                etfPercentage: etfPercentage || 3.0,
                salaryType: salaryType || 'MONTHLY',
            },
        });

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: 'ADMIN',
                companyId: company.id,
            },
        });

        // Remove password before returning
        const { password: _, ...userWithoutPassword } = user;

        return { company, user: userWithoutPassword };
    });

    return { user: result.user, company: result.company };
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
    registerCompany,
    login,
};