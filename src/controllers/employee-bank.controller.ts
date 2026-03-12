import { Request, Response } from 'express';
import * as bankService from '../services/employee-bank.service';

export const manageBankDetails = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const { companyId } = req.body; // or from session/middleware
        const bankDetails = await bankService.createOrUpdateBankDetails(employeeId, companyId, req.body);
        res.status(200).json(bankDetails);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getBankDetails = async (req: Request, res: Response) => {
    try {
        const { employeeId } = req.params;
        const { companyId } = req.query as { companyId: string };
        const bankDetails = await bankService.getBankDetails(employeeId, companyId);
        res.status(200).json(bankDetails);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
