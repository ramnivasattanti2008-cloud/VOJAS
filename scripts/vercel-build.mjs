import { execSync } from 'child_process';
import fs from 'fs';

console.log('🚀 Step 1: Generating Prisma Client...');
try {
  execSync('npx prisma generate --schema=packages/db/prisma/schema.prisma', { stdio: 'inherit' });
} catch (e) {
  console.warn('Prisma generate warning (continuing build):', e.message);
}

console.log('📦 Step 2: Building workspace packages...');
execSync('pnpm -r --filter @vojas/shared --filter @vojas/db --filter @vojas/domain --filter @vojas/api-client build', { stdio: 'inherit' });

console.log('⚡ Step 3: Building Next.js Web App...');
execSync('pnpm --filter @vojas/web build', { stdio: 'inherit' });

console.log('📋 Step 4: Copying apps/web/.next to root .next for Vercel root detection...');
if (fs.existsSync('.next')) {
  fs.rmSync('.next', { recursive: true, force: true });
}
fs.cpSync('apps/web/.next', '.next', { recursive: true });

console.log('🖼️ Step 5: Copying apps/web/public to root public...');
if (fs.existsSync('public')) {
  fs.rmSync('public', { recursive: true, force: true });
}
fs.cpSync('apps/web/public', 'public', { recursive: true });

console.log('✅ VOJAS Vercel Build & Sync Complete!');
