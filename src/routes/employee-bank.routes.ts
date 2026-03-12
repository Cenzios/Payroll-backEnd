import express from 'express';
import * as bankController from '../controllers/employee-bank.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/:employeeId', bankController.getBankDetails);
router.post('/:employeeId', bankController.manageBankDetails);

export default router;
