import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';

const router = express.Router();

// ✅ Public route - Get all plans with correct pricing
router.get('/', subscriptionController.getAllPlans);

export default router;
