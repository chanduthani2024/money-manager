# Money Manager - Personal Finance Web Application

A full-stack personal finance and monthly salary allocation web application built with React, NestJS, PostgreSQL, and TypeORM.

## Features

### 🔐 Authentication
- JWT-based authentication
- User registration and login
- Protected routes

### 💰 Budget Management
- Monthly salary/income tracking
- Budget allocation across categories (Wants, Needs, Investments)
- Custom expense reasons (Gym, Bike service, Hostel rent, etc.)
- Remaining balance calculation

### 📊 Expense Tracking
- Add, edit, delete expense records
- Categorized spending tracking
- Support for recurring expenses
- Transaction history with filters

### 📈 Dashboard & Analytics
- Real-time spending overview
- Pie charts showing spending by category
- Bar charts for monthly comparisons
- Line charts for spending trends over time
- Category-wise spending analysis
- Budget vs actual spending comparison

### 🔍 Reporting & Insights
- Current month vs previous month comparison
- Overspending alerts
- Top spending categories
- Export functionality (planned)
- Monthly/yearly reports

## Tech Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: JWT with Passport.js
- **Validation**: class-validator, class-transformer

### Frontend
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **Forms**: React Hook Form
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Project Structure

```
money_manager/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── categories/     # Categories management
│   │   ├── config/         # Database configuration
│   │   ├── dashboard/      # Dashboard analytics
│   │   ├── entities/       # TypeORM entities
│   │   ├── expense-reasons/# Expense reasons module
│   │   ├── monthly-budgets/# Budget management
│   │   ├── transactions/   # Transaction management
│   │   └── users/          # User management
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── styles/         # CSS files
│   ├── package.json
│   └── tailwind.config.js
└── README.md
```

## Database Schema

### Tables
1. **users** - User accounts
2. **categories** - Expense categories (Wants, Needs, Investments)
3. **expense_reasons** - Specific reasons within categories
4. **monthly_budgets** - Monthly salary and budget data
5. **budget_allocations** - Allocation of budget to expense reasons
6. **transactions** - Individual expense transactions

### Key Relationships
- Users have multiple monthly budgets
- Monthly budgets have multiple budget allocations
- Categories contain multiple expense reasons
- Transactions link to expense reasons and categories

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup
1. Install PostgreSQL and create a database named `money_manager`
2. Update database credentials in `backend/src/config/database.config.ts`:
   - Username: `postgres`
   - Password: `chandu`
   - Database: `money_manager`

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run start:dev
   ```

   The backend API will be available at `http://localhost:3001`

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

   The frontend will be available at `http://localhost:3000`

### Initial Data Setup
1. After starting both servers, visit the application
2. Register a new user account
3. Initialize default categories and expense reasons using the API endpoints:
   - POST `/api/categories/initialize`
   - POST `/api/expense-reasons/initialize`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `POST /api/categories/initialize` - Initialize default categories

### Expense Reasons
- `GET /api/expense-reasons` - Get all expense reasons
- `POST /api/expense-reasons` - Create new expense reason
- `GET /api/expense-reasons/category/:id` - Get reasons by category
- `POST /api/expense-reasons/initialize` - Initialize default reasons

### Monthly Budgets
- `GET /api/monthly-budgets` - Get all budgets
- `POST /api/monthly-budgets` - Create new budget
- `GET /api/monthly-budgets/current` - Get current month budget
- `GET /api/monthly-budgets/:month/:year` - Get budget by month/year

### Transactions
- `GET /api/transactions` - Get all transactions (with filters)
- `POST /api/transactions` - Create new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard summary
- `GET /api/dashboard/yearly-trend` - Get yearly spending trend
- `GET /api/dashboard/category-yearly` - Get category-wise yearly data

## Usage Flow

1. **Registration/Login**: Create an account or login
2. **Setup Categories**: Initialize default categories (Wants, Needs, Investments)
3. **Setup Expense Reasons**: Initialize default reasons (Gym, Rent, Petrol, etc.)
4. **Create Monthly Budget**: Add your salary and allocate amounts to different reasons
5. **Track Expenses**: Add transactions as you spend money
6. **Monitor Dashboard**: View real-time spending analysis and comparisons
7. **Review Analytics**: Check monthly trends and category-wise spending

## Default Categories & Expense Reasons

### Categories
- **Wants**: Non-essential expenses (Entertainment, Dining out)
- **Needs**: Essential expenses (Rent, Groceries, Utilities)
- **Investments**: Savings and investments (Mutual funds, FDs)

### Default Expense Reasons
- Hostel Rent (Needs, Recurring: ₹5,000)
- Groceries (Needs)
- Gym (Wants, Recurring: ₹1,000)
- Bike Service (Needs)
- Bike Petrol (Needs, Recurring: ₹2,000)
- Loan Repayments (Needs, Recurring)
- Mutual Funds (Investments, Recurring)
- Entertainment (Wants)
- Dining Out (Wants)

## Development

### Backend Development
- `npm run start:dev` - Start in watch mode
- `npm run build` - Build for production
- `npm run test` - Run tests

### Frontend Development
- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests

### Database Migrations
```bash
# Generate migration
npm run migration:generate -- -n MigrationName

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

## Environment Variables

### Backend (.env)
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=chandu
DATABASE_NAME=money_manager_test
JWT_SECRET=your-secret-key
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
```

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License
This project is licensed under the MIT License.

## Support
For support or questions, please create an issue in the repository.