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
