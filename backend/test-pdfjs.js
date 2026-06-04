const PDFJS = require('pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js');
PDFJS.disableWorker = true;
const fs = require('fs');

async function main() {
  const buf = fs.readFileSync('/Users/Chandu/Downloads/Acct Statement_6562_28052026_18.22.53.pdf');
  const src = { data: new Uint8Array(buf), password: '214263247' };
  const doc = await PDFJS.getDocument(src);
  console.log(`Pages: ${doc.numPages}`);

  let fullText = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();

    const lineMap = new Map();
    for (const item of content.items) {
      const rawY = item.transform[5];
      const y = Math.round(rawY / 4) * 4;
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push({ x: item.transform[4], str: item.str });
    }

    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
    const pageLines = [];
    for (const y of sortedYs) {
      const sorted = lineMap.get(y).sort((a, b) => a.x - b.x);
      const lineText = sorted.map(it => it.str).join(' ').replace(/\s{2,}/g, ' ').trim();
      if (lineText) pageLines.push({ y, lineText });
    }

    console.log(`\n=== PAGE ${i} (${pageLines.length} lines) ===`);
    pageLines.forEach((l, idx) => {
      const flag = (l.lineText.includes('1,675') || l.lineText.includes('25.00') ||
                    l.lineText.includes('Page No') || l.lineText.includes('JUNED') ||
                    l.lineText.includes('SONELAL')) ? ' <<<' : '';
      console.log(`  [${idx}] y=${l.y}: ${l.lineText}${flag}`);
    });

    fullText += pageLines.map(l => l.lineText).join('\n') + '\n\n';
  }

  doc.destroy();

  console.log('\n=== REGEX TEST ===');
  const DATA_LINE_RE = /[\dA-Z]{10,20}\s+\d{2}\/\d{2}\/\d{2,4}\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?:\s|$)/;
  const AMOUNT_RE = /(?<![\/\d])((?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2})(?!\d)/g;

  const lines = fullText.split('\n').filter(l => l.trim());
  lines.forEach((line, i) => {
    if (line.includes('1,675') || line.includes('JUNED') || line.includes('25.00') || line.includes('SONELAL')) {
      const dm = line.match(DATA_LINE_RE);
      const amounts = [...line.matchAll(AMOUNT_RE)].map(m => m[1]);
      console.log(`Line [${i}]: ${JSON.stringify(line)}`);
      console.log(`  DATA_LINE_RE: ${dm ? JSON.stringify([dm[1], dm[2]]) : 'NO MATCH'}`);
      console.log(`  AMOUNT_RE matches: ${JSON.stringify(amounts)}`);
    }
  });

  // Also show the full cleaned text for debug
  console.log('\n=== FULL TEXT (checking page-footer strip) ===');
  const withoutSummary = fullText.replace(/STATEMENT SUMMARY\s*:-[\s\S]*/i, '');
  const cleaned = withoutSummary.replace(/Page No\s*\.\s*:[\s\S]*?(?=\d{2}\/\d{2}\/\d{2,4}\s|$)/g, '\n');
  const cleanedLines = cleaned.split('\n').map(l => l.trim()).filter(l => l);
  cleanedLines.forEach((line, i) => {
    if (line.includes('1,675') || line.includes('JUNED') || line.includes('25.00') || line.includes('SONELAL')) {
      console.log(`  CleanedLine[${i}]: ${JSON.stringify(line)}`);
      // show surrounding context
      for (let j = Math.max(0,i-2); j <= Math.min(cleanedLines.length-1, i+2); j++) {
        console.log(`    [${j}]: ${JSON.stringify(cleanedLines[j])}`);
      }
    }
  });
}

main().catch(console.error);
