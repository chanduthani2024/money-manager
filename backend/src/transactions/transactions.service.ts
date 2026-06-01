import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, IsNull } from 'typeorm';
import { google } from 'googleapis';
import { Transaction } from '../entities/transaction.entity';
import { BudgetAllocation } from '../entities/budget-allocation.entity';
import { GmailSyncRecord } from '../entities/gmail-sync.entity';
import { GmailTransaction } from '../entities/gmail-transaction.entity';
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
    @InjectRepository(GmailTransaction)
    private gmailTransactionRepository: Repository<GmailTransaction>,
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
      transactionType: createTransactionDto.transactionType || 'debit',
      userId,
      month,
      year,
      categoryId: expenseReason.categoryId,
      transactionDate,
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    const txType = createTransactionDto.transactionType || 'debit';
    const amountChange = txType === 'credit' ? -createTransactionDto.amount : createTransactionDto.amount;
    // Update budget allocation spent amount
    await this.updateBudgetAllocation(userId, createTransactionDto.expenseReasonId, month, year, amountChange, txType);

    return this.findOne(savedTransaction.id);
  }

  private buildGmailQuery(startDate: Date, endDate: Date): string {
    const bankSenders = [
      'alerts@hdfcbank.bank.in',
      'alerts@hdfcbank.co.in',
      'alerts@sbi.co.in',
      'noreply@icicibank.com',
      'alerts@hdfcbank.net'
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

  private parseGmailTransaction(snippet: string, rawDate?: string) {
    const snippetLower = (snippet || '').toLowerCase();

    // Detect if this is a credit card transaction
    const isCreditCard = snippetLower.includes('credit card');
    const cardType: 'debit' | 'credit' = isCreditCard ? 'credit' : 'debit';
    
    // Debit: explicitly "debited" or "deducted from your account"
    const isDebited = snippetLower.includes('debited') || snippetLower.includes('deducted');

    // Credit: only if not debit (debit takes priority to handle "deducted...added to EMI" edge case)
    const isCredited = !isDebited && (
      snippetLower.includes('credited') ||
      snippetLower.includes('deposited') ||
      snippetLower.includes('received a credit') ||
      snippetLower.includes('added to your account')
    );
    
    const transactionType = isDebited 
      ? 'debited' 
      : isCredited 
      ? 'credited' 
      : 'unknown';

    // Regex handles all formats:
    // Rs.10.00 | Rs. INR 16280.00 | Rs.INR 71200.00 | INR 33700.00
    const amountMatch = (snippet || '').match(/(?:rs\.?\s*(?:inr\s*)?|inr\s+)[\d,]+(?:\.\d{1,2})?/i);
    console.log(`Parsing Gmail transaction: "${snippet}" | Detected amount: ${amountMatch ? amountMatch[0] : 'none'} | Type: ${transactionType}`);
    const amount = amountMatch 
      ? parseFloat(amountMatch[0].replace(/rs\.?\s*/i, '').replace(/inr\s*/i, '').replace(/,/g, ''))
      : null;
    console.log(`Parsed amount: ${amount} | Transaction type: ${transactionType} | Raw date: ${rawDate}`);

    const dateFromHeader = rawDate ? new Date(rawDate) : null;
    let transactionDate = dateFromHeader && !isNaN(dateFromHeader.getTime()) ? dateFromHeader : null;

    const refNoMatch = (snippet || '').match(/UPI\s*(?:transaction\s*)?(?:reference\s*no\.?:?\s*|Ref\.?\s*No\.?\s*:?\s*)(\d{6,20})/i);
    const refNo = refNoMatch ? refNoMatch[1] : null;

    return {
      amount,
      transactionType: transactionType as 'debited' | 'credited' | 'unknown',
      transactionDate,
      cardType,
      refNo,
    };
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
    console.log(`Starting Gmail sync for user ${userId} | Start: ${startDate} | End: ${endDate}`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    if (endDate < startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
    oauth2Client.setCredentials({ refresh_token: user.googleRefreshToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const query = this.buildGmailQuery(startDate, endDate);
    console.log(`Gmail sync query: "${query}"`);

    // Paginate through all matching messages (Gmail returns max 500 per page, newest first)
    const allMessages: { id?: string; threadId?: string }[] = [];
    let pageToken: string | undefined = undefined;
    do {
      const listResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500,
        ...(pageToken ? { pageToken } : {}),
      });
      const page = listResponse.data.messages || [];
      allMessages.push(...page);
      pageToken = listResponse.data.nextPageToken ?? undefined;
    } while (pageToken);
    console.log(`Total emails found: ${allMessages.length}`);
    const messages = allMessages;
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
      console.log(`Processing email: ${messageMeta.id} | Subject: "${headerMap.subject}" | From: "${headerMap.from}" | Date: "${headerMap.date}"`);
      const subject = headerMap.subject || '';
      const from = headerMap.from || '';
      const date = headerMap.date || '';
      const body = this.decodeMessageBody(message.data.payload);
      const snippet = message.data.snippet || '';
      console.log(`Fetched email: ${messageMeta.id} | Subject: "${subject}" | From: "${from}" | Date: "${date}" | Snippet: "${snippet}"`);

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
    });

    const syncRecord = this.gmailSyncRepository.create({
      userId,
      startDate,
      endDate,
    });

    const savedSyncRecord = await this.gmailSyncRepository.save(syncRecord);

    const gmailTransactions = [];
    for (const email of emails) {
      if (!email.messageId) {
        continue;
      }

      const existingTransaction = await this.gmailTransactionRepository.findOne({
        where: { messageId: email.messageId },
      });
      if (existingTransaction) {
        continue;
      }

      const parsed = this.parseGmailTransaction(email.snippet, email.date);
      const gmailTransaction = this.gmailTransactionRepository.create({
        userId,
        gmailSyncId: savedSyncRecord.id,
        messageId: email.messageId,
        subject: email.subject,
        fromAddress: email.from,
        snippet: email.snippet,
        rawDate: email.date,
        transactionDate: parsed.transactionDate,
        amount: parsed.amount,
        transactionType: parsed.transactionType,
        cardType: parsed.cardType,
        refNo: parsed.refNo,
        isClassifiedReason: false,
        isRejected: false,
      });
      gmailTransactions.push(gmailTransaction);
    }

    let savedGmailTransactions: GmailTransaction[] = [];
    if (gmailTransactions.length > 0) {
      savedGmailTransactions = await this.gmailTransactionRepository.save(gmailTransactions);
    }

    // Auto-create Transaction records for valid gmail transactions (debited/credited, debit card)
    for (const gmailTx of savedGmailTransactions) {
      if (
        (gmailTx.transactionType === 'debited' || gmailTx.transactionType === 'credited') &&
        gmailTx.cardType === 'debit' &&
        gmailTx.amount !== null
      ) {
        let transactionDate: Date;
        if (gmailTx.transactionDate) {
          const d = new Date(gmailTx.transactionDate);
          transactionDate = isNaN(d.getTime()) ? new Date() : d;
        } else {
          transactionDate = new Date();
        }
        const istDate = new Date(transactionDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const month = istDate.getMonth() + 1;
        const year = istDate.getFullYear();
        const txType: 'debit' | 'credit' = gmailTx.transactionType === 'credited' ? 'credit' : 'debit';

        const newTransaction = this.transactionRepository.create({
          amount: Number(gmailTx.amount),
          transactionType: txType,
          userId,
          transactionDate,
          month,
          year,
          refNo: gmailTx.refNo ?? null,
          createdAt: gmailTx.rawDate ? new Date(gmailTx.rawDate) : new Date(),
        });
        const savedTransaction = await this.transactionRepository.save(newTransaction);

        // Ensure a monthly budget exists for this month/year; auto-create via carry-forward if needed
        await this.ensureMonthlyBudgetExists(userId, month, year);

        // Update monthly budget totalSpent immediately (no expenseReason yet, so allocation is skipped)
        const amountChange = txType === 'credit' ? -Number(gmailTx.amount) : Number(gmailTx.amount);
        await this.updateBudgetAllocation(userId, null, month, year, amountChange, txType);

        // Link gmail transaction to the created transaction and mark as classified
        gmailTx.transactionId = savedTransaction.id;
        gmailTx.isClassifiedReason = true;
        await this.gmailTransactionRepository.save(gmailTx);
      }
    }

    user.lastGmailSync = new Date();
    await this.userRepository.save(user);

    return { emails, messageCount: emails.length };
  }

  async getPendingGmailTransactions(userId: number) {
    return this.gmailTransactionRepository.find({
      where: { userId, isRejected: false, isClassifiedReason: false, cardType: 'debit', transactionType: In(['debited', 'credited']) },
      order: { createdAt: 'DESC' },
    });
  }

  async classifyGmailTransaction(userId: number, transactionId: number, expenseReasonId: number, notes?: string) {
    const gmailTransaction = await this.gmailTransactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!gmailTransaction) {
      throw new BadRequestException('Gmail transaction not found');
    }
    if (gmailTransaction.isRejected) {
      throw new BadRequestException('This transaction has already been rejected');
    }
    if (gmailTransaction.isClassifiedReason) {
      throw new BadRequestException('This transaction has already been classified');
    }

    const expenseReason = await this.expenseReasonsService.findOne(userId, expenseReasonId);
    if (!expenseReason) {
      throw new BadRequestException('Expense reason not found or unauthorized');
    }
    if (gmailTransaction.amount === null || gmailTransaction.amount === undefined) {
      throw new BadRequestException('Unable to classify transaction without an amount');
    }

    // Use the same transaction creation logic as Add Expense page
    if (gmailTransaction.transactionType === 'debited' || gmailTransaction.transactionType === 'credited') {
      let transactionDate: Date;
      if (gmailTransaction.transactionDate) {
        const dateObj = new Date(gmailTransaction.transactionDate);
        transactionDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
      } else {
        transactionDate = new Date();
      }
      // Calculate month/year in IST (UTC+5:30) to avoid day-boundary mismatches
      const istDate = new Date(transactionDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const month = istDate.getMonth() + 1;
      const year = istDate.getFullYear();

      const isCredit = gmailTransaction.transactionType === 'credited';
      const transactionType: 'debit' | 'credit' = isCredit ? 'credit' : 'debit';

      const newTransaction = this.transactionRepository.create({
        amount: Number(gmailTransaction.amount),
        transactionType,
        userId,
        transactionDate,
        month,
        year,
        expenseReasonId,
        categoryId: expenseReason.categoryId,
        notes: notes || null,
        createdAt: gmailTransaction.rawDate ? new Date(gmailTransaction.rawDate) : new Date(),
      });

      await this.transactionRepository.save(newTransaction);
      // For credits, subtract from spent amount (refund/income reduces expenses)
      const amountChange = isCredit ? -Number(gmailTransaction.amount) : Number(gmailTransaction.amount);
      await this.updateBudgetAllocation(userId, expenseReasonId, month, year, amountChange, transactionType );
    }

    // Mark Gmail transaction as classified
    gmailTransaction.expenseReasonId = expenseReasonId;
    gmailTransaction.isClassifiedReason = true;
    return this.gmailTransactionRepository.save(gmailTransaction);
  }

  async rejectGmailTransaction(userId: number, transactionId: number) {
    const gmailTransaction = await this.gmailTransactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!gmailTransaction) {
      throw new BadRequestException('Gmail transaction not found');
    }
    if (gmailTransaction.isClassifiedReason) {
      throw new BadRequestException('Cannot reject a classified transaction');
    }

    gmailTransaction.isRejected = true;
    return this.gmailTransactionRepository.save(gmailTransaction);
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
        -Number(oldAmount),
        ""
      );

      // Add new amount to new expense reason
      const newExpenseReasonId = updateTransactionDto.expenseReasonId || oldExpenseReasonId;
      const newAmount = updateTransactionDto.amount || Number(oldAmount);
      await this.updateBudgetAllocation(
        transaction.userId,
        newExpenseReasonId,
        transaction.month,
        transaction.year,
        newAmount,
        ""
      );
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const transaction = await this.findOne(id);

    // Delete the linked GmailTransaction record (sourced from email parsing) along with the transaction
    const gmailTx = await this.gmailTransactionRepository.findOne({
      where: { transactionId: id, userId: transaction.userId },
    });
    if (gmailTx) {
      await this.gmailTransactionRepository.delete(gmailTx.id);
    }

    await this.transactionRepository.delete(id);

    // Reverse totalSpent (recalculates from remaining transactions in DB).
    // Also reverse allocation.spentAmount if an expense reason was assigned.
    await this.updateBudgetAllocation(
      transaction.userId,
      transaction.expenseReasonId,
      transaction.month,
      transaction.year,
      -Number(transaction.amount),
      transaction.transactionType
    );
  }

  async removeExpenseReason(userId: number, transactionId: number): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId, userId } });
    if (!transaction) throw new BadRequestException('Transaction not found');
    if (!transaction.expenseReasonId) throw new BadRequestException('Transaction has no expense reason assigned');

    const { expenseReasonId, month, year, transactionType, amount } = transaction;

    // Reverse exactly what assign-reason added to budget_allocations.spentAmount.
    // skipTotalSpent=true because the transaction itself stays — only the allocation changes.
    const reverseAmountChange = transactionType === 'credit' ? Number(amount) : -Number(amount);
    await this.updateBudgetAllocation(userId, expenseReasonId, month, year, reverseAmountChange, transactionType, true);

    // Clear reason and category from the transaction
    transaction.expenseReasonId = null;
    transaction.categoryId = null;
    await this.transactionRepository.save(transaction);

    // Clear from linked GmailTransaction if one exists
    const gmailTx = await this.gmailTransactionRepository.findOne({ where: { transactionId, userId } });
    if (gmailTx) {
      gmailTx.expenseReasonId = null;
      await this.gmailTransactionRepository.save(gmailTx);
    }

    return this.findOne(transactionId);
  }

  async getUncategorizedTransactions(userId: number): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId, expenseReasonId: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async assignExpenseReason(
    userId: number,
    transactionId: number,
    expenseReasonId: number,
    notes?: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({ where: { id: transactionId, userId } });
    if (!transaction) throw new BadRequestException('Transaction not found');
    if (transaction.expenseReasonId) throw new BadRequestException('Transaction already has an expense reason assigned');

    const expenseReason = await this.expenseReasonsService.findOne(userId, expenseReasonId);
    if (!expenseReason) throw new BadRequestException('Expense reason not found or unauthorized');

    transaction.expenseReasonId = expenseReasonId;
    transaction.categoryId = expenseReason.categoryId;
    if (notes) transaction.notes = notes;
    await this.transactionRepository.save(transaction);

    // Update allocation.spentAmount only — totalSpent was already updated at sync time
    const txType = transaction.transactionType;
    const amountChange = txType === 'credit' ? -Number(transaction.amount) : Number(transaction.amount);
    await this.updateBudgetAllocation(userId, expenseReasonId, transaction.month, transaction.year, amountChange, txType, true);

    // Update linked gmail transaction expenseReasonId if exists
    const gmailTx = await this.gmailTransactionRepository.findOne({ where: { transactionId, userId } });
    if (gmailTx) {
      gmailTx.expenseReasonId = expenseReasonId;
      await this.gmailTransactionRepository.save(gmailTx);
    }

    return this.findOne(transactionId);
  }

  private async ensureMonthlyBudgetExists(userId: number, month: number, year: number): Promise<void> {
    const existing = await this.monthlyBudgetsService.findByMonthYearOptional(userId, month, year);
    if (existing) return;

    // No budget for this month — find the most recent previous month's budget
    const previous = await this.monthlyBudgetsService.findMostRecentBefore(userId, month, year);
    if (!previous) {
      throw new BadRequestException(
        `No budget data found before ${month}/${year}. Please create a budget manually for this month first.`
      );
    }

    // Carry-forward salary = previous salary − previous totalSpent (remaining balance)
    const carryForwardSalary = Number(previous.salary) - Number(previous.totalSpent);
    await this.monthlyBudgetsService.createCarryForward(userId, month, year, carryForwardSalary);
  }

  private async updateBudgetAllocation(
    userId: number,
    expenseReasonId: number | null,
    month: number,
    year: number,
    amountChange: number,
    transactionType: string,
    skipTotalSpent = false,
  ): Promise<void> {
    const monthlyBudget = await this.monthlyBudgetsService.findByMonthYear(userId, month, year);
    
    if (monthlyBudget) {
      // Only update allocation if we have an expense reason
      if (expenseReasonId) {
        const allocation = await this.budgetAllocationRepository.findOne({
          where: {
            monthlyBudgetId: monthlyBudget.id,
            expenseReasonId,
          },
        });

        if (allocation) {
          if (transactionType === 'credit') {
            allocation.allocatedAmount = Number(allocation.allocatedAmount) - amountChange; 
          } else {
            allocation.spentAmount = Number(allocation.spentAmount) + amountChange;
          }
          await this.budgetAllocationRepository.save(allocation);
        }
      }

      // Update monthly budget total spent unless caller says to skip it
      if (!skipTotalSpent) {
        await this.monthlyBudgetsService.updateTotalSpent(monthlyBudget.id, transactionType, amountChange);
      }
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
      .andWhere('transaction.categoryId IS NOT NULL')
      .groupBy('category.id, category.name, category.type')
      .getRawMany();
  }
}