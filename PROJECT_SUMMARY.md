# Money Manager - Project Summary

## 🎯 Project Overview

A complete full-stack personal finance and monthly salary allocation web application built to help users manage their finances effectively. The application allows users to track income, allocate budgets across different categories, record expenses, and analyze spending patterns through interactive dashboards.

## ✨ Key Features Implemented

### 1. Authentication & User Management
- JWT-based authentication system
- User registration and login
- Protected routes and middleware
- Password hashing with bcrypt

### 2. Budget Management System
- Monthly salary/income tracking
- Budget allocation across three main categories:
  - **Wants**: Non-essential expenses
  - **Needs**: Essential living expenses  
  - **Investments**: Savings and investments
- Custom expense reasons within each category
- Automatic calculation of remaining balance

### 3. Expense Tracking
- Create, read, update, delete transactions
- Link transactions to specific expense reasons
- Automatic budget allocation updates
- Monthly/yearly filtering capabilities

### 4. Dashboard & Analytics
- Real-time spending overview cards
- Category-wise spending breakdown
- Monthly spending comparisons
- Budget vs actual spending analysis
- Top spending reason identification
- Overspending alerts

### 5. Data Management
- Default categories and expense reasons
- Recurring expense support
- Data validation and error handling
- Comprehensive API endpoints

## 🏗️ Architecture & Technology Stack

### Backend (NestJS)
```
backend/
├── src/
│   ├── auth/              # JWT authentication
│   ├── categories/        # Category management
│   ├── config/           # Database configuration  
│   ├── dashboard/        # Analytics & reporting
│   ├── entities/         # TypeORM entities
│   ├── expense-reasons/  # Expense reason management
│   ├── monthly-budgets/  # Budget management
│   ├── transactions/     # Transaction management
│   ├── users/            # User management
│   └── seed/             # Database seeding
```

**Key Technologies:**
- NestJS framework with TypeScript
- PostgreSQL database
- TypeORM for database operations
- JWT for authentication
- Class-validator for input validation
- Passport.js for authentication strategies

### Frontend (React)
```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React context providers
│   ├── pages/            # Page components
│   ├── services/         # API service layer
│   ├── types/            # TypeScript definitions
│   └── styles/           # CSS and styling
```

**Key Technologies:**
- React with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- React Hook Form for form management
- Axios for HTTP requests
- React Context for state management
- Recharts for data visualization (planned)
- Lucide React for icons

## 📊 Database Design

### Entity Relationship Model
```
Users (1) ←→ (N) MonthlyBudgets ←→ (N) BudgetAllocations
                      ↓                    ↓
Categories (1) ←→ (N) ExpenseReasons ←→ (N) Transactions
```

### Key Tables
1. **users**: User account information
2. **categories**: Main spending categories (Wants, Needs, Investments)
3. **expense_reasons**: Specific reasons within categories
4. **monthly_budgets**: Monthly income and budget data
5. **budget_allocations**: Budget distribution to expense reasons
6. **transactions**: Individual spending records

## 🚀 Setup & Installation

### Prerequisites
- Node.js v16+
- PostgreSQL v12+
- npm or yarn

### Quick Start
1. **Database Setup**
   ```sql
   CREATE DATABASE money_manager;
   -- Username: postgres, Password: chandu
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run start:dev  # Runs on http://localhost:3001
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start  # Runs on http://localhost:3000
   ```

4. **Initialize Data**
   - POST `/api/categories/initialize`
   - POST `/api/expense-reasons/initialize`

## 🔧 API Documentation

### Core Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

#### Budget Management
- `GET /api/monthly-budgets` - List all budgets
- `POST /api/monthly-budgets` - Create monthly budget
- `GET /api/monthly-budgets/current` - Current month budget

#### Transaction Management
- `GET /api/transactions` - List transactions (with filters)
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

#### Dashboard Analytics
- `GET /api/dashboard/summary` - Complete dashboard data
- `GET /api/dashboard/yearly-trend` - Yearly spending trend
- `GET /api/dashboard/category-yearly` - Category-wise yearly data

## 💡 Default Data Structure

### Categories
1. **Wants** - Entertainment, dining, gym, shopping
2. **Needs** - Rent, groceries, utilities, transportation, loans
3. **Investments** - Mutual funds, FDs, stocks, emergency fund

### Sample Expense Reasons
- **Needs**: Hostel Rent (₹5,000), Bike Petrol (₹2,000), Utilities (₹1,500)
- **Wants**: Gym (₹1,000), Entertainment, Dining Out, Subscriptions (₹500)
- **Investments**: Mutual Funds (₹5,000), Emergency Fund (₹3,000), Retirement Fund (₹2,000)

## 📈 Usage Flow

1. **Setup**: Register → Initialize categories → Initialize expense reasons
2. **Budget Planning**: Create monthly budget → Allocate amounts to expense reasons
3. **Expense Tracking**: Add transactions → View real-time updates
4. **Analysis**: Monitor dashboard → Review spending patterns → Adjust future budgets

## 🔮 Advanced Features (Implementation Ready)

### Dashboard Components
- **Summary Cards**: Total salary, spent, remaining, budget usage percentage
- **Pie Chart**: Category-wise spending distribution
- **Bar Chart**: Monthly spending comparison
- **Line Chart**: Spending trends over time
- **Budget Status**: Allocation vs actual spending with overspend alerts

### Filtering & Search
- Filter transactions by month, year, category, expense reason
- Search transactions by notes or amount
- Export data to CSV/Excel (planned)

### Insights & Analytics
- Month-over-month spending changes
- Category-wise percentage changes
- Top spending reasons identification
- Budget efficiency analysis
- Spending pattern recommendations (planned)

## 🛡️ Security Features

- JWT token authentication
- Password hashing with bcrypt
- Protected API routes
- Input validation and sanitization
- CORS configuration
- Request rate limiting (recommended for production)

## 🚀 Production Deployment Considerations

### Backend
- Environment variables for sensitive data
- Database connection pooling
- Error logging and monitoring
- API documentation with Swagger
- Docker containerization

### Frontend
- Build optimization
- CDN integration for static assets
- Progressive Web App features
- Offline support considerations

### Infrastructure
- Database backup strategies
- SSL/TLS certificates
- Load balancing
- Monitoring and alerting

## 📋 Development Workflow

### Available Scripts

**Root Level:**
```bash
npm run setup          # Install all dependencies
npm run dev           # Start both servers concurrently
npm run build         # Build both applications
```

**Backend:**
```bash
npm run start:dev     # Development mode with hot reload
npm run build         # Production build
npm run migration:generate  # Generate database migrations
```

**Frontend:**
```bash
npm start            # Development server
npm run build        # Production build
npm test             # Run tests
```

## 🎯 Success Metrics

The application successfully provides:
- ✅ Complete user authentication flow
- ✅ Comprehensive budget management
- ✅ Real-time expense tracking
- ✅ Automated calculation of budget utilization
- ✅ Category-based spending analysis
- ✅ Monthly spending comparisons
- ✅ Overspending detection and alerts
- ✅ Responsive web interface
- ✅ RESTful API architecture
- ✅ Type-safe development environment

This money manager application provides a solid foundation for personal finance management with room for additional features like advanced analytics, mobile app development, and integration with banking APIs.