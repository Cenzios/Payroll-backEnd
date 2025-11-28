import { Request, Response, NextFunction } from 'express';
import * as employeeService from '../services/employee.service';
import sendResponse from '../utils/responseHandler';

const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { companyId, ...data } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const employee = await employeeService.createEmployee(userId, companyId, data);
        sendResponse(res, 201, true, 'Employee created successfully', employee);
    } catch (error) {
        next(error);
    }
};

const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { companyId, page, limit, search } = req.query;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const result = await employeeService.getEmployees(
            userId,
            companyId as string,
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10,
            search as string || ''
        );
        sendResponse(res, 200, true, 'Employees fetched successfully', result);
    } catch (error) {
        next(error);
    }
};

const getOne = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { companyId } = req.query;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const employee = await employeeService.getEmployeeById(userId, companyId as string, req.params.id);
        if (!employee) {
            sendResponse(res, 404, false, 'Employee not found');
            return;
        }
        sendResponse(res, 200, true, 'Employee details fetched', employee);
    } catch (error) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { companyId, ...data } = req.body;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        const employee = await employeeService.updateEmployee(userId, companyId, req.params.id, data);
        sendResponse(res, 200, true, 'Employee updated successfully', employee);
    } catch (error) {
        next(error);
    }
};

const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user?.userId;
        const { companyId } = req.query;

        if (!userId) {
            sendResponse(res, 401, false, 'User not authenticated');
            return;
        }

        if (!companyId) {
            sendResponse(res, 400, false, 'companyId is required');
            return;
        }

        await employeeService.deleteEmployee(userId, companyId as string, req.params.id);
        sendResponse(res, 200, true, 'Employee deleted successfully');
    } catch (error) {
        next(error);
    }
};

export { create, getAll, getOne, update, remove };
