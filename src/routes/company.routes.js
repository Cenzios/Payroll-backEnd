const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { updateCompanyValidation } = require('../validations/company.validation');
const validate = require('../middlewares/validateRequest');
const { protect } = require('../middlewares/authMiddleware');

// Protect all company routes
router.use(protect);

router.post('/', companyController.create);
router.get('/', companyController.getAll);
router.get('/:id', companyController.getProfile);
router.put('/:id', updateCompanyValidation, validate, companyController.updateProfile);

module.exports = router;