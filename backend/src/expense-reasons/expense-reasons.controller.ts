import { Controller, Get, Post, Body, Param, UseGuards, Put, Delete, Req } from '@nestjs/common';
import { ExpenseReasonsService } from './expense-reasons.service';
import { CreateExpenseReasonDto } from './dto/create-expense-reason.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('expense-reasons')
@UseGuards(JwtAuthGuard)
export class ExpenseReasonsController {
  constructor(private readonly expenseReasonsService: ExpenseReasonsService) {}

  @Post()
  create(@Req() req, @Body() createExpenseReasonDto: CreateExpenseReasonDto) {
    return this.expenseReasonsService.create(req.user.id, createExpenseReasonDto);
  }

  @Get()
  findAll(@Req() req) {
    return this.expenseReasonsService.findAll(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.expenseReasonsService.findOne(req.user.id, +id);
  }

  @Get('category/:categoryId')
  findByCategory(@Req() req, @Param('categoryId') categoryId: string) {
    return this.expenseReasonsService.findByCategory(req.user.id, +categoryId);
  }

  @Put(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateData: Partial<CreateExpenseReasonDto>) {
    return this.expenseReasonsService.update(req.user.id, +id, updateData);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.expenseReasonsService.remove(req.user.id, +id);
  }

  @Post('initialize')
  initializeDefaults(@Req() req) {
    return this.expenseReasonsService.initializeDefaultReasons(req.user.id);
  }
}