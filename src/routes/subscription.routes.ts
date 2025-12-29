// src/routes/subscription.routes.ts
import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// ✅ PUT THIS LINE **BEFORE** router.use(protect)
router.post('/subscribe', subscriptionController.subscribePlan);

// NOW apply protection to routes below
router.use(protect);

// These routes are protected (need login)
router.put('/upgrade', subscriptionController.upgrade);
router.post('/addon', subscriptionController.addAddon);

export default router;