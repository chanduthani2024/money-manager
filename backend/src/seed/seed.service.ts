import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from '../entities/category.entity';
import { ExpenseReason } from '../entities/expense-reason.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(ExpenseReason)
    private expenseReasonRepository: Repository<ExpenseReason>,
  ) {}

  async seedCategories(): Promise<void> {
    const categories = [
      {
        name: 'Wants',
        type: CategoryType.WANTS,
        description: 'Non-essential expenses that you desire but can live without',
      },
      {
        name: 'Needs',
        type: CategoryType.NEEDS,
        description: 'Essential expenses required for basic living',
      },
      {
        name: 'Investments',
        type: CategoryType.INVESTMENTS,
        description: 'Money set aside for savings and investment purposes',
      },
    ];

    for (const categoryData of categories) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: categoryData.name },
      });

      if (!existingCategory) {
        const category = this.categoryRepository.create(categoryData);
        await this.categoryRepository.save(category);
        console.log(`Created category: ${categoryData.name}`);
      }
    }
  }

  async seedExpenseReasons(): Promise<void> {
    // First, get category IDs
    const wantsCategory = await this.categoryRepository.findOne({
      where: { type: CategoryType.WANTS },
    });
    const needsCategory = await this.categoryRepository.findOne({
      where: { type: CategoryType.NEEDS },
    });
    const investmentsCategory = await this.categoryRepository.findOne({
      where: { type: CategoryType.INVESTMENTS },
    });

    if (!wantsCategory || !needsCategory || !investmentsCategory) {
      throw new Error('Categories must be seeded first');
    }

    const expenseReasons = [
      // Needs
      {
        name: 'Hostel Rent',
        description: 'Monthly accommodation expenses',
        categoryId: needsCategory.id,
        isRecurring: true,
        recurringAmount: 5000,
      },
      {
        name: 'Groceries',
        description: 'Food and household essentials',
        categoryId: needsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Utilities',
        description: 'Electricity, water, gas bills',
        categoryId: needsCategory.id,
        isRecurring: true,
        recurringAmount: 1500,
      },
      {
        name: 'Transportation',
        description: 'Public transport, fuel costs',
        categoryId: needsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Bike Service',
        description: 'Vehicle maintenance and repairs',
        categoryId: needsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Bike Petrol',
        description: 'Fuel expenses for personal vehicle',
        categoryId: needsCategory.id,
        isRecurring: true,
        recurringAmount: 2000,
      },
      {
        name: 'Loan Repayments',
        description: 'EMI and loan installments',
        categoryId: needsCategory.id,
        isRecurring: true,
      },
      {
        name: 'Medical Expenses',
        description: 'Healthcare and medicine costs',
        categoryId: needsCategory.id,
        isRecurring: false,
      },
      
      // Wants
      {
        name: 'Entertainment',
        description: 'Movies, games, leisure activities',
        categoryId: wantsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Dining Out',
        description: 'Restaurants and food delivery',
        categoryId: wantsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Gym',
        description: 'Fitness and gym membership',
        categoryId: wantsCategory.id,
        isRecurring: true,
        recurringAmount: 1000,
      },
      {
        name: 'Shopping',
        description: 'Clothing, accessories, and personal items',
        categoryId: wantsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Subscriptions',
        description: 'Streaming services, apps, magazines',
        categoryId: wantsCategory.id,
        isRecurring: true,
        recurringAmount: 500,
      },
      {
        name: 'Travel',
        description: 'Vacation and travel expenses',
        categoryId: wantsCategory.id,
        isRecurring: false,
      },

      // Investments
      {
        name: 'Mutual Funds',
        description: 'Systematic Investment Plans (SIP)',
        categoryId: investmentsCategory.id,
        isRecurring: true,
        recurringAmount: 5000,
      },
      {
        name: 'Fixed Deposits',
        description: 'Bank fixed deposits',
        categoryId: investmentsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Stock Market',
        description: 'Direct equity investments',
        categoryId: investmentsCategory.id,
        isRecurring: false,
      },
      {
        name: 'Emergency Fund',
        description: 'Savings for unexpected expenses',
        categoryId: investmentsCategory.id,
        isRecurring: true,
        recurringAmount: 3000,
      },
      {
        name: 'Retirement Fund',
        description: 'Long-term retirement savings',
        categoryId: investmentsCategory.id,
        isRecurring: true,
        recurringAmount: 2000,
      },
    ];

    for (const reasonData of expenseReasons) {
      const existingReason = await this.expenseReasonRepository.findOne({
        where: { name: reasonData.name },
      });

      if (!existingReason) {
        const reason = this.expenseReasonRepository.create({ ...reasonData, userId: null });
        await this.expenseReasonRepository.save(reason);
        console.log(`Created expense reason: ${reasonData.name}`);
      }
    }
  }

  async seedAll(): Promise<void> {
    console.log('🌱 Starting database seeding...');
    
    try {
      await this.seedCategories();
      console.log('✅ Categories seeded successfully');
      
      await this.seedExpenseReasons();
      console.log('✅ Expense reasons seeded successfully');
      
      console.log('🎉 Database seeding completed!');
    } catch (error) {
      console.error('❌ Error seeding database:', error);
      throw error;
    }
  }
}