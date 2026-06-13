import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
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
    return this.categoriesService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.categoriesService.findOne(req.user.id, +id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateDto: any) {
    return this.categoriesService.update(req.user.id, +id, updateDto);
  }

  @Post('initialize')
  initializeDefaults(@Req() req) {
    return this.categoriesService.initializeDefaultCategories(req.user.id);
  }
}