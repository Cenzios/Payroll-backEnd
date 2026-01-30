import express from 'express';
import * as payrollConfigController from '../controllers/payroll-config.controller';
import { protect } from '../middlewares/authMiddleware';
import { requireActiveSubscription } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

// All payroll config routes require authentication and ACTIVE subscription
router.use(protect);
router.use(requireActiveSubscription);

// POST /api/v1/payroll-config - Create new payroll rates configuration
router.post('/', payrollConfigController.create);

// GET /api/v1/payroll-config/active - Get active payroll rates configuration
router.get('/active', payrollConfigController.getActive);

// GET /api/v1/payroll-config - Get all payroll rates configurations
router.get('/', payrollConfigController.getAll);

// PUT /api/v1/payroll-config/:id - Update payroll rates configuration
router.put('/:id', payrollConfigController.update);

export default router;
