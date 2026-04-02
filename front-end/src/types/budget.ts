export enum CategoryType {
  WANTS = 'wants',
  NEEDS = 'needs',
  INVESTMENTS = 'investments',
}

export interface Category {
  id: number;
  name: string;
  type: CategoryType;
  description?: string;
  expenseReasons?: ExpenseReason[];
}

export interface ExpenseReason {
  id: number;
  name: string;
  description?: string;
  isRecurring: boolean;
  recurringAmount?: number;
  categoryId: number;
  category?: Category;
}

export interface MonthlyBudget {
  id: number;
  salary: number;
  totalAllocated: number;
  totalSpent: number;
  month: number;
  year: number;
  userId: number;
  budgetAllocations: BudgetAllocation[];
  remainingBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetAllocation {
  id: number;
  allocatedAmount: number;
  spentAmount: number;
  monthlyBudgetId: number;
  expenseReasonId: number;
  expenseReason: ExpenseReason;
  remainingAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetAllocation {
  expenseReasonId: number;
  allocatedAmount: number;
}

export interface CreateMonthlyBudget {
  salary: number;
  month: number;
  year: number;
  budgetAllocations: CreateBudgetAllocation[];
}

export interface Transaction {
  id: number;
  amount: number;
  notes?: string;
  transactionDate: string;
  month: number;
  year: number;
  userId: number;
  expenseReasonId: number;
  categoryId: number;
  expenseReason: ExpenseReason;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransaction {
  amount: number;
  notes?: string;
  transactionDate: string;
  expenseReasonId: number;
}

export interface UpdateTransaction {
  amount?: number;
  notes?: string;
  transactionDate?: string;
  expenseReasonId?: number;
}