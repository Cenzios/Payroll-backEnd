// src/routes/subscription.routes.ts
import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middlewares/authMiddleware';
import { requireEmailVerified, requirePasswordSet } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

// ✅ Public route - Subscribe (legacy, will be replaced by select-plan)
// ✅ Public route - PayHere Notify Webhook
router.post('/payhere/notify', subscriptionController.handlePayHereNotify);

// ✅ Public route - Get all plans
router.get('/', subscriptionController.getAllPlans);

// ✅ Public route - Subscribe (legacy, will be replaced by select-plan)
router.post('/subscribe', subscriptionController.subscribePlan);

// NOW apply protection to routes below
router.use(protect);

// ❌ DISABLED: Legacy PayHere Payment Session
router.post('/create-payment-session', (req, res) => {
    res.status(410).json({ success: false, message: 'This endpoint is deprecated. Use Payment Intents.' });
});

// ✅ New secure plan selection (requires email verified + password set)
router.post(
    '/select-plan',
    requireEmailVerified,
    subscriptionController.selectPlan
);

// Existing protected routes
router.get('/current', subscriptionController.getCurrent);
router.get('/active', subscriptionController.getActive);
router.post('/change-plan', subscriptionController.changePlan);
router.put('/upgrade', subscriptionController.upgrade);
router.post('/addon', subscriptionController.addAddon);
router.post('/cancel', subscriptionController.cancelSubscription);

export default router;