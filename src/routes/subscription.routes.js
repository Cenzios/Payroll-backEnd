const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription.controller');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.put('/upgrade', subscriptionController.upgrade);

module.exports = router;
