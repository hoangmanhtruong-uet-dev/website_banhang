import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const allowed = new Set(['src\\lib\\services\\order-state.service.ts']);
const findings = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name)) {
      const rel = relative(root, path);
      if (allowed.has(rel)) continue;
      const source = readFileSync(path, 'utf8');
      const pattern = /(?:prisma|tx)\.order\.(?:update|updateMany)\s*\([\s\S]{0,500}?\bstatus\s*:/g;
      for (const match of source.matchAll(pattern)) findings.push(`${rel}:${source.slice(0, match.index).split('\n').length}`);
    }
  }
}
walk(join(root, 'src'));
walk(join(root, 'tests'));
if (findings.length) {
  console.error(`Forbidden direct Order.status writes:\n${findings.join('\n')}`);
  process.exit(1);
}
console.log('Order state audit: 1 authorized writer, 0 forbidden production writes.');
