const employeeService = require('../services/employee.service');
const sendResponse = require('../utils/responseHandler');

const create = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { companyId, ...data } = req.body;

        if (!companyId) {
            return sendResponse(res, 400, false, 'companyId is required');
        }

        const employee = await employeeService.createEmployee(userId, companyId, data);
        sendResponse(res, 201, true, 'Employee created successfully', employee);
    } catch (error) {
        next(error);
    }
};

const getAll = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { companyId, page, limit, search } = req.query;

        if (!companyId) {
            return sendResponse(res, 400, false, 'companyId is required');
        }

        const result = await employeeService.getEmployees(userId, companyId, page, limit, search);
        sendResponse(res, 200, true, 'Employees fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

const getOne = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { companyId } = req.query; // Assuming companyId is passed as query param for getOne as well, or we could fetch it from employee if we didn't enforce strict hierarchy check first, but service enforces it.
        // Actually, for getOne, we usually just have ID. But to verify ownership efficiently without an extra DB call to find companyId first, passing companyId is helpful.
        // However, standard REST is GET /employees/:id.
        // If we want strict isolation, we need to know which company we are asking about, OR we find the employee and check if the user owns the company.
        // The service `getEmployeeById` takes `companyId`.
        // Let's require `companyId` in query for now to be consistent with strict isolation requirements and service signature.

        if (!companyId) {
            return sendResponse(res, 400, false, 'companyId is required');
        }

        const employee = await employeeService.getEmployeeById(userId, companyId, req.params.id);
        if (!employee) {
            return sendResponse(res, 404, false, 'Employee not found');
        }
        sendResponse(res, 200, true, 'Employee details fetched', employee);
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { companyId, ...data } = req.body; // companyId usually in body for updates too, or we can take from query. Let's assume body for consistency with create.

        if (!companyId) {
            return sendResponse(res, 400, false, 'companyId is required');
        }

        const employee = await employeeService.updateEmployee(userId, companyId, req.params.id, data);
        sendResponse(res, 200, true, 'Employee updated successfully', employee);
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        const userId = req.user.userId;
        const { companyId } = req.query; // DELETE usually doesn't have body, so query.

        if (!companyId) {
            return sendResponse(res, 400, false, 'companyId is required');
        }

        await employeeService.deleteEmployee(userId, companyId, req.params.id);
        sendResponse(res, 200, true, 'Employee deleted successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    create,
    getAll,
    getOne,
    update,
    remove,
};