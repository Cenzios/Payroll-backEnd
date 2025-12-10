import express from 'express';
import passport from '../config/passport';
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
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);
router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.FRONTEND_URL}/login`,
    }),
    (req, res) => {
        // @ts-ignore
        const { user, token } = req.user;

        const redirectUrl = `${process.env.FRONTEND_URL}/google-auth-success?token=${token}`;
        res.redirect(redirectUrl);
    }
);

export default router;
