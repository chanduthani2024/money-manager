import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { google } from 'googleapis';
import { Transaction } from '../entities/transaction.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { GmailSyncRecord } from '../entities/gmail-sync.entity';
import { User } from '../entities/user.entity';
import { CreateTransactionDto, UpdateTransactionDto, GmailSyncDto } from './dto/transaction.dto';
import { MonthlyBudgetsService } from '../monthly-budgets/monthly-budgets.service';
import { ExpenseReasonsService } from '../expense-reasons/expense-reasons.service';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(BudgetAllocation)
    private budgetAllocationRepository: Repository<BudgetAllocation>,
    @InjectRepository(GmailSyncRecord)
    private gmailSyncRepository: Repository<GmailSyncRecord>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private monthlyBudgetsService: MonthlyBudgetsService,
    private expenseReasonsService: ExpenseReasonsService,
  ) {}

  async create(userId: number, createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const transactionDate = new Date(createTransactionDto.transactionDate);
    const month = transactionDate.getMonth() + 1;
    const year = transactionDate.getFullYear();

    // Get expense reason to determine category and ensure it belongs to user or is global
    const expenseReason = await this.expenseReasonsService.findOne(userId, createTransactionDto.expenseReasonId);
    if (!expenseReason) {
      throw new Error('Expense reason not found or unauthorized');
    }
    
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      userId,
      month,
      year,
      categoryId: expenseReason.categoryId,
      transactionDate,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Update budget allocation spent amount
    await this.updateBudgetAllocation(userId, createTransactionDto.expenseReasonId, month, year, createTransactionDto.amount);

    return this.findOne(savedTransaction.id);
  }

  private buildGmailQuery(startDate: Date, endDate: Date): string {
    const bankSenders = [
      'alerts@hdfcbank.bank.in',
      'alerts@hdfcbank.co.in',
      'alerts@sbi.co.in',
      'noreply@icicibank.com',
    ];

    const padded = (value: number) => String(value).padStart(2, '0');
    const after = `${startDate.getFullYear()}/${padded(startDate.getMonth() + 1)}/${padded(startDate.getDate())}`;
    const beforeDate = new Date(endDate.valueOf());
    beforeDate.setDate(beforeDate.getDate() + 1);
    const before = `${beforeDate.getFullYear()}/${padded(beforeDate.getMonth() + 1)}/${padded(beforeDate.getDate())}`;

    const fromQuery = bankSenders.map((sender) => `from:${sender}`).join(' OR ');
    return `${fromQuery} after:${after} before:${before}`;
  }

  private decodeMessageBody(payload: any): string {
    const decodeBase64Url = (data: string): string => {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const pad = base64.length % 4;
      const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
      return Buffer.from(padded, 'base64').toString('utf8');
    };

    const getBody = (part: any): string => {
      if (!part) return '';
      if (part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
      if (part.parts && part.parts.length) {
        return part.parts.map(getBody).join('\n');
      }
      return '';
    };

    return getBody(payload);
  }

  async syncEmails(userId: number, syncDto: GmailSyncDto): Promise<{ emails: any[]; messageCount: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.googleRefreshToken) {
      throw new BadRequestException('Google refresh token not available. Please sign in with Google again.');
    }

    const startDate = new Date(syncDto.startDate);
    const endDate = new Date(syncDto.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const existingSync = await this.gmailSyncRepository.findOne({
      where: { userId, startDate, endDate },
    });

    if (existingSync) {
      throw new ConflictException('This date range has already been synced');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const query = this.buildGmailQuery(startDate, endDate);

    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
    });

    const messages = listResponse.data.messages || [];
    const emails = await Promise.all(messages.map(async (messageMeta) => {
      const message = await gmail.users.messages.get({
        userId: 'me',
        id: messageMeta.id,
        format: 'full',
      });

      const headers = message.data.payload?.headers || [];
      const headerMap = headers.reduce((acc, header) => {
        if (header.name && header.value) {
          acc[header.name.toLowerCase()] = header.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const subject = headerMap.subject || '';
      const from = headerMap.from || '';
      const date = headerMap.date || '';
      const body = this.decodeMessageBody(message.data.payload);
      const snippet = message.data.snippet || '';

      return {
        messageId: messageMeta.id,
        subject,
        from,
        date,
        snippet,
        body,
      };
    }));

    emails.forEach((email) => {
      console.log(`Gmail sync email fetched: ${email.messageId} | ${email.subject}`);
      console.log(email.body);
    });

    const syncRecord = this.gmailSyncRepository.create({
      userId,
      startDate,
      endDate,
      messageIds: messages.map((msg) => msg.id).join(','),
      emails,
    });

    await this.gmailSyncRepository.save(syncRecord);
    user.lastGmailSync = new Date();
    await this.userRepository.save(user);

    return { emails, messageCount: emails.length };
  }

  async findAll(userId: number, filters?: {
    month?: number;
    year?: number;
    categoryId?: number;
    expenseReasonId?: number;
  }): Promise<Transaction[]> {
    const query = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.expenseReason', 'expenseReason')
      .leftJoinAndSelect('transaction.category', 'category')
      .where('transaction.userId = :userId', { userId })
      .orderBy('transaction.transactionDate', 'DESC');

    if (filters?.month) {
      query.andWhere('transaction.month = :month', { month: filters.month });
    }
    if (filters?.year) {
      query.andWhere('transaction.year = :year', { year: filters.year });
    }
    if (filters?.categoryId) {
      query.andWhere('transaction.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters?.expenseReasonId) {
      query.andWhere('transaction.expenseReasonId = :expenseReasonId', { expenseReasonId: filters.expenseReasonId });
    }

    return query.getMany();
  }

  async findOne(id: number): Promise<Transaction> {
    return this.transactionRepository.findOne({
      where: { id },
      relations: ['expenseReason', 'category'],
    });
  }

  async update(id: number, updateTransactionDto: UpdateTransactionDto): Promise<Transaction> {
    const transaction = await this.findOne(id);
    const oldAmount = transaction.amount;
    const oldExpenseReasonId = transaction.expenseReasonId;

    // Update transaction
    const updateData: any = { ...updateTransactionDto };
    if (updateTransactionDto.transactionDate) {
      const transactionDate = new Date(updateTransactionDto.transactionDate);
      updateData.transactionDate = transactionDate;
      updateData.month = transactionDate.getMonth() + 1;
      updateData.year = transactionDate.getFullYear();

      // If expense reason changed, update category
      if (updateTransactionDto.expenseReasonId && updateTransactionDto.expenseReasonId !== oldExpenseReasonId) {
        const expenseReason = await this.expenseReasonsService.findOne(transaction.userId, updateTransactionDto.expenseReasonId);
        if (!expenseReason) {
          throw new Error('Expense reason not found or unauthorized');
        }
        updateData.categoryId = expenseReason.categoryId;
      }
    }

    await this.transactionRepository.update(id, updateData);

    // Update budget allocations
    if (updateTransactionDto.amount !== undefined || updateTransactionDto.expenseReasonId !== undefined) {
      // Subtract old amount from old expense reason
      await this.updateBudgetAllocation(
        transaction.userId,
        oldExpenseReasonId,
        transaction.month,
        transaction.year,
        -Number(oldAmount)
      );

      // Add new amount to new expense reason
      const newExpenseReasonId = updateTransactionDto.expenseReasonId || oldExpenseReasonId;
      const newAmount = updateTransactionDto.amount || Number(oldAmount);
      await this.updateBudgetAllocation(
        transaction.userId,
        newExpenseReasonId,
        transaction.month,
        transaction.year,
        newAmount
      );
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.findOne(id);
    await this.transactionRepository.delete(id);
    // Subtract amount from budget allocation
    await this.updateBudgetAllocation(
      transaction.userId,
      transaction.expenseReasonId,
      transaction.month,
      transaction.year,
      -Number(transaction.amount)
    );
  }

  private async updateBudgetAllocation(
    userId: number,
    expenseReasonId: number,
    month: number,
    year: number,
    amountChange: number
  ): Promise<void> {
    const monthlyBudget = await this.monthlyBudgetsService.findByMonthYear(userId, month, year);
    
    if (monthlyBudget) {
      const allocation = await this.budgetAllocationRepository.findOne({
        where: {
          monthlyBudgetId: monthlyBudget.id,
          expenseReasonId,
        },
      });

      if (allocation) {
        // Update the specific budget allocation if it exists
        allocation.spentAmount = Number(allocation.spentAmount) + amountChange;
        await this.budgetAllocationRepository.save(allocation);
      }

      // Always update monthly budget total spent, regardless of whether allocation exists
      await this.monthlyBudgetsService.updateTotalSpent(monthlyBudget.id);
    }
  }

  async getMonthlySpending(userId: number, year: number): Promise<any[]> {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .select('transaction.month', 'month')
      .addSelect('SUM(transaction.amount)', 'totalSpent')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.year = :year', { year })
      .groupBy('transaction.month')
      .orderBy('transaction.month')
      .getRawMany();
  }

  async getCategorySpending(userId: number, month: number, year: number): Promise<any[]> {
    return this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('category.type', 'categoryType')
      .addSelect('SUM(transaction.amount)', 'totalSpent')
      .addSelect('COUNT(transaction.id)', 'transactionCount')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.month = :month', { month })
      .andWhere('transaction.year = :year', { year })
      .groupBy('category.id, category.name, category.type')
      .getRawMany();
  }
}