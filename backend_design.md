# Backend Architecture Design - Payroll Management System

## 1. Clean Architecture Folder Structure

We will use a **Layered Architecture** (Controller-Service-Repository) to ensure separation of concerns, scalability, and maintainability.

```text
payroll-backend/
├── src/
│   ├── config/              # Configuration files (DB, Logger, Env)
│   ├── constants/           # Global constants (Enums, Error Messages)
│   ├── controllers/         # Handles HTTP requests & responses (No business logic)
│   ├── middlewares/         # Express middlewares (Auth, Validation, ErrorHandler)
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic layer (Calculations, Complex flows)
│   ├── repositories/        # Data access layer (Direct Prisma calls)
│   ├── utils/               # Utility functions (Helpers, Formatters)
│   ├── validations/         # Request validation schemas (express-validator)
│   ├── app.js               # Express App setup (Middleware wiring)
│   └── server.js            # Entry point (Port listening)
├── prisma/
│   └── schema.prisma        # Database schema definition
├── tests/                   # Unit and Integration tests
├── .env                     # Environment variables
├── .gitignore
├── package.json
└── README.md
```

## 2. Dependencies

### Production Dependencies
Run the following command to install core dependencies:
```bash
npm install express prisma @prisma/client jsonwebtoken bcryptjs express-validator dotenv cors helmet morgan winston
```

**Optional/As Needed:**
```bash
npm install multer # For file uploads (if needed later)
```

### Development Dependencies
```bash
npm install --save-dev nodemon jest supertest
```

## 3. Folder Explanations

- **`config/`**: Centralizes configuration. E.g., `db.js` for Prisma client instance, `logger.js` for Winston setup.
- **`controllers/`**: Receives `req`, calls the appropriate `service`, and sends `res`. Does not know about SQL/Prisma.
- **`services/`**: Contains the "Brain" of the application. Handles salary calculations, tax logic, and coordinates multiple repository calls.
- **`repositories/`**: The only layer that touches the database (Prisma). Abstracting this allows for easier testing and potential ORM swaps.
- **`middlewares/`**:
    - `authMiddleware.js`: Verifies JWT and extracts `user` and `companyId`.
    - `errorMiddleware.js`: Centralized error handling.
    - `validationMiddleware.js`: Runs express-validator rules.
- **`routes/`**: Defines endpoints (e.g., `POST /api/v1/employees`) and maps them to controllers.
- **`validations/`**: Defines validation rules (e.g., `employeeValidation.js` checks if `nic` is valid).
- **`utils/`**: Pure functions like `calculateNetSalary(basic, allowances)` or `generateToken(payload)`.

## 4. Required Environment Variables

Create a `.env` file with the following:

```ini
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
DATABASE_URL="postgresql://user:password@localhost:5432/payroll_db?schema=public"

# Security / Auth
JWT_SECRET="your_super_secret_key_change_this"
JWT_EXPIRES_IN="1d"
BCRYPT_SALT_ROUNDS=10

# CORS
CORS_ORIGIN="http://localhost:3000"
```

## 5. Multi-tenant SaaS Plan (Company Isolation)

To ensure data security and isolation between different companies using the SaaS platform:

### Strategy: Row-Level Isolation
Every major entity in the database will have a `companyId` foreign key.

1.  **Database Schema**:
    - `Company` table (The tenant root).
    - `Employee`, `Salary`, `Department`, `User` (Admin) tables MUST have a `companyId` column.

2.  **Authentication & Context**:
    - When an Admin logs in, their JWT token will contain `{ userId, companyId, role }`.
    - The `authMiddleware` will attach `req.user.companyId` to the request object.

3.  **Repository Layer Enforcement**:
    - **Strict Rule**: Every database query (find, create, update, delete) in the repositories MUST include `where: { companyId: req.user.companyId }`.
    - This prevents Company A from ever accessing Company B's employees.

**Example Repository Call:**
```javascript
// findEmployeeById.js
const findEmployeeById = async (id, companyId) => {
  return await prisma.employee.findFirst({
    where: {
      id: id,
      companyId: companyId // CRITICAL: Always enforce this
    }
  });
};
```

## 6. Technology List

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Recommended for relational data/payroll) or MySQL.
- **ORM**: Prisma (Type-safe database access).
- **Auth**: JWT (JSON Web Tokens) for stateless authentication.
- **Security**:
    - `bcryptjs`: Password hashing.
    - `helmet`: HTTP header security.
    - `cors`: Cross-Origin Resource Sharing.
- **Validation**: `express-validator`.
- **Logging**: `winston` (Structured logging).
