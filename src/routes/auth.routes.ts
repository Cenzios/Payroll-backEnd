import express from 'express';
import * as authController from '../controllers/auth.controller';
import {
    startSignupValidation,
    verifyEmailValidation,
    setPasswordValidation,
    loginValidation
} from '../validations/auth.validation';
import validate from '../middlewares/validateRequest';

const router = express.Router();

router.post('/start-signup', startSignupValidation, validate, authController.startSignup);
router.get('/verify-email', verifyEmailValidation, validate, authController.verifyEmail);
router.post('/set-password', setPasswordValidation, validate, authController.setPassword);
router.post('/login', loginValidation, validate, authController.login);

export default router;
