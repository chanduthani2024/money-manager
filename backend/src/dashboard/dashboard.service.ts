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
  TopSpendingReason,
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

    // Get top spending reasons
    const topSpendingReasons = await this.getTopSpendingReasons(userId, currentMonth, currentYear, 5);

    // Get monthly comparison
    const monthlyComparison = await this.getMonthlyComparison(userId, currentMonth, currentYear);

    // Get budget status
    const budgetStatus = await this.getBudgetStatus(monthlyBudget.id);

    return {
      totalSalary: Number(monthlyBudget.salary),
      totalSpent: Number(monthlyBudget.totalSpent),
      totalRemaining: monthlyBudget.remainingBalance,
      categorySpending,
      topSpendingReasons,
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

  async getAllSpendingReasons(userId: number, month: number, year: number): Promise<TopSpendingReason[]> {
    return this.getTopSpendingReasons(userId, month, year);
  }

  private async getTopSpendingReasons(userId: number, month: number, year: number, limit?: number): Promise<TopSpendingReason[]> {
    // innerJoin ensures expenseReason is always present in the result rows
    const qb = this.transactionRepository
      .createQueryBuilder('transaction')
      .innerJoin('transaction.expenseReason', 'expenseReason')
      .select('expenseReason.id', 'reasonId')
      .addSelect('expenseReason.name', 'name')
      .addSelect('SUM(transaction.amount)', 'totalAmount')
      .addSelect('COUNT(transaction.id)', 'transactionCount')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.month = :month', { month })
      .andWhere('transaction.year = :year', { year })
      .groupBy('expenseReason.id, expenseReason.name')
      .orderBy('SUM(transaction.amount)', 'DESC');

    if (limit !== undefined) qb.limit(limit);

    const topReasons = await qb.getRawMany();

    if (!topReasons.length) return [];

    // For each reason fetch individual transactions (cast reasonId to number — raw results are strings in pg)
    const results: TopSpendingReason[] = await Promise.all(
      topReasons.map(async (reason) => {
        const reasonId = Number(reason.reasonId);
        const transactions = await this.transactionRepository.find({
          where: { userId, month, year, expenseReasonId: reasonId },
          order: { transactionDate: 'DESC' },
          select: ['transactionDate', 'amount', 'transactionType', 'notes'],
        });

        return {
          name: reason.name,
          totalAmount: parseFloat(reason.totalAmount),
          transactionCount: parseInt(reason.transactionCount),
          transactions: transactions.map((t) => ({
            transactionDate: t.transactionDate as unknown as string,
            amount: Number(t.amount),
            transactionType: t.transactionType,
            notes: t.notes ?? null,
          })),
        };
      }),
    );

    return results;
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