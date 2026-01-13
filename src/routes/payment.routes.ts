import express from 'express';
import * as paymentController from '../controllers/payment.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// ✅ Public Routes
// PayHere Notify Webhook (MUST be public)
router.post('/payhere/notify', paymentController.handlePayHereNotify);

// ✅ Protected Routes
router.use(protect);

// Create Payment Intent
router.post('/intents', paymentController.createIntent);

// Get Intent Status
router.get('/intents/:id', paymentController.getIntent);

// Get PayHere Payload for Intent
router.get('/intents/:id/payhere', paymentController.getPayHerePayload);

export default router;
