const salaryService = require('../services/salary.service');
const sendResponse = require('../utils/responseHandler');

const calculate = async (req, res, next) => {
    try {
        const salary = await salaryService.calculateAndSaveSalary(req.user.companyId, req.body);
        sendResponse(res, 201, true, 'Salary calculated and saved successfully', salary);
    } catch (error) {
        next(error);
    }
};

const getHistory = async (req, res, next) => {
    try {
        const { employeeId } = req.query;
        const history = await salaryService.getSalaryHistory(req.user.companyId, employeeId);
        sendResponse(res, 200, true, 'Salary history fetched', history);
    } catch (error) {
        next(error);
    }
};

const getPayslip = async (req, res, next) => {
    try {
        const payslip = await salaryService.getPayslip(req.user.companyId, req.params.id);
        sendResponse(res, 200, true, 'Payslip details fetched', payslip);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    calculate,
    getHistory,
    getPayslip,
};
