import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import errorHandler from './middlewares/errorMiddleware';
import passport from './config/passport';

// Route Imports
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import employeeRoutes from './routes/employee.routes';
import salaryRoutes from './routes/salary.routes';
import subscriptionRoutes from './routes/subscription.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import payrollConfigRoutes from './routes/payroll-config.routes';
import notificationRoutes from './routes/notification.routes';
import paymentRoutes from './routes/payment.routes';
import planRoutes from './routes/plan.routes';

const app = express();

// Trust proxy for IP detection
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());

// ✅ Stripe Raw Body Parser (MUST BE BEFORE express.json)
app.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(passport.initialize());

// ✅ Audit Logging Middleware (After Auth/Parsers, Before Routes)
import { auditLog } from './middlewares/audit.middleware';
app.use(auditLog);

// Routes
app.use('/api/v1/auth', authRoutes);
// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/employee', employeeRoutes);
app.use('/api/v1/salary', salaryRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/payroll-config', payrollConfigRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/plans', planRoutes);


// Health Check
app.get('/', (req: Request, res: Response) => {
    res.send('Payroll API is running...');
});

// Error Handler
app.use(errorHandler);

export default app;
