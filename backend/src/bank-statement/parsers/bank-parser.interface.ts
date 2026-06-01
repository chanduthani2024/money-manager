export interface ParsedBankTransaction {
  date: Date;
  narration: string;
  refNo: string | null;
  amount: number;
  transactionType: 'debit' | 'credit';
  closingBalance: number;
}

export interface BankParser {
  bankName: string;
  parse(pdfBuffer: Buffer, password?: string): Promise<ParsedBankTransaction[]>;
}
