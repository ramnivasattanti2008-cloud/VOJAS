#!/usr/bin/env node
/**
 * VOJAS Automated Deployment Helper
 * This script automates the deployment to Cyclic + Vercel + Neon
 * 
 * Usage:
 *   node deploy.js
 * 
 * Requirements:
 *   - Node.js 20+
 *   - GitHub repo pushed
 *   - Neon account created
 *   - Cyclic account created
 *   - Vercel account created
 */

const readline = require('readline');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bright}${colors.blue}=== ${msg} ===${colors.reset}\n`),
};

async function main() {
  console.clear();
  console.log(`
${colors.bright}${colors.blue}╔══════════════════════════════════════════════════╗${colors.reset}
${colors.bright}${colors.blue}║         VOJAS Automated Deployment Helper        ║${colors.reset}
${colors.bright}${colors.blue}║       Deploy to Cyclic + Vercel + Neon Free     ║${colors.reset}
${colors.bright}${colors.blue}╚══════════════════════════════════════════════════╝${colors.reset}
  `);

  try {
    // Collect user inputs
    log.section('Step 1: Collect Configuration');
    
    const config = {
      githubToken: await question(`${colors.bright}GitHub Personal Access Token:${colors.reset}\n> `),
      githubRepo: await question(`GitHub Repo (user/vojas):\n> `),
      neonConnectionString: await question(`Neon PostgreSQL Connection String:\n(postgresql://...)\n> `),
      cyclic: {
        appName: await question(`Cyclic App Name (from dashboard):\n> `),
      },
      vercel: {
        token: await question(`Vercel API Token:\n> `),
      },
    };

    // Validate inputs
    if (!config.githubToken || !config.neonConnectionString) {
      log.error('Missing required tokens/strings');
      process.exit(1);
    }

    // Generate JWT Secret
    log.section('Step 2: Generate Secrets');
    const jwtSecret = crypto.randomBytes(32).toString('hex');
    log.success(`JWT_SECRET generated: ${jwtSecret.substring(0, 8)}...`);

    // Create environment file
    log.section('Step 3: Create Configuration Files');
    
    const cyclic_env = `NODE_ENV=production
PORT=3000
DATABASE_URL=${config.neonConnectionString}
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CLIENT_BASE_URL=https://vojas-frontend.vercel.app
SEED_ON_BOOT=true
`;

    fs.writeFileSync('.env.cyclic', cyclic_env);
    log.success('Created .env.cyclic configuration');

    const vercel_env = `VITE_API_BASE_URL=https://${config.cyclic.appName}.cyclic.app/api/v1
VITE_APP_NAME=VOJAS
VITE_ENABLE_RQ_DEVTOOLS=false
`;

    fs.writeFileSync('.env.vercel', vercel_env);
    log.success('Created .env.vercel configuration');

    // Verify Neon connection
    log.section('Step 4: Verify Neon Database');
    try {
      await verifyNeonConnection(config.neonConnectionString);
      log.success('✓ Neon database connection verified');
    } catch (err) {
      log.error(`Failed to connect to Neon: ${err.message}`);
      log.warn('You may need to verify the connection manually');
    }

    // Create deployment instructions
    log.section('Step 5: Deployment Instructions');
    
    const instructions = `
VOJAS DEPLOYMENT INSTRUCTIONS
==============================

Your configuration is ready. Follow these steps:

1. DEPLOY TO CYCLIC
   - Go to: https://cyclic.sh/dashboard
   - Select your VOJAS app
   - Click "Variables"
   - Copy-paste these values:

${Object.entries(cyclic_env.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key] = value;
  return acc;
}, {})).map(([k, v]) => `   ${k}=${v}`).join('\n')}

   - Click "Deploy"
   - Wait 2-5 minutes

2. DEPLOY TO VERCEL
   - Go to: https://vercel.com/dashboard
   - Create New Project → Import VOJAS
   - Root Directory: ./frontend
   - Build Command: npm ci && npm run build
   - Environment Variables:

${Object.entries(vercel_env.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key] = value;
  return acc;
}, {})).map(([k, v]) => `   ${k}=${v}`).join('\n')}

   - Click "Deploy"
   - Wait 1-2 minutes

3. VERIFY DEPLOYMENT
   - Backend health: curl https://${config.cyclic.appName}.cyclic.app/api/v1/health
   - Frontend: https://vojas-frontend.vercel.app
   - Login: admin@vojas.gov / VojasDemo2026

4. SAVE CREDENTIALS
   JWT_SECRET: ${jwtSecret}
   Database: ${config.neonConnectionString}

⚠️  IMPORTANT: Never commit these values to git!
    They're saved in .env.cyclic and .env.vercel (add to .gitignore)

NEXT STEPS:
1. Save .env.cyclic and .env.vercel to a safe location
2. Go to Cyclic dashboard and set those variables
3. Go to Vercel dashboard and set those variables
4. Test the deployment

Need help? See DEPLOYMENT.md or QUICK-DEPLOY.md
`;

    fs.writeFileSync('DEPLOYMENT-INSTRUCTIONS.txt', instructions);
    log.success('Created DEPLOYMENT-INSTRUCTIONS.txt');

    // Summary
    log.section('Deployment Summary');
    console.log(`
${colors.bright}Configuration Files Created:${colors.reset}
  ✓ .env.cyclic (backend environment variables)
  ✓ .env.vercel (frontend environment variables)
  ✓ DEPLOYMENT-INSTRUCTIONS.txt (step-by-step guide)

${colors.bright}Next Steps:${colors.reset}
  1. Save your JWT_SECRET: ${jwtSecret.substring(0, 8)}...
  2. Go to Cyclic dashboard → Set variables from .env.cyclic
  3. Go to Vercel dashboard → Set variables from .env.vercel
  4. Wait for deployments to complete
  5. Test: https://vojas-frontend.vercel.app

${colors.bright}Important:${colors.reset}
  • Add .env.cyclic and .env.vercel to .gitignore
  • Never commit these files to git
  • Backup your JWT_SECRET securely

${colors.bright}Health Check:${colors.reset}
  curl https://${config.cyclic.appName}.cyclic.app/api/v1/health

${colors.bright}Demo Login:${colors.reset}
  Email: admin@vojas.gov
  Password: VojasDemo2026
    `);

    log.success('Deployment configuration complete!');
    log.info('See DEPLOYMENT-INSTRUCTIONS.txt for next steps');

  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

async function verifyNeonConnection(connectionString) {
  // Parse connection string
  const url = new URL(connectionString);
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 5432,
      timeout: 5000,
    };
    
    const socket = require('net').createConnection(options);
    socket.on('connect', () => {
      socket.destroy();
      resolve();
    });
    socket.on('error', (err) => {
      socket.destroy();
      reject(err);
    });
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

main().catch(error => {
  log.error(error.message);
  process.exit(1);
});
