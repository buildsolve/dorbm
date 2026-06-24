import { readFileSync } from 'fs';

// Simple raw text extraction from PDF - finds readable strings
const buf = readFileSync('C:\\Users\\User\\Desktop\\trello tasks.pdf');
const str = buf.toString('latin1');

// Extract text between BT (begin text) and ET (end text) PDF operators
const textBlocks = [];
const btEtRegex = /BT([\s\S]*?)ET/g;
let match;
while ((match = btEtRegex.exec(str)) !== null) {
  const block = match[1];
  // Extract strings in parentheses (literal strings in PDF)
  const strRegex = /\(([^)]{1,200})\)/g;
  let sm;
  const parts = [];
  while ((sm = strRegex.exec(block)) !== null) {
    const s = sm[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\\/g, '\\').trim();
    if (s && s.length > 1 && /[a-zA-ZäöüÄÖÜß]/.test(s)) parts.push(s);
  }
  if (parts.length) textBlocks.push(parts.join(' '));
}

// Deduplicate and print
const seen = new Set();
let count = 0;
for (const block of textBlocks) {
  if (!seen.has(block) && count < 300) {
    seen.add(block);
    console.log(block);
    count++;
  }
}
