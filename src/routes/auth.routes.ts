import express from 'express';
import * as authController from '../controllers/auth.controller';
import { registerValidation, loginValidation } from '../validations/auth.validation';
import validate from '../middlewares/validateRequest';

const router = express.Router();

router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);

export default router;
