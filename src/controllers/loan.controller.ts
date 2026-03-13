import { Request, Response } from 'express';
import * as loanService from '../services/loan.service';

export const createLoan = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.body;
        const loan = await loanService.createLoan(companyId, req.body);
        res.status(201).json(loan);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getLoans = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.query as { companyId: string };
        const loans = await loanService.getLoans(companyId);
        res.status(200).json(loans);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};

export const getLoanById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { companyId } = req.query as { companyId: string };
        const loan = await loanService.getLoanById(companyId, id);
        res.status(200).json(loan);
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
};
export const getPendingInstallments = async (req: Request, res: Response) => {
    try {
        const { companyId, employeeId, month, year } = req.query;

        if (!companyId || !employeeId || !month || !year) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        const installments = await loanService.getPendingInstallments(
            companyId as string,
            employeeId as string,
            parseInt(month as string),
            parseInt(year as string)
        );

        res.json(installments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getCompanyPendingInstallments = async (req: Request, res: Response) => {
    try {
        const { companyId, month, year } = req.query;

        if (!companyId || !month || !year) {
            return res.status(400).json({ message: 'Missing required parameters' });
        }

        const installments = await loanService.getCompanyPendingInstallments(
            companyId as string,
            parseInt(month as string),
            parseInt(year as string)
        );

        res.json(installments);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
