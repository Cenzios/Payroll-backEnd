const employeeService = require('../services/employee.service');
const sendResponse = require('../utils/responseHandler');

const create = async (req, res, next) => {
    try {
        const employee = await employeeService.createEmployee(req.user.companyId, req.body);
        sendResponse(res, 201, true, 'Employee created successfully', employee);
    } catch (error) {
        next(error);
    }
};

const getAll = async (req, res, next) => {
    try {
        const { page, limit, search } = req.query;
        const result = await employeeService.getEmployees(req.user.companyId, page, limit, search);
        sendResponse(res, 200, true, 'Employees fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

const getOne = async (req, res, next) => {
    try {
        const employee = await employeeService.getEmployeeById(req.user.companyId, req.params.id);
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
        const employee = await employeeService.updateEmployee(req.user.companyId, req.params.id, req.body);
        sendResponse(res, 200, true, 'Employee updated successfully', employee);
    } catch (error) {
        next(error);
    }
};

const remove = async (req, res, next) => {
    try {
        await employeeService.deleteEmployee(req.user.companyId, req.params.id);
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
