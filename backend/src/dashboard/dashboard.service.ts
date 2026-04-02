import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlyBudget } from '../entities/monthly-budget.entity';
import { Transaction } from '../entities/transaction.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { TransactionsService } from '../transactions/transactions.service';
import { MonthlyBudgetsService } from '../monthly-budgets/monthly-budgets.service';
import {
  DashboardSummary,
  CategorySpending,
  MonthlyComparison,
  BudgetStatus,
  MonthData,
  CategoryChange,
} from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(BudgetAllocation)
    private budgetAllocationRepository: Repository<BudgetAllocation>,
    private transactionsService: TransactionsService,
    private monthlyBudgetsService: MonthlyBudgetsService,
  ) {}

  async getDashboardSummary(userId: number, month?: number, year?: number): Promise<DashboardSummary> {
    const now = new Date();
    const currentMonth = month || now.getMonth() + 1;
    const currentYear = year || now.getFullYear();

    // Get current month budget
    const monthlyBudget = await this.monthlyBudgetsService.findByMonthYear(userId, currentMonth, currentYear);
    
    if (!monthlyBudget) {
      throw new Error('No budget found for the specified month');
    }

    // Get category spending for current month
    const categorySpending = await this.getCategorySpending(userId, currentMonth, currentYear);

    // Get top spending reason
    const topSpendingReason = await this.getTopSpendingReason(userId, currentMonth, currentYear);

    // Get monthly comparison
    const monthlyComparison = await this.getMonthlyComparison(userId, currentMonth, currentYear);

    // Get budget status
    const budgetStatus = await this.getBudgetStatus(monthlyBudget.id);

    return {
      totalSalary: Number(monthlyBudget.salary),
      totalSpent: Number(monthlyBudget.totalSpent),
      totalRemaining: monthlyBudget.remainingBalance,
      categorySpending,
      topSpendingReason,
      monthlyComparison,
      budgetStatus,
    };
  }

  private async getCategorySpending(userId: number, month: number, year: number): Promise<CategorySpending[]> {
    const result = await this.transactionsService.getCategorySpending(userId, month, year);
    const totalSpent = result.reduce((sum, item) => sum + parseFloat(item.totalSpent), 0);

    return result.map(item => ({
      categoryName: item.categoryName,
      categoryType: item.categoryType,
      totalSpent: parseFloat(item.totalSpent),
      percentage: totalSpent > 0 ? (parseFloat(item.totalSpent) / totalSpent) * 100 : 0,
      transactionCount: parseInt(item.transactionCount) || 0,
    }));
  }

  private async getTopSpendingReason(userId: number, month: number, year: number): Promise<{ name: string; amount: number }> {
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.expenseReason', 'expenseReason')
      .select('expenseReason.name', 'name')
      .addSelect('SUM(transaction.amount)', 'totalAmount')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.month = :month', { month })
      .andWhere('transaction.year = :year', { year })
      .groupBy('expenseReason.id, expenseReason.name')
      .orderBy('SUM(transaction.amount)', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      name: result?.name || 'No expenses',
      amount: result ? parseFloat(result.totalAmount) : 0,
    };
  }

  private async getMonthlyComparison(userId: number, currentMonth: number, currentYear: number): Promise<MonthlyComparison> {
    // Calculate previous month
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = currentYear - 1;
    }

    // Get current month data
    const currentMonthSpending = await this.getCategorySpending(userId, currentMonth, currentYear);
    const currentMonthTotal = currentMonthSpending.reduce((sum, item) => sum + item.totalSpent, 0);

    // Get previous month data
    const previousMonthSpending = await this.getCategorySpending(userId, prevMonth, prevYear);
    const previousMonthTotal = previousMonthSpending.reduce((sum, item) => sum + item.totalSpent, 0);

    // Calculate changes
    const totalChange = currentMonthTotal - previousMonthTotal;
    const totalChangePercentage = previousMonthTotal > 0 ? (totalChange / previousMonthTotal) * 100 : 0;

    const categoryChanges: CategoryChange[] = currentMonthSpending.map(current => {
      const previous = previousMonthSpending.find(p => p.categoryName === current.categoryName);
      const previousAmount = previous ? previous.totalSpent : 0;
      const change = current.totalSpent - previousAmount;
      const changePercentage = previousAmount > 0 ? (change / previousAmount) * 100 : 0;

      return {
        categoryName: current.categoryName,
        currentAmount: current.totalSpent,
        previousAmount,
        change,
        changePercentage,
      };
    });

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        totalSpent: currentMonthTotal,
        categorySpending: currentMonthSpending,
      },
      previousMonth: {
        month: prevMonth,
        year: prevYear,
        totalSpent: previousMonthTotal,
        categorySpending: previousMonthSpending,
      },
      changes: {
        totalChange,
        totalChangePercentage,
        categoryChanges,
      },
    };
  }

  private async getBudgetStatus(monthlyBudgetId: number): Promise<BudgetStatus[]> {
    const allocations = await this.budgetAllocationRepository.find({
      where: { monthlyBudgetId },
      relations: ['expenseReason', 'expenseReason.category'],
    });

    return allocations.map(allocation => {
      const allocatedAmount = Number(allocation.allocatedAmount);
      const spentAmount = Number(allocation.spentAmount);
      const remainingAmount = allocatedAmount - spentAmount;
      const percentageUsed = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0;

      return {
        expenseReasonName: allocation.expenseReason.name,
        categoryName: allocation.expenseReason.category.name,
        allocatedAmount,
        spentAmount,
        remainingAmount,
        percentageUsed,
        isOverspent: spentAmount > allocatedAmount,
      };
    });
  }

  async getYearlySpendingTrend(userId: number, year: number): Promise<any[]> {
    return this.transactionsService.getMonthlySpending(userId, year);
  }

  async getCategoryWiseYearlySpending(userId: number, year: number): Promise<any[]> {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('category.type', 'categoryType')
      .addSelect('transaction.month', 'month')
      .addSelect('SUM(transaction.amount)', 'totalSpent')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.year = :year', { year })
      .groupBy('category.id, category.name, category.type, transaction.month')
      .orderBy('transaction.month')
      .getRawMany();
  }
}