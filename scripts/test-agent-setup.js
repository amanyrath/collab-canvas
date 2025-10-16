#!/usr/bin/env node

/**
 * AI Agent Setup Verification Script
 * 
 * This script checks that all environment variables and dependencies
 * are properly configured for the LangChain AI agent.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🔍 Verifying AI Agent Setup...\n');

let allChecksPassed = true;

// Check 1: Environment file exists
console.log('📄 Checking for .env file...');
const envPath = join(rootDir, '.env');
if (existsSync(envPath)) {
  console.log('✅ .env file found\n');
} else {
  console.log('❌ .env file not found');
  console.log('   Run: cp env.example .env\n');
  allChecksPassed = false;
}

// Check 2: Load environment variables (Vite style)
console.log('🔑 Checking environment variables...');

// Read .env file manually since we're in Node context
let envVars = {};
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envVars[key] = value;
    }
  });
}

// Check OpenAI API Key
if (envVars.VITE_OPENAI_API_KEY && 
    envVars.VITE_OPENAI_API_KEY !== 'your_openai_api_key_here' &&
    envVars.VITE_OPENAI_API_KEY.length > 20) {
  console.log('✅ VITE_OPENAI_API_KEY is set');
} else {
  console.log('❌ VITE_OPENAI_API_KEY not found or invalid');
  console.log('   Get your key from: https://platform.openai.com/api-keys');
  allChecksPassed = false;
}

// Check Tavily API Key
if (envVars.VITE_TAVILY_API_KEY && 
    envVars.VITE_TAVILY_API_KEY !== 'your_tavily_api_key_here' &&
    envVars.VITE_TAVILY_API_KEY.length > 20) {
  console.log('✅ VITE_TAVILY_API_KEY is set\n');
} else {
  console.log('❌ VITE_TAVILY_API_KEY not found or invalid');
  console.log('   Get your key from: https://tavily.com/\n');
  allChecksPassed = false;
}

// Check 3: Dependencies installed
console.log('📦 Checking dependencies...');
const packageJsonPath = join(rootDir, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

const requiredDeps = [
  'langchain',
  '@langchain/openai',
  '@langchain/core',
  '@langchain/community',
  'tavily'
];

let missingDeps = [];
requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`✅ ${dep} installed`);
  } else {
    console.log(`❌ ${dep} not found`);
    missingDeps.push(dep);
    allChecksPassed = false;
  }
});

if (missingDeps.length > 0) {
  console.log(`\n   Missing dependencies. Run: npm install ${missingDeps.join(' ')}`);
}

// Check 4: Agent directory exists
console.log('\n📁 Checking project structure...');
const agentDir = join(rootDir, 'src', 'agent');
if (existsSync(agentDir)) {
  console.log('✅ src/agent/ directory exists');
} else {
  console.log('❌ src/agent/ directory not found');
  allChecksPassed = false;
}

// Check 5: Node version
console.log('\n🔧 Checking Node.js version...');
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
if (majorVersion >= 18) {
  console.log(`✅ Node.js ${nodeVersion} (requires 18+)`);
} else {
  console.log(`⚠️  Node.js ${nodeVersion} - version 18+ recommended`);
  console.log('   Current version may work but is not officially supported');
}

// Summary
console.log('\n' + '='.repeat(50));
if (allChecksPassed) {
  console.log('✅ All checks passed! AI Agent setup is complete.');
  console.log('\nNext steps:');
  console.log('  1. npm run dev');
  console.log('  2. Open http://localhost:5173');
  console.log('  3. Try an AI command in the chat interface');
  process.exit(0);
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\nFor help, see: SETUP.md');
  process.exit(1);
}

