const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middlewares/errorMiddleware');

// Route Imports
const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/company.routes');
const employeeRoutes = require('./routes/employee.routes');
const salaryRoutes = require('./routes/salary.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/salary', salaryRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Payroll API is running...');
});

// Error Handler
app.use(errorHandler);

module.exports = app;
