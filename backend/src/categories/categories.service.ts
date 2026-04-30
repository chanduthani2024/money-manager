import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, CategoryType } from '../entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async create(userId: number | null, createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create({
      ...createCategoryDto,
      userId,
    });
    try {
      return await this.categoryRepository.save(category);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException(`Category "${createCategoryDto.name}" already exists`);
      }
      throw err;
    }
  }

  async findAll(userId: number): Promise<Category[]> {
    return this.categoryRepository.find({
      where: [{ userId }, { userId: null }],
      relations: ['expenseReasons'],
    });
  }

  async findOne(userId: number, id: number): Promise<Category> {
    return this.categoryRepository.findOne({
      where: [{ id, userId }, { id, userId: null }],
      relations: ['expenseReasons'],
    });
  }

  async initializeDefaultCategories(userId: number | null = null): Promise<void> {
    const categories = [
      { name: 'Wants', type: CategoryType.WANTS, description: 'Non-essential expenses' },
      { name: 'Needs', type: CategoryType.NEEDS, description: 'Essential expenses' },
      { name: 'Investments', type: CategoryType.INVESTMENTS, description: 'Investment and savings' },
    ];

    for (const categoryData of categories) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: categoryData.name },
      });
      
      if (!existingCategory) {
        await this.create(null, categoryData);
      }
    }
  }
}