const { validationResult } = require('express-validator');
const sendResponse = require('../utils/responseHandler');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return sendResponse(res, 400, false, 'Validation Error', errors.array());
    }
    next();
};

module.exports = validate;
