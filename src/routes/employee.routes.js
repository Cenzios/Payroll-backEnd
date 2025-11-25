const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const { createEmployeeValidation, updateEmployeeValidation } = require('../validations/employee.validation');
const validate = require('../middlewares/validateRequest');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', createEmployeeValidation, validate, employeeController.create);
router.get('/', employeeController.getAll);
router.get('/:id', employeeController.getOne);
router.put('/:id', updateEmployeeValidation, validate, employeeController.update);
router.delete('/:id', employeeController.remove);

module.exports = router;
