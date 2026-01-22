import express from 'express';
import * as paymentController from '../controllers/payment.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// ✅ Public Routes
// Stripe Webhook (MUST be public)
router.post('/stripe/webhook', paymentController.handleStripeWebhook);

// ✅ Protected Routes
router.use(protect);

// Create Payment Intent
router.post('/intents', paymentController.createIntent);

// Get Intent Status
router.get('/intents/:id', paymentController.getIntent);

// Renew Monthly Subscription
router.post('/renew-monthly', paymentController.renewMonthlySubscription);

export default router;
