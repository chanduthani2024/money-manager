export interface DashboardSummary {
  totalSalary: number;
  totalSpent: number;
  totalRemaining: number;
  categorySpending: CategorySpending[];
  topSpendingReason: {
    name: string;
    amount: number;
  };
  monthlyComparison: MonthlyComparison;
  budgetStatus: BudgetStatus[];
}

export interface CategorySpending {
  categoryName: string;
  categoryType: string;
  totalSpent: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyComparison {
  currentMonth: MonthData;
  previousMonth: MonthData;
  changes: {
    totalChange: number;
    totalChangePercentage: number;
    categoryChanges: CategoryChange[];
  };
}

export interface MonthData {
  month: number;
  year: number;
  totalSpent: number;
  categorySpending: CategorySpending[];
}

export interface CategoryChange {
  categoryName: string;
  currentAmount: number;
  previousAmount: number;
  change: number;
  changePercentage: number;
}

export interface BudgetStatus {
  expenseReasonName: string;
  categoryName: string;
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  isOverspent: boolean;
}