import express from 'express';
import * as subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.put('/upgrade', subscriptionController.upgrade);
router.post('/addon', subscriptionController.addAddon);
router.post('/subscribe', subscriptionController.subscribePlan);

export default router;
