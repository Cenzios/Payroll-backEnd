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
// In auth.routes.ts
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
    '/google/callback',
    passport.authenticate('google', { session: false }),
    (req: any, res) => {
        // This is where we get the result from done()
        const { token, isNewUser } = req.user;

        // Now redirect with query params
        const redirectUrl = isNewUser
            ? `${process.env.FRONTEND_URL}/set-company?token=${token}&new=true`
            : `${process.env.FRONTEND_URL}/dashboard?token=${token}`;

        console.log(`🔀 Redirecting Google OAuth user:`, {
            isNewUser,
            redirectUrl: redirectUrl.replace(token, 'TOKEN_HIDDEN')
        });

        res.redirect(redirectUrl);
    }
);

export default router;
