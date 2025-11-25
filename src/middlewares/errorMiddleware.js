const sendResponse = require('../utils/responseHandler');

const errorHandler = (err, req, res, next) => {
    console.error(err.stack);

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Server Error';

    // Prisma specific errors (optional refinement)
    if (err.code === 'P2002') {
        statusCode = 400;
        message = 'Duplicate field value entered';
    }

    sendResponse(res, statusCode, false, message);
};

module.exports = errorHandler;
