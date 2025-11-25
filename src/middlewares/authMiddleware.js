const { verifyToken } = require('../utils/tokenUtils');
const sendResponse = require('../utils/responseHandler');

const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return sendResponse(res, 401, false, 'Not authorized to access this route');
    }

    try {
        const decoded = verifyToken(token);
        req.user = decoded; // Contains userId, companyId, role
        next();
    } catch (err) {
        return sendResponse(res, 401, false, 'Not authorized to access this route');
    }
};

module.exports = { protect };
