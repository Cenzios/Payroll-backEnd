import { Request, Response, NextFunction } from 'express';
import * as payrollConfigService from '../services/payroll-config.service';
import sendResponse from '../utils/responseHandler';

/**
 * Create a new payroll rates configuration
 */
const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = {
            effectiveFrom: new Date(req.body.effectiveFrom),
            taxFreeMonthlyLimit: parseFloat(req.body.taxFreeMonthlyLimit),
            slab1Limit: parseFloat(req.body.slab1Limit),
            slab1Rate: parseFloat(req.body.slab1Rate),
            slab2Limit: parseFloat(req.body.slab2Limit),
            slab2Rate: parseFloat(req.body.slab2Rate),
            slab3Limit: parseFloat(req.body.slab3Limit),
            slab3Rate: parseFloat(req.body.slab3Rate),
            slab4Limit: parseFloat(req.body.slab4Limit),
            slab4Rate: parseFloat(req.body.slab4Rate),
            slab5Rate: parseFloat(req.body.slab5Rate),
            employeeEPFRate: parseFloat(req.body.employeeEPFRate),
            employerEPFRate: parseFloat(req.body.employerEPFRate),
            etfRate: parseFloat(req.body.etfRate),
        };

        const payrollRates = await payrollConfigService.createPayrollRates(data);
        sendResponse(res, 201, true, 'Payroll rates configuration created successfully', payrollRates);
    } catch (error) {
        next(error);
    }
};

/**
 * Get the currently active payroll rates configuration
 */
const getActive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const activeRates = await payrollConfigService.getActivePayrollRates();
        sendResponse(res, 200, true, 'Active payroll rates configuration fetched', activeRates);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all payroll rates configurations
 */
const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const allRates = await payrollConfigService.getAllPayrollRates();
        sendResponse(res, 200, true, 'All payroll rates configurations fetched', allRates);
    } catch (error) {
        next(error);
    }
};

/**
 * Update a payroll rates configuration
 */
const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const updateData: any = {};

        if (req.body.effectiveFrom) updateData.effectiveFrom = new Date(req.body.effectiveFrom);
        if (req.body.taxFreeMonthlyLimit) updateData.taxFreeMonthlyLimit = parseFloat(req.body.taxFreeMonthlyLimit);
        if (req.body.slab1Limit) updateData.slab1Limit = parseFloat(req.body.slab1Limit);
        if (req.body.slab1Rate) updateData.slab1Rate = parseFloat(req.body.slab1Rate);
        if (req.body.slab2Limit) updateData.slab2Limit = parseFloat(req.body.slab2Limit);
        if (req.body.slab2Rate) updateData.slab2Rate = parseFloat(req.body.slab2Rate);
        if (req.body.slab3Limit) updateData.slab3Limit = parseFloat(req.body.slab3Limit);
        if (req.body.slab3Rate) updateData.slab3Rate = parseFloat(req.body.slab3Rate);
        if (req.body.slab4Limit) updateData.slab4Limit = parseFloat(req.body.slab4Limit);
        if (req.body.slab4Rate) updateData.slab4Rate = parseFloat(req.body.slab4Rate);
        if (req.body.slab5Rate) updateData.slab5Rate = parseFloat(req.body.slab5Rate);
        if (req.body.employeeEPFRate) updateData.employeeEPFRate = parseFloat(req.body.employeeEPFRate);
        if (req.body.employerEPFRate) updateData.employerEPFRate = parseFloat(req.body.employerEPFRate);
        if (req.body.etfRate) updateData.etfRate = parseFloat(req.body.etfRate);
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

        const updatedRates = await payrollConfigService.updatePayrollRates(id, updateData);
        sendResponse(res, 200, true, 'Payroll rates configuration updated successfully', updatedRates);
    } catch (error) {
        next(error);
    }
};

export { create, getActive, getAll, update };
