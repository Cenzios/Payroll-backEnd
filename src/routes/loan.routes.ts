import express from 'express';
import * as loanController from '../controllers/loan.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/', loanController.getLoans);
router.get('/:id', loanController.getLoanById);
router.post('/', loanController.createLoan);

export default router;
