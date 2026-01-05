// src/routes/subscription.routes.ts
import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middlewares/authMiddleware';
import { requireEmailVerified, requirePasswordSet } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

// ✅ Public route - Subscribe (legacy, will be replaced by select-plan)
router.post('/subscribe', subscriptionController.subscribePlan);

// NOW apply protection to routes below
router.use(protect);

// ✅ New secure plan selection (requires email verified + password set)
router.post(
    '/select-plan',
    requireEmailVerified,
    subscriptionController.selectPlan
);

// ✅ Temporary activation endpoint (until payment integration)
router.post('/activate', subscriptionController.activatePending);

// Existing protected routes
router.get('/current', subscriptionController.getCurrent);
router.post('/change-plan', subscriptionController.changePlan);
router.put('/upgrade', subscriptionController.upgrade);
router.post('/addon', subscriptionController.addAddon);

export default router;