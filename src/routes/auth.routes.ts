import express from 'express';
import passport from '../config/passport';
import * as authController from '../controllers/auth.controller';
import * as authService from '../services/auth.service';
import {
    startSignupValidation,
    verifyEmailValidation,
    setPasswordValidation,
    loginValidation,
    updateProfileValidation,
    changePasswordValidation
} from '../validations/auth.validation';
import validate from '../middlewares/validateRequest';
import { protect } from '../middlewares/authMiddleware';

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

        // ✅ LOG SUCCESSFUL GOOGLE LOGIN SESSION
        // We need to decode the token or fetch user details again if req.user doesn't have them
        // But req.user returned from done() only has token and isNewUser.
        // We can decode the token to get the user ID and email.
        const decoded: any = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        const userId = decoded.userId;
        const email = decoded.email;

        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Run async logging
        (async () => {
            await authService.logUserSession(userId, email, ip, userAgent).catch(err => console.error('Session log error:', err));
        })();

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

// Protected routes
router.put('/profile', protect, updateProfileValidation, validate, authController.updateProfile);
router.post('/change-password', protect, changePasswordValidation, validate, authController.changePassword);
router.post('/logout', protect, authController.logout);

export default router;
