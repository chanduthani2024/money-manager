import { Controller, Get, Post, Body, Param, Delete, Put, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto, UpdateTransactionDto, GmailSyncDto, ClassifyGmailTransactionDto } from './dto/transaction.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Request() req, @Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(req.user.id, createTransactionDto);
  }

  @Post('sync-emails')
  syncEmails(@Request() req, @Body() syncDto: GmailSyncDto) {
    return this.transactionsService.syncEmails(req.user.id, syncDto);
  }

  @Get('gmail-pending')
  getPendingGmailTransactions(@Request() req) {
    return this.transactionsService.getPendingGmailTransactions(req.user.id);
  }

  @Post('gmail-transactions/:id/classify')
  classifyGmailTransaction(
    @Request() req,
    @Param('id') id: string,
    @Body() classifyDto: ClassifyGmailTransactionDto,
  ) {
    return this.transactionsService.classifyGmailTransaction(req.user.id, +id, classifyDto.expenseReasonId, classifyDto.notes);
  }

  @Post('gmail-transactions/:id/reject')
  rejectGmailTransaction(@Request() req, @Param('id') id: string) {
    return this.transactionsService.rejectGmailTransaction(req.user.id, +id);
  }

  @Get()
  findAll(@Request() req, @Query() filters: any) {
    const queryFilters = {
      month: filters.month ? parseInt(filters.month) : undefined,
      year: filters.year ? parseInt(filters.year) : undefined,
      categoryId: filters.categoryId ? parseInt(filters.categoryId) : undefined,
      expenseReasonId: filters.expenseReasonId ? parseInt(filters.expenseReasonId) : undefined,
    };
    
    return this.transactionsService.findAll(req.user.id, queryFilters);
  }

  @Get('monthly-spending/:year')
  getMonthlySpending(@Request() req, @Param('year') year: string) {
    return this.transactionsService.getMonthlySpending(req.user.id, parseInt(year));
  }

  @Get('category-spending/:month/:year')
  getCategorySpending(@Request() req, @Param('month') month: string, @Param('year') year: string) {
    return this.transactionsService.getCategorySpending(req.user.id, parseInt(month), parseInt(year));
  }

  @Get('uncategorized')
  getUncategorizedTransactions(@Request() req) {
    return this.transactionsService.getUncategorizedTransactions(req.user.id);
  }

  @Patch(':id/assign-reason')
  assignExpenseReason(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { expenseReasonId: number; notes?: string },
  ) {
    return this.transactionsService.assignExpenseReason(req.user.id, +id, body.expenseReasonId, body.notes);
  }

  @Patch(':id/remove-reason')
  removeExpenseReason(@Request() req: any, @Param('id') id: string) {
    return this.transactionsService.removeExpenseReason(req.user.id, +id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTransactionDto: UpdateTransactionDto) {
    return this.transactionsService.update(+id, updateTransactionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.transactionsService.remove(+id);
  }
}