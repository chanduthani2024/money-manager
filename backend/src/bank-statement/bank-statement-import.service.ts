import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { BankStatementImport } from '../entities/bank-statement-import.entity';
import { BankSettings } from '../entities/bank-settings.entity';
import { MonthlyBudgetsService } from '../monthly-budgets/monthly-budgets.service';
import { HdfcParser } from './parsers/hdfc.parser';
import { ImportResult } from './dto/import-statement.dto';

@Injectable()
export class BankStatementImportService {
  private readonly parsers = {
    HDFC: new HdfcParser(),
  };

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(BankStatementImport)
    private importRepository: Repository<BankStatementImport>,
    @InjectRepository(BankSettings)
    private bankSettingsRepository: Repository<BankSettings>,
    private monthlyBudgetsService: MonthlyBudgetsService,
  ) {}

  async importFromPdf(
    userId: number,
    pdfBuffer: Buffer,
    bankSettingsId: number,
  ): Promise<ImportResult> {
    const bankSettings = await this.bankSettingsRepository.findOne({
      where: { id: bankSettingsId, userId, isActive: true },
    });
    if (!bankSettings) throw new BadRequestException('Bank settings not found');

    const parser = this.parsers[bankSettings.bankName as keyof typeof this.parsers];
    if (!parser) {
      throw new BadRequestException(`No parser available for bank: ${bankSettings.bankName}`);
    }

    // Create import record
    const importRecord = this.importRepository.create({
      userId,
      bankName: bankSettings.bankName,
      accountLastFour: bankSettings.accountLastFour,
      status: 'processing',
    });
    await this.importRepository.save(importRecord);

    try {
      const password = bankSettings.pdfPassword?.trim() || undefined;
      const rows = await parser.parse(pdfBuffer, password);

      let importedCount = 0;
      let skippedCount = 0;

      // Determine period from parsed rows
      const dates = rows.map(r => r.date).filter(d => d instanceof Date && !isNaN(d.getTime()));
      if (dates.length > 0) {
        importRecord.periodStart = new Date(Math.min(...dates.map(d => d.getTime())));
        importRecord.periodEnd = new Date(Math.max(...dates.map(d => d.getTime())));
      }

      for (const row of rows) {
        const isDuplicate = await this.isDuplicate(userId, row.refNo, row.date, row.amount);
        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        const txDate = row.date;
        const istDate = new Date(txDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const month = istDate.getMonth() + 1;
        const year = istDate.getFullYear();

        // Ensure a monthly budget exists for this month/year
        await this.ensureMonthlyBudgetExists(userId, month, year);

        const transaction = this.transactionRepository.create({
          userId,
          amount: row.amount,
          transactionType: row.transactionType,
          transactionDate: txDate,
          month,
          year,
          notes: row.narration.slice(0, 255) || null,
          refNo: row.refNo,
        });
        await this.transactionRepository.save(transaction);

        // Update monthly budget totalSpent
        const amountChange = row.transactionType === 'credit' ? -row.amount : row.amount;
        await this.updateMonthlyTotalSpent(userId, month, year, row.transactionType, amountChange);

        importedCount++;
      }

      importRecord.totalRows = rows.length;
      importRecord.importedCount = importedCount;
      importRecord.skippedCount = skippedCount;
      importRecord.status = 'completed';
      await this.importRepository.save(importRecord);

      return {
        importId: importRecord.id,
        bankName: bankSettings.bankName,
        totalRows: rows.length,
        importedCount,
        skippedCount,
        status: 'completed',
      };
    } catch (err: any) {
      const rawMsg: string = err.message ?? '';
      let friendlyMsg: string;

      if (/no password given/i.test(rawMsg)) {
        friendlyMsg = 'This PDF is password-protected. Please add the PDF password in Settings → Bank Accounts for this bank.';
      } else if (/incorrect password/i.test(rawMsg) || /bad user password/i.test(rawMsg)) {
        friendlyMsg = 'Incorrect PDF password. Please update it in Settings → Bank Accounts.';
      } else if (/encrypted/i.test(rawMsg)) {
        friendlyMsg = 'PDF is encrypted. Please add the correct password in Settings → Bank Accounts.';
      } else {
        friendlyMsg = rawMsg || 'Failed to parse PDF. Make sure it is a valid bank statement.';
      }

      importRecord.status = 'failed';
      importRecord.errorMessage = friendlyMsg;
      await this.importRepository.save(importRecord);

      return {
        importId: importRecord.id,
        bankName: bankSettings.bankName,
        totalRows: 0,
        importedCount: 0,
        skippedCount: 0,
        status: 'failed',
        errorMessage: friendlyMsg,
      };
    }
  }

  async getImportHistory(userId: number): Promise<BankStatementImport[]> {
    return this.importRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  private async isDuplicate(
    userId: number,
    refNo: string | null,
    date: Date,
    amount: number,
  ): Promise<boolean> {
    // Primary check: same refNo (catches UPI transactions already synced from email)
    if (refNo) {
      const existing = await this.transactionRepository.findOne({
        where: { userId, refNo },
      });
      if (existing) return true;
    }

    // Fallback: same date + same amount + same user within a tight window (non-UPI)
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const exactMatch = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .andWhere('t.transactionDate >= :dayStart', { dayStart })
      .andWhere('t.transactionDate <= :dayEnd', { dayEnd })
      .andWhere('t.amount = :amount', { amount })
      .andWhere('t.refNo IS NULL') // only match when no refNo (avoid collision with UPI check above)
      .getOne();

    return !!exactMatch;
  }

  private async ensureMonthlyBudgetExists(userId: number, month: number, year: number): Promise<void> {
    const existing = await this.monthlyBudgetsService.findByMonthYearOptional(userId, month, year);
    if (existing) return;

    const previous = await this.monthlyBudgetsService.findMostRecentBefore(userId, month, year);
    if (!previous) return; // no budget at all — silently skip totalSpent update

    const carryForward = Number(previous.salary) - Number(previous.totalSpent);
    await this.monthlyBudgetsService.createCarryForward(userId, month, year, carryForward);
  }

  private async updateMonthlyTotalSpent(
    userId: number,
    month: number,
    year: number,
    transactionType: string,
    amountChange: number,
  ): Promise<void> {
    const budget = await this.monthlyBudgetsService.findByMonthYear(userId, month, year);
    if (budget) {
      await this.monthlyBudgetsService.updateTotalSpent(budget.id, transactionType, amountChange);
    }
  }
}
