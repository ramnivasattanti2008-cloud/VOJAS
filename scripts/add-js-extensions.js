const fs = require('fs');
const path = require('path');
let count = 0;
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  const regex = /((?:import\s+(?:(?:\{[^}]*\}|[a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*,\s*(?:\{[^}]*\}|[a-zA-Z_$][a-zA-Z0-9_$]*))*(?:\s*,\s*)?|default\s+[a-zA-Z_$][a-zA-Z0-9_$]*)?|export\s+(?:\*|{}\s+))\s+from\s+)'((\.[^']+))'/g;
  content = content.replace(regex, (match, prefix, p) => {
    if (p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.json') || p.endsWith('.css')) return match;
    return prefix + "'" + p + ".js'";
  });
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    count++;
    console.log('Updated:', filePath);
  }
}
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.includes('node_modules') && !entry.name.includes('dist')) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.ts')) processFile(full);
  }
}
['packages/shared/src', 'packages/domain/src', 'packages/api-client/src', 'apps/api/src'].forEach(d => { if (fs.existsSync(d)) walk(d); });
console.log('Total updated:', count);
