import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseReason } from '../entities/expense-reason.entity';
import { CreateExpenseReasonDto } from './dto/create-expense-reason.dto';

@Injectable()
export class ExpenseReasonsService {
  constructor(
    @InjectRepository(ExpenseReason)
    private expenseReasonRepository: Repository<ExpenseReason>,
  ) {}

  async create(userId: number | null, createExpenseReasonDto: CreateExpenseReasonDto): Promise<ExpenseReason> {
    const expenseReason = this.expenseReasonRepository.create({
      ...createExpenseReasonDto,
      userId,
    });
    return this.expenseReasonRepository.save(expenseReason);
  }

  async findAll(userId: number): Promise<ExpenseReason[]> {
    return this.expenseReasonRepository.find({
      where: [{ userId }, { userId: null }],
      relations: ['category'],
    });
  }

  async findOne(userId: number, id: number): Promise<ExpenseReason> {
    return this.expenseReasonRepository.findOne({
      where: [{ id, userId }, { id, userId: null }],
      relations: ['category'],
    });
  }

  async findByCategory(userId: number, categoryId: number): Promise<ExpenseReason[]> {
    return this.expenseReasonRepository.find({
      where: [{ categoryId, userId }, { categoryId, userId: null }],
      relations: ['category'],
    });
  }

  async update(userId: number, id: number, updateData: Partial<CreateExpenseReasonDto>): Promise<ExpenseReason> {
    const existing = await this.findOne(userId, id);
    if (!existing) {
      throw new Error('ExpenseReason not found or unauthorized');
    }
    await this.expenseReasonRepository.update(id, updateData);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    const existing = await this.findOne(userId, id);
    if (!existing) {
      throw new Error('ExpenseReason not found or unauthorized');
    }
    await this.expenseReasonRepository.delete(id);
  }

  async initializeDefaultReasons(userId: number | null = null): Promise<void> {
    const defaultReasons = [
      // Needs (categoryId: 2)
      { name: 'Hostel Rent', categoryId: 2, isRecurring: true, recurringAmount: 5000 },
      { name: 'Groceries', categoryId: 2, isRecurring: false },
      { name: 'Utilities', categoryId: 2, isRecurring: true },
      
      // Wants (categoryId: 1)
      { name: 'Entertainment', categoryId: 1, isRecurring: false },
      { name: 'Dining Out', categoryId: 1, isRecurring: false },
      { name: 'Gym', categoryId: 1, isRecurring: true, recurringAmount: 1000 },
      
      // Transportation/Vehicle
      { name: 'Bike Service', categoryId: 2, isRecurring: false },
      { name: 'Bike Petrol', categoryId: 2, isRecurring: true, recurringAmount: 2000 },
      
      // Loans/Debt
      { name: 'Loan Repayments', categoryId: 2, isRecurring: true },
      
      // Investments (categoryId: 3)
      { name: 'Mutual Funds', categoryId: 3, isRecurring: true },
      { name: 'Fixed Deposits', categoryId: 3, isRecurring: false },
    ];

    for (const reasonData of defaultReasons) {
      const existingReason = await this.expenseReasonRepository.findOne({
        where: { name: reasonData.name },
      });
      
      if (!existingReason) {
        await this.create(userId, reasonData);
      }
    }
  }
}