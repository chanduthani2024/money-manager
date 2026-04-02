import { Controller, Get, Post, Body, Param, UseGuards, Request, Put } from '@nestjs/common';
import { MonthlyBudgetsService } from './monthly-budgets.service';
import { CreateMonthlyBudgetDto } from './dto/create-monthly-budget.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('monthly-budgets')
@UseGuards(JwtAuthGuard)
export class MonthlyBudgetsController {
  constructor(private readonly monthlyBudgetsService: MonthlyBudgetsService) {}

  @Post()
  create(@Request() req, @Body() createMonthlyBudgetDto: CreateMonthlyBudgetDto) {
    return this.monthlyBudgetsService.create(req.user.id, createMonthlyBudgetDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.monthlyBudgetsService.findAll(req.user.id);
  }

  @Get('current')
  getCurrentMonth(@Request() req) {
    return this.monthlyBudgetsService.getCurrentMonthBudget(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyBudgetsService.findOne(+id);
  }

  @Put(':id')
  update(@Request() req, @Param('id') id: string, @Body() updateMonthlyBudgetDto: CreateMonthlyBudgetDto) {
    return this.monthlyBudgetsService.update(req.user.id, +id, updateMonthlyBudgetDto);
  }

  @Get(':month/:year')
  findByMonthYear(@Request() req, @Param('month') month: string, @Param('year') year: string) {
    return this.monthlyBudgetsService.findByMonthYear(req.user.id, +month, +year);
  }
}