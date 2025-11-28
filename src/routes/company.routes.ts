import express from 'express';
import * as companyController from '../controllers/company.controller';
import { updateCompanyValidation } from '../validations/company.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Protect all company routes
router.use(protect);

router.post('/', companyController.create);
router.get('/', companyController.getAll);
router.get('/:id', companyController.getProfile);
router.put('/:id', updateCompanyValidation, validate, companyController.updateProfile);

export default router;
