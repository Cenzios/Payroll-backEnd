import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { protect } from '../middlewares/authMiddleware';
import { requireActiveSubscription } from '../middlewares/signupFlowMiddleware';

const router = express.Router();

router.use(protect);

router.get('/summary', requireActiveSubscription, dashboardController.getSummary);
router.get('/salary-trend', requireActiveSubscription, dashboardController.getSalaryTrend);

export default router;
