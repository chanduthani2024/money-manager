import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonthlyBudget } from '../entities/monthly-budget.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateMonthlyBudgetDto } from './dto/create-monthly-budget.dto';

@Injectable()
export class MonthlyBudgetsService {
  constructor(
    @InjectRepository(MonthlyBudget)
    private monthlyBudgetRepository: Repository<MonthlyBudget>,
    @InjectRepository(BudgetAllocation)
    private budgetAllocationRepository: Repository<BudgetAllocation>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async create(userId: number, createMonthlyBudgetDto: CreateMonthlyBudgetDto): Promise<MonthlyBudget> {
    const { budgetAllocations, ...budgetData } = createMonthlyBudgetDto;
    
    // Check if budget already exists for this month/year
    const existingBudget = await this.monthlyBudgetRepository.findOne({
      where: {
        userId,
        month: budgetData.month,
        year: budgetData.year,
      },
    });

    if (existingBudget) {
      throw new Error('Budget already exists for this month');
    }

    // Calculate total allocated amount
    const totalAllocated = budgetAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);

    // Create monthly budget
    const monthlyBudget = this.monthlyBudgetRepository.create({
      ...budgetData,
      userId,
      totalAllocated,
    });

    const savedBudget = await this.monthlyBudgetRepository.save(monthlyBudget);

    // Create budget allocations and sync with existing transactions
    const allocations = [];
    for (const allocation of budgetAllocations) {
      // Calculate spent amount from existing transactions
      const existingTransactions = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'totalSpent')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.month = :month', { month: budgetData.month })
        .andWhere('transaction.year = :year', { year: budgetData.year })
        .andWhere('transaction.expenseReasonId = :expenseReasonId', { expenseReasonId: allocation.expenseReasonId })
        .getRawOne();

      const spentAmount = parseFloat(existingTransactions?.totalSpent || '0');

      const budgetAllocation = this.budgetAllocationRepository.create({
        ...allocation,
        monthlyBudgetId: savedBudget.id,
        spentAmount: spentAmount,
      });

      allocations.push(budgetAllocation);
    }

    await this.budgetAllocationRepository.save(allocations);

    return this.findOne(savedBudget.id);
  }

  async findAll(userId: number): Promise<MonthlyBudget[]> {
    return this.monthlyBudgetRepository.find({
      where: { userId },
      relations: ['budgetAllocations', 'budgetAllocations.expenseReason'],
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async findOne(id: number): Promise<MonthlyBudget> {
    return this.monthlyBudgetRepository.findOne({
      where: { id },
      relations: ['budgetAllocations', 'budgetAllocations.expenseReason', 'budgetAllocations.expenseReason.category'],
    });
  }

  async findByMonthYear(userId: number, month: number, year: number): Promise<MonthlyBudget> {
    const budget = await this.monthlyBudgetRepository.findOne({
      where: { userId, month, year },
      relations: ['budgetAllocations', 'budgetAllocations.expenseReason', 'budgetAllocations.expenseReason.category'],
    });

    if (!budget) {
      throw new NotFoundException(`No budget found for ${month}/${year}`);
    }

    return budget;
  }

  async getCurrentMonthBudget(userId: number): Promise<MonthlyBudget | null> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    // For current month, we don't want to throw an error if no budget exists
    return this.monthlyBudgetRepository.findOne({
      where: { userId, month, year },
      relations: ['budgetAllocations', 'budgetAllocations.expenseReason', 'budgetAllocations.expenseReason.category'],
    });
  }

  async updateTotalSpent(budgetId: number): Promise<void> {
    // Get the monthly budget to find the month, year, and userId
    const monthlyBudget = await this.monthlyBudgetRepository.findOne({
      where: { id: budgetId },
    });

    if (!monthlyBudget) {
      return;
    }

    // Calculate total spent from actual transactions for this month/year
    const result = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'totalSpent')
      .where('transaction.userId = :userId', { userId: monthlyBudget.userId })
      .andWhere('transaction.month = :month', { month: monthlyBudget.month })
      .andWhere('transaction.year = :year', { year: monthlyBudget.year })
      .getRawOne();

    const totalSpent = parseFloat(result?.totalSpent || '0');

    await this.monthlyBudgetRepository.update(budgetId, { totalSpent });
  }

  async update(userId: number, id: number, updateMonthlyBudgetDto: CreateMonthlyBudgetDto): Promise<MonthlyBudget> {
    const { budgetAllocations, ...budgetData } = updateMonthlyBudgetDto;
    
    // Find existing budget
    const existingBudget = await this.monthlyBudgetRepository.findOne({
      where: { id, userId },
      relations: ['budgetAllocations'],
    });

    if (!existingBudget) {
      throw new Error('Budget not found');
    }

    // Calculate total allocated amount
    const totalAllocated = budgetAllocations.reduce((sum, allocation) => sum + allocation.allocatedAmount, 0);

    // Update monthly budget
    await this.monthlyBudgetRepository.update(id, {
      ...budgetData,
      totalAllocated,
    });

    // Delete existing allocations
    await this.budgetAllocationRepository.delete({ monthlyBudgetId: id });

    // Create new budget allocations and sync with existing transactions
    const allocations = [];
    for (const allocation of budgetAllocations) {
      // Calculate spent amount from existing transactions
      const existingTransactions = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'totalSpent')
        .where('transaction.userId = :userId', { userId })
        .andWhere('transaction.month = :month', { month: existingBudget.month })
        .andWhere('transaction.year = :year', { year: existingBudget.year })
        .andWhere('transaction.expenseReasonId = :expenseReasonId', { expenseReasonId: allocation.expenseReasonId })
        .getRawOne();

      const spentAmount = parseFloat(existingTransactions?.totalSpent || '0');

      const budgetAllocation = this.budgetAllocationRepository.create({
        ...allocation,
        monthlyBudgetId: id,
        spentAmount: spentAmount,
      });

      allocations.push(budgetAllocation);
    }

    await this.budgetAllocationRepository.save(allocations);

    return this.findOne(id);
  }
}