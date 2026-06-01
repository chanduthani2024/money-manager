// Use the pdfjs build bundled with pdf-parse so we can pass password directly.
// pdf-parse v1.x ignores the password option — it calls getDocument(buffer) without it.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFJS = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
PDFJS.disableWorker = true;

import { BankParser, ParsedBankTransaction } from './bank-parser.interface';

export class HdfcParser implements BankParser {
  readonly bankName = 'HDFC';

  async parse(pdfBuffer: Buffer, password?: string): Promise<ParsedBankTransaction[]> {
    console.log(`[HdfcParser] Parsing PDF | password provided: ${!!password}`);
    const src: Record<string, any> = { data: new Uint8Array(pdfBuffer) };
    if (password) src.password = password;

    const doc = await PDFJS.getDocument(src);
    console.log(`[HdfcParser] PDF opened successfully | pages: ${doc.numPages}`);

    let fullText = '';

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();

      // Group items by rounded Y (tolerance=2) so float differences don't split same visual row
      const lineMap = new Map<number, { x: number; str: string }[]>();
      for (const item of content.items as any[]) {
        const rawY = item.transform[5] as number;
        // Snap to nearest even number so items within 2 pts merge into one bucket
        const y = Math.round(rawY / 2) * 2;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push({ x: item.transform[4] as number, str: item.str as string });
      }

      // Sort Y descending (top of page = highest Y in PDF coordinate space)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      const pageLines: string[] = [];
      for (const y of sortedYs) {
        // Sort items left-to-right by X within each line
        const sorted = lineMap.get(y)!.sort((a, b) => a.x - b.x);
        const lineText = sorted.map(it => it.str).join(' ').replace(/\s{2,}/g, ' ').trim();
        if (lineText) pageLines.push(lineText);
      }

      fullText += pageLines.join('\n') + '\n\n';
    }

    doc.destroy();

    // Log extracted text for debugging
    console.log(`[HdfcParser] Extracted text sample (first 3000 chars):\n${fullText.slice(0, 3000)}`);

    return this.parseText(fullText);
  }

  parseText(text: string): ParsedBankTransaction[] {
    // Strip repeating page footer/header blocks (account info that appears on every page).
    // These start at "Page No .:" and end just before the next transaction date line.
    const cleaned = text.replace(/Page No\s*\.\s*:[\s\S]*?(?=\d{2}\/\d{2}\/\d{2,4}\s|$)/g, '\n');

    const lines = cleaned
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const TX_DATE_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+(.*)/;

    // "Data line": starts with ref-no (10-16 digits or alphanum) then value-date then amount then balance
    // e.g. "0000217659586301 01/05/26 2,000.00 69,102.56"
    // e.g. "SBIN426135855698 15/05/26 19,831.00 23,759.18"
    const DATA_LINE_RE = /^[\dA-Z]{10,20}\s+\d{2}\/\d{2}\/\d{2,4}\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/;

    // Amount pattern for fallback extraction from inline lines
    const AMOUNT_RE = /(?<![\/\d])((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})(?!\d)/g;

    // Build blocks: each block starts at a date line
    const blocks: string[][] = [];
    let current: string[] | null = null;

    for (const line of lines) {
      if (TX_DATE_RE.test(line)) {
        if (current) blocks.push(current);
        current = [line];
      } else {
        if (current) current.push(line);
      }
    }
    if (current) blocks.push(current);

    console.log(`[HdfcParser] parseText: ${lines.length} lines → ${blocks.length} date-blocks`);

    const raw: ParsedBankTransaction[] = [];

    for (const block of blocks) {
      const dateMatch = block[0].match(TX_DATE_RE);
      if (!dateMatch) continue;

      const txDate = this.parseDate(dateMatch[1]);
      if (!txDate) continue;

      const firstLineRest = dateMatch[2];

      // Skip header / summary lines
      if (/opening balance|closing balance|statement of account|statement summary/i.test(block.join(' '))) continue;

      // Strategy 1: find the dedicated "data line" inside the block (non-date continuation lines)
      let txAmount: number | null = null;
      let closingBalance: number | null = null;

      for (let i = 1; i < block.length; i++) {
        const m = block[i].match(DATA_LINE_RE);
        if (m) {
          txAmount = parseFloat(m[1].replace(/,/g, ''));
          closingBalance = parseFloat(m[2].replace(/,/g, ''));
          break;
        }
      }

      // Strategy 2: single-line — extract last two amounts from the date line itself
      if (txAmount === null) {
        const allAmounts = [...firstLineRest.matchAll(AMOUNT_RE)].map(m => parseFloat(m[1].replace(/,/g, '')));
        if (allAmounts.length >= 2) {
          closingBalance = allAmounts[allAmounts.length - 1];
          txAmount = allAmounts[allAmounts.length - 2];
        }
      }

      if (txAmount === null || closingBalance === null) continue;
      if (txAmount <= 0 || txAmount > 10_000_000) continue;

      // Collect narration: everything that isn't a data-line or a footer artifact
      const narrationParts = [firstLineRest, ...block.slice(1).filter(l => !DATA_LINE_RE.test(l))];
      const narration = narrationParts
        .join(' ')
        .replace(AMOUNT_RE, '')
        .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      // Ref no extraction
      const blockText = block.join(' ');
      const refNo = this.extractRefNo(blockText);

      // Keyword-based credit/debit (will be refined by balance-comparison below)
      const transactionType = this.detectTransactionType(blockText);

      raw.push({ date: txDate, narration, refNo, amount: txAmount, transactionType, closingBalance });
    }

    console.log(`[HdfcParser] raw parsed rows before balance-check: ${raw.length}`);

    // Refine credit/debit using consecutive closing balance comparison
    // This is more reliable than keyword matching for HDFC statements
    return raw.map((tx, i) => {
      const prevBalance = i === 0 ? null : raw[i - 1].closingBalance;
      if (prevBalance !== null) {
        const expectCredit = Math.abs(prevBalance + tx.amount - tx.closingBalance);
        const expectDebit  = Math.abs(prevBalance - tx.amount - tx.closingBalance);
        if (expectCredit < 2) return { ...tx, transactionType: 'credit' };
        if (expectDebit  < 2) return { ...tx, transactionType: 'debit' };
      }
      return tx;
    });
  }

  private extractRefNo(text: string): string | null {
    // UPI reference: UPI/316001234567/... or UPI-CR/316001234567/...
    const upiMatch = text.match(/UPI[-\/](?:CR[-\/]|DR[-\/])?(\d{9,15})/i);
    if (upiMatch) return upiMatch[1];

    // NEFT/IMPS reference number (standalone long digit string)
    const neftMatch = text.match(/(?:NEFT|IMPS|RTGS)[^\d]*(\d{9,22})/i);
    if (neftMatch) return neftMatch[1];

    // Standalone ref number line (9-15 digits)
    const standaloneMatch = text.match(/\b(\d{9,15})\b/);
    if (standaloneMatch) return standaloneMatch[1];

    return null;
  }

  private detectTransactionType(text: string): 'debit' | 'credit' {
    // Credit indicators
    if (/UPI-CR|NEFT-CR|RTGS-CR|IMPS-CR|credit|salary|refund|cashback|interest cr/i.test(text)) {
      return 'credit';
    }
    return 'debit';
  }

  private parseDate(dateStr: string): Date | null {
    // Handles DD/MM/YY or DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;

    const d = new Date(year, month, day);
    return isNaN(d.getTime()) ? null : d;
  }
}
