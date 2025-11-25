const prisma = require('../config/db');

const getCompanyProfile = async (companyId) => {
    return await prisma.company.findUnique({
        where: { id: companyId },
    });
};

const updateCompanyProfile = async (companyId, data) => {
    return await prisma.company.update({
        where: { id: companyId },
        data: data,
    });
};

module.exports = {
    getCompanyProfile,
    updateCompanyProfile,
};
