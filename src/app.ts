import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import errorHandler from './middlewares/errorMiddleware';

// Route Imports
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import employeeRoutes from './routes/employee.routes';
import salaryRoutes from './routes/salary.routes';
import subscriptionRoutes from './routes/subscription.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';

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
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);

// Health Check
app.get('/', (req: Request, res: Response) => {
    res.send('Payroll API is running...');
});

// Error Handler
app.use(errorHandler);

export default app;
