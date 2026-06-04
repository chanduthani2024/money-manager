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

      // Group items by Y bucket (tolerance=4pt) so slight vertical offsets in the same
      // table row don't split into separate lines. Snap Y to nearest multiple of 4.
      const lineMap = new Map<number, { x: number; str: string }[]>();
      for (const item of content.items as any[]) {
        const rawY = item.transform[5] as number;
        const y = Math.round(rawY / 4) * 4;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push({ x: item.transform[4] as number, str: item.str as string });
      }

      // Sort Y descending (top of page = highest Y in PDF coordinate space)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      const pageLines: string[] = [];
      for (const y of sortedYs) {
        const sorted = lineMap.get(y)!.sort((a, b) => a.x - b.x);
        const lineText = sorted.map(it => it.str).join(' ').replace(/\s{2,}/g, ' ').trim();
        if (lineText) pageLines.push(lineText);
      }

      fullText += pageLines.join('\n') + '\n\n';
    }

    doc.destroy();

    console.log(`[HdfcParser] Extracted text sample (first 3000 chars):\n${fullText.slice(0, 3000)}`);

    return this.parseText(fullText);
  }

  parseText(text: string): ParsedBankTransaction[] {
    // 1. Strip "STATEMENT SUMMARY" and everything after it — the last real transaction
    //    ends just before this section and must not be contaminated by it.
    const withoutSummary = text.replace(/STATEMENT SUMMARY\s*:-[\s\S]*/i, '');

    // 2. Strip per-page footer: "HDFC BANK LIMITED" followed by boilerplate disclaimer
    //    text appears at the bottom of every page in the pdfjs Y-sorted output (y=52 and below).
    //    Without stripping, it bleeds into the last transaction's block on each page.
    const withoutFooter = withoutSummary.replace(/HDFC BANK LIMITED[\s\S]*?(?=\d{2}\/\d{2}\/\d{2,4}\s|$)/gi, '\n');

    // 3. Strip repeating page header blocks (start at "Page No .:", end just
    //    before the next date line or end of string).
    const cleaned = withoutFooter.replace(/Page No\s*\.\s*:[\s\S]*?(?=\d{2}\/\d{2}\/\d{2,4}\s|$)/g, '\n');

    const lines = cleaned
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const TX_DATE_RE = /^(\d{2}\/\d{2}\/\d{2,4})\s+(.*)/;

    // Data line: REF(10-20 alphanum)  VALUE-DATE  AMOUNT  BALANCE
    // e.g. "0000217659586301 01/05/26 2,000.00 69,102.56"
    const DATA_LINE_RE = /[\dA-Z]{10,20}\s+\d{2}\/\d{2}\/\d{2,4}\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:\s|$)/;

    // Amount pattern: handles both plain (300.00) and Indian-comma (1,675.00) formats
    const AMOUNT_RE = /(?<![\/\d])((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})(?!\d)/g;

    // Build blocks: each block starts at a TX date line
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

      // Skip genuine header / balance-summary lines (bogus date lines from page headers).
      // Only check block[0] — the date line itself. Checking the full block would
      // false-positive on "*Closing balance includes funds earmarked..." footer text.
      if (/opening balance|closing balance|statement of account/i.test(block[0])) continue;

      let txAmount: number | null = null;
      let closingBalance: number | null = null;

      // Strategy 1: search ALL lines (including the first) for the DATA_LINE_RE pattern.
      // This handles both split-row and single-row pdfjs extraction.
      for (const line of block) {
        const m = line.match(DATA_LINE_RE);
        if (m) {
          txAmount = parseFloat(m[1].replace(/,/g, ''));
          closingBalance = parseFloat(m[2].replace(/,/g, ''));
          break;
        }
      }

      // Strategy 2: full block scan — join all lines and take the last two amounts.
      // Catches cases where pdfjs merges ref+amounts onto the date line.
      if (txAmount === null) {
        const blockFull = block.join(' ');
        const allAmounts = [...blockFull.matchAll(AMOUNT_RE)].map(m => parseFloat(m[1].replace(/,/g, '')));
        if (allAmounts.length >= 2) {
          closingBalance = allAmounts[allAmounts.length - 1];
          txAmount = allAmounts[allAmounts.length - 2];
        }
      }

      if (txAmount === null || closingBalance === null) continue;
      if (txAmount <= 0 || txAmount > 10_000_000) continue;

      // Narration: everything that isn't a data-line or date
      const narrationParts = block.filter(l => !DATA_LINE_RE.test(l));
      const narration = narrationParts
        .join(' ')
        .replace(AMOUNT_RE, '')
        .replace(/\d{2}\/\d{2}\/\d{2,4}/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      const blockText = block.join(' ');
      const refNo = this.extractRefNo(blockText);
      const transactionType = this.detectTransactionType(blockText);

      raw.push({ date: txDate, narration, refNo, amount: txAmount, transactionType, closingBalance });
    }

    console.log(`[HdfcParser] raw parsed rows before balance-check: ${raw.length}`);

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
    // 1. Explicit "UPI transaction reference no." pattern
    const explicitRef = text.match(/UPI\s*(?:transaction\s*)?(?:reference\s*no\.?:?\s*|Ref\.?\s*No\.?\s*:?\s*)(\d{6,20})/i);
    if (explicitRef) return explicitRef[1];

    // 2. NEFT/IMPS/RTGS reference
    const neftMatch = text.match(/(?:NEFT|IMPS|RTGS)[^\d]*(\d{9,22})/i);
    if (neftMatch) return neftMatch[1];

    // 3. Extract from data-line ref field: 16-digit number with leading zeros → strip them.
    // e.g. "0000304278788056" → "304278788056". Avoids phone numbers (no leading zeros).
    const dataRef = text.match(/\b0{2,6}(\d{9,14})\b/);
    if (dataRef) return dataRef[1];

    // 4. Narration continuation pattern: "XXXXXXX-123456789012-PAYMENT|PAID|MANDATE"
    const narratRef = text.match(/-(\d{10,16})-(?:PAYMENT|PAID|UPI|MANDATE)/i);
    if (narratRef) return narratRef[1];

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
