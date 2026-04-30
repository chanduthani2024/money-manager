import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(@Req() req, @Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(req.user.id, createCategoryDto);
  }

  @Get()
  findAll(@Req() req) {
    console.log('Fetching categories for user:', req.user.id);
    console.log('Fetching categories for user:', this.categoriesService.findAll(req.user.id));
    return this.categoriesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.categoriesService.findOne(req.user.id, +id);
  }

  @Post('initialize')
  initializeDefaults(@Req() req) {
    return this.categoriesService.initializeDefaultCategories(req.user.id);
  }
}