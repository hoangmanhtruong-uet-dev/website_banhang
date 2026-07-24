import { readFileSync } from 'node:fs';

const targets = [
  'src/lib/services/order.service.ts',
  'src/lib/services/payment.service.ts',
  'src/lib/services/late-payment-refund.service.ts',
  'src/lib/services/outbox-consumers.ts',
];
const forbidden = [
  ['parseFloat', /\bparseFloat\s*\(/],
  ['Decimal.toNumber', /\.toNumber\s*\(/],
  ['Number.EPSILON', /Number\.EPSILON/],
  ['Number(amount)', /Number\s*\(\s*[^)]*(amount|price|total|balance)/i],
];
const findings = [];
for (const file of targets) {
  const source = readFileSync(file, 'utf8');
  for (const [name, pattern] of forbidden) if (pattern.test(source)) findings.push(`${file}: ${name}`);
}
const schema = readFileSync('prisma/schema.prisma', 'utf8');
for (const line of schema.split(/\r?\n/)) {
  if (/\bFloat\b/.test(line) && /price|amount|total|discount|balance|fee|tax/i.test(line)) findings.push(`prisma/schema.prisma: monetary Float: ${line.trim()}`);
}
if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Money static verification passed');
}
