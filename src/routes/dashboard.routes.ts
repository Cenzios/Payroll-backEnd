import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/summary', dashboardController.getSummary);

export default router;
