import prisma from '../config/db';

interface CompanyData {
    name: string;
    email: string;
    address: string;
    contactNumber: string;
    departments: string[];
}

const createCompany = async (userId: string, data: CompanyData) => {
    // 1. Get User's Active Subscription & Plan with Add-ons
    const subscription = await prisma.subscription.findFirst({
        where: {
            userId,
            status: 'ACTIVE',
        },
        include: {
            plan: true,
            addons: true
        },
    });

    if (!subscription) {
        throw new Error('No active subscription found. Please upgrade your plan.');
    }

    // 2. Count existing companies
    const companyCount = await prisma.company.count({
        where: { ownerId: userId },
    });

    // 3. Calculate company add-on capacity
    const addonCompanyCapacity = subscription.addons
        .filter(addon => addon.type === 'COMPANY_EXTRA')
        .reduce((sum, addon) => sum + addon.value, 0);

    // 4. Calculate final company limit
    const finalCompanyLimit = subscription.plan.maxCompanies + addonCompanyCapacity;

    // 5. Check Limit
    if (companyCount >= finalCompanyLimit) {
        throw new Error(
            `Company limit reached (${finalCompanyLimit}). ` +
            `Plan allows ${subscription.plan.maxCompanies}, ` +
            `add-ons provide ${addonCompanyCapacity} extra. ` +
            `Upgrade your plan to add more companies.`
        );
    }

    // 6. Create Company
    const {
        name,
        email,
        address,
        contactNumber,
        departments,
    } = data;

    return await prisma.company.create({
        data: {
            name,
            email,
            address,
            contactNumber,
            departments,
            ownerId: userId,
        },
    });
};

const getCompanies = async (userId: string) => {
    return await prisma.company.findMany({
        where: { ownerId: userId },
    });
};

const getCompanyProfile = async (userId: string, companyId: string) => {
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

const updateCompanyProfile = async (userId: string, companyId: string, data: Partial<CompanyData>) => {
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

export { createCompany, getCompanies, getCompanyProfile, updateCompanyProfile };
