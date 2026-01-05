import express from 'express';
import * as salaryController from '../controllers/salary.controller';
import { calculateSalaryValidation } from '../validations/salary.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';
import { checkPlanFeature } from '../middlewares/planMiddleware';
import { requireActiveSubscription } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

// All salary routes require authentication and ACTIVE subscription
router.use(protect);
router.use(requireActiveSubscription);

router.post('/', calculateSalaryValidation, validate, salaryController.calculate);
router.post('/calculate', calculateSalaryValidation, validate, salaryController.calculate);
router.get('/history', checkPlanFeature('canViewReports'), salaryController.getHistory);
router.get('/:id/payslip', salaryController.getPayslip);

export default router;
