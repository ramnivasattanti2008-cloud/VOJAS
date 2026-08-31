#!/usr/bin/env node
/**
 * VOJAS Quick Deployment
 * One-command setup for all platforms
 * 
 * This script:
 * 1. Checks your git is ready
 * 2. Generates secrets
 * 3. Creates deployment configs
 * 4. Provides copy-paste instructions for each platform
 * 
 * Run: node quick-deploy.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(type, msg) {
  const icons = { info: 'ℹ', success: '✓', error: '✗', warn: '⚠' };
  const colors_map = { info: 'blue', success: 'green', error: 'red', warn: 'yellow' };
  const color = colors[colors_map[type]];
  console.log(`${color}${icons[type]}${colors.reset} ${msg}`);
}

function section(title) {
  console.log(`\n${colors.bright}${colors.cyan}╭─ ${title}${colors.reset}\n`);
}

function checkGitReady() {
  try {
    // Check if git is initialized
    execSync('git rev-parse --git-dir', { stdio: 'pipe' });
    
    // Check if repo is pushed
    const output = execSync('git remote -v', { encoding: 'utf-8' });
    if (!output.includes('github.com')) {
      log('error', 'GitHub remote not found. Push code first: git push origin main');
      return false;
    }
    
    log('success', 'GitHub repository ready');
    return true;
  } catch (e) {
    log('error', 'Not a git repository. Initialize: git init && git add . && git commit -m "initial"');
    return false;
  }
}

function generateSecrets() {
  return {
    jwt: crypto.randomBytes(32).toString('hex'),
    database: '', // User will provide
  };
}

function createDeploymentPackage() {
  const secrets = generateSecrets();
  
  section('Generated Secrets');
  log('success', 'JWT_SECRET created (32 bytes, cryptographically secure)');
  
  section('Copy These Values to Your Deployment Platforms');
  
  // Cyclic environment
  console.log(`${colors.bright}${colors.cyan}1. CYCLIC.SH BACKEND${colors.reset}`);
  console.log(`   Go to: https://cyclic.sh/dashboard`);
  console.log(`   → Select your VOJAS app → Variables → Add these:\n`);
  
  const cyclic_vars = {
    'NODE_ENV': 'production',
    'PORT': '3000',
    'DATABASE_URL': 'postgresql://user:pass@host/vojas?sslmode=require',
    'JWT_SECRET': secrets.jwt,
    'JWT_EXPIRES_IN': '7d',
    'BCRYPT_ROUNDS': '10',
    'CLIENT_BASE_URL': 'https://vojas-frontend.vercel.app',
    'SEED_ON_BOOT': 'true',
  };
  
  Object.entries(cyclic_vars).forEach(([key, value]) => {
    const displayValue = key === 'DATABASE_URL' 
      ? '← PASTE YOUR NEON STRING HERE'
      : key === 'JWT_SECRET'
      ? value.substring(0, 12) + '...' + value.substring(-4)
      : value;
    console.log(`   ${colors.bright}${key}${colors.reset} = ${displayValue}`);
  });
  
  console.log(`\n   After setting variables → Click ${colors.bright}Deploy${colors.reset}`);
  console.log(`   ${colors.yellow}Wait 2-5 minutes${colors.reset} for deployment\n`);
  
  // Vercel environment
  console.log(`${colors.bright}${colors.cyan}2. VERCEL.COM FRONTEND${colors.reset}`);
  console.log(`   Go to: https://vercel.com/dashboard`);
  console.log(`   → New Project → Import VOJAS → Configure:\n`);
  console.log(`   ${colors.bright}Root Directory:${colors.reset} ./frontend`);
  console.log(`   ${colors.bright}Build Command:${colors.reset} npm ci && npm run build`);
  console.log(`   ${colors.bright}Output Directory:${colors.reset} dist\n`);
  console.log(`   → Environment Variables → Add these:\n`);
  
  const vercel_vars = {
    'VITE_API_BASE_URL': 'https://YOUR-CYCLIC-APP.cyclic.app/api/v1',
    'VITE_APP_NAME': 'VOJAS',
    'VITE_ENABLE_RQ_DEVTOOLS': 'false',
  };
  
  Object.entries(vercel_vars).forEach(([key, value]) => {
    console.log(`   ${colors.bright}${key}${colors.reset} = ${value}`);
  });
  
  console.log(`\n   → Click ${colors.bright}Deploy${colors.reset}`);
  console.log(`   ${colors.yellow}Wait 1-2 minutes${colors.reset} for deployment\n`);
  
  // Neon setup
  console.log(`${colors.bright}${colors.cyan}3. NEON.TECH DATABASE${colors.reset}`);
  console.log(`   Go to: https://neon.tech`);
  console.log(`   → Sign up / Login → New Project\n`);
  console.log(`   ${colors.bright}Name:${colors.reset} vojas-prod`);
  console.log(`   ${colors.bright}Region:${colors.reset} Singapore (lowest latency)`);
  console.log(`   ${colors.bright}Compute:${colors.reset} Free tier\n`);
  console.log(`   Copy the connection string and paste it as:\n`);
  console.log(`   DATABASE_URL in Cyclic\n`);
  
  // Save to file
  const deploymentGuide = `VOJAS DEPLOYMENT CHECKLIST
==========================

BEFORE YOU START:
- [ ] Code pushed to GitHub
- [ ] GitHub account ready
- [ ] Neon account created
- [ ] Cyclic account created  
- [ ] Vercel account created

CYCLIC SETUP (Backend):
${Object.entries(cyclic_vars).map(([k, v]) => `- [ ] ${k} = ${v}`).join('\n')}

VERCEL SETUP (Frontend):
${Object.entries(vercel_vars).map(([k, v]) => `- [ ] ${k} = ${v}`).join('\n')}

NEON SETUP (Database):
- [ ] Project created
- [ ] Connection string copied
- [ ] Connection tested (optional)

TESTING:
- [ ] Backend health check: curl https://YOUR-APP.cyclic.app/api/v1/health
- [ ] Frontend loads: https://vojas-frontend.vercel.app
- [ ] Login works: admin@vojas.gov / VojasDemo2026
- [ ] Dashboard displays data
- [ ] Maps load correctly

SECRETS (Save These Securely):
JWT_SECRET: ${secrets.jwt}
(Store in password manager or secure location)

AUTOMATION COMPLETE!
====================
All configuration files are ready.
Follow the platform-specific instructions above to deploy.

Need help? See:
- DEPLOYMENT.md (comprehensive guide)
- QUICK-DEPLOY.md (15-minute walkthrough)
- DEPLOYMENT-PACKAGE.md (resource index)
`;

  fs.writeFileSync('DEPLOYMENT-CHECKLIST.txt', deploymentGuide);
  log('success', 'Saved: DEPLOYMENT-CHECKLIST.txt');
}

function showFinalInstructions() {
  section('What\'s Next?');
  
  console.log(`${colors.bright}Your deployment package is ready!${colors.reset}\n`);
  
  console.log(`${colors.bright}Step 1: Create Free Accounts${colors.reset}`);
  console.log(`  1. Neon: https://neon.tech (free PostgreSQL)`);
  console.log(`  2. Cyclic: https://cyclic.sh (free Node.js hosting)`);
  console.log(`  3. Vercel: https://vercel.com (free React hosting)\n`);
  
  console.log(`${colors.bright}Step 2: Get Your Credentials${colors.reset}`);
  console.log(`  1. Neon: Copy PostgreSQL connection string`);
  console.log(`  2. Cyclic: Create app, connect your GitHub repo`);
  console.log(`  3. Vercel: Connect GitHub, import project\n`);
  
  console.log(`${colors.bright}Step 3: Set Environment Variables${colors.reset}`);
  console.log(`  Copy values from above into each platform's dashboard\n`);
  
  console.log(`${colors.bright}Step 4: Deploy & Test${colors.reset}`);
  console.log(`  1. Click "Deploy" on each platform`);
  console.log(`  2. Wait for builds to complete`);
  console.log(`  3. Visit your frontend URL`);
  console.log(`  4. Log in with demo account\n`);
  
  console.log(`${colors.bright}Estimated Total Time: 15-30 minutes${colors.reset}`);
  console.log(`${colors.bright}Total Cost: $0 forever${colors.reset}\n`);
  
  console.log(`${colors.green}🚀 You're ready to deploy VOJAS!${colors.reset}`);
  console.log(`${colors.cyan}See DEPLOYMENT-CHECKLIST.txt for the complete guide.${colors.reset}\n`);
}

// Main execution
console.clear();
console.log(`
${colors.bright}${colors.cyan}╔════════════════════════════════════╗${colors.reset}
${colors.bright}${colors.cyan}║   VOJAS Quick Deployment Setup    ║${colors.reset}
${colors.bright}${colors.cyan}║    Free Forever: $0/month         ║${colors.reset}
${colors.bright}${colors.cyan}╚════════════════════════════════════╝${colors.reset}
`);

section('Checking Prerequisites');
if (!checkGitReady()) {
  process.exit(1);
}

section('Generating Configuration');
createDeploymentPackage();

showFinalInstructions();

console.log(`${colors.yellow}Pro Tip:${colors.reset} Keep DEPLOYMENT-CHECKLIST.txt open while deploying`);
console.log(`${colors.yellow}Save this terminal output:${colors.reset} node quick-deploy.js > deployment-log.txt\n`);
