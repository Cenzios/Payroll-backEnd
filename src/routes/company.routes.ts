import express from 'express';
import * as companyController from '../controllers/company.controller';
import { updateCompanyValidation } from '../validations/company.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';
import { requireActiveSubscription } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

// Protect all company routes
router.use(protect);

router.post('/', requireActiveSubscription, companyController.create);
// Other routes
router.get('/', requireActiveSubscription, companyController.getAll);
router.get('/:id', requireActiveSubscription, companyController.getProfile);
router.put('/:id', updateCompanyValidation, validate, companyController.updateProfile);

export default router;
