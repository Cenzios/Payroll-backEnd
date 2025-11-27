const express = require('express');
const router = express.Router();
const salaryController = require('../controllers/salary.controller');
const { calculateSalaryValidation } = require('../validations/salary.validation');
const validate = require('../middlewares/validateRequest');
const { protect } = require('../middlewares/authMiddleware');
const { checkPlanFeature } = require('../middlewares/planMiddleware');

// Protect all salary routes
router.use(protect);

router.post('/calculate', calculateSalaryValidation, validate, salaryController.calculate);
router.get('/history', checkPlanFeature('canViewReports'), salaryController.getHistory);
router.get('/:id/payslip', salaryController.getPayslip);

module.exports = router;