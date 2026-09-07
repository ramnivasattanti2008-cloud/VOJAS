const fs = require('fs');
const path = require('path');
let count = 0;
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  // Match all import/export from './foo' (no extension)
  content = content.replace(/(import\s+[^;]*?from\s+|export\s+[^;]*?from\s+|import\(|\brequire\()(['"])(\.[^'"]+)\2/g, (match, prefix, q, p) => {
    if (p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.json') || p.endsWith('.css') || p.endsWith('.mjs') || p.endsWith('.cjs')) return match;
    return prefix + q + p + '.js' + q;
  });
  if (content !== original) { fs.writeFileSync(filePath, content); count++; console.log('Updated:', filePath); }
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('dist') && !entry.name.includes('uploads')) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.ts')) processFile(full);
  }
}
['packages/shared/src', 'packages/domain/src', 'packages/api-client/src', 'apps/api/src'].forEach(d => { if (fs.existsSync(d)) walk(d); });
console.log('Total updated:', count);
