import express from 'express';
import * as employeeController from '../controllers/employee.controller';
import { createEmployeeValidation, updateEmployeeValidation } from '../validations/employee.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';
import { requireActiveSubscription } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

// All employee routes require authentication and ACTIVE subscription
router.use(protect);
router.use(requireActiveSubscription);

router.post('/', createEmployeeValidation, validate, employeeController.create);
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getOne);
router.put('/:id', updateEmployeeValidation, validate, employeeController.update);
router.delete('/:id', employeeController.remove);

export default router;
