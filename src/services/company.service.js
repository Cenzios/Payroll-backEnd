const prisma = require('../config/db');

const createCompany = async (userId, data) => {
    // 1. Get User's Active Subscription & Plan
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
        include: { plan: true },
    });

    if (!subscription) {
        throw new Error('No active subscription found. Please upgrade your plan.');
    }

    // 2. Count existing companies
    const companyCount = await prisma.company.count({
        where: { ownerId: userId },
    });

    // 3. Check Limit
    if (companyCount >= subscription.plan.maxCompanies) {
        throw new Error(`Company limit reached (${subscription.plan.maxCompanies}). Upgrade your plan to add more companies.`);
    }

    // 4. Create Company
    const {
        name,
        registrationNumber,
        address,
        contactNumber,
    } = data;

    return await prisma.company.create({
        data: {
            name,
            registrationNumber,
            address,
            contactNumber,
            ownerId: userId,
        },
    });
};

const getCompanies = async (userId) => {
    return await prisma.company.findMany({
        where: { ownerId: userId },
    });
};

const getCompanyProfile = async (userId, companyId) => {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        return null;
    }

    if (company.ownerId !== userId) {
        throw new Error('Not authorized to view this company');
    }

    return company;
};

const updateCompanyProfile = async (userId, companyId, data) => {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
    });

    if (!company) {
        throw new Error('Company not found');
    }

    if (company.ownerId !== userId) {
        throw new Error('Not authorized to update this company');
    }

    return await prisma.company.update({
        where: { id: companyId },
        data: data,
    });
};

module.exports = {
    createCompany,
    getCompanies,
    getCompanyProfile,
    updateCompanyProfile,
};
