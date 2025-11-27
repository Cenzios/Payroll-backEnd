const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/summary', dashboardController.getSummary);

module.exports = router;
