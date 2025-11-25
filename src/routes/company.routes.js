const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const { updateCompanyValidation } = require('../validations/company.validation');
const validate = require('../middlewares/validateRequest');


// router.use(protect); // All routes protected

router.get('/profile', companyController.getProfile);
router.put('/profile', updateCompanyValidation, validate, companyController.updateProfile);

module.exports = router;
