#!/usr/bin/env node

/**
 * LLM Connection Test Script
 * 
 * Tests that the OpenAI API key is valid and the LLM can be initialized.
 * 
 * Usage:
 *   node scripts/test-llm.js
 * 
 * Options:
 *   --skip-api-call  Only test initialization, don't make API call
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('🧪 Testing LLM Initialization...\n');

// Load environment variables
const envPath = join(rootDir, '.env');
let envVars = {};
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#][^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      envVars[key] = value;
      // Set in process.env for module import
      process.env[key] = value;
    }
  });
}

const skipApiCall = process.argv.includes('--skip-api-call');

// Test 1: Check API key
console.log('1️⃣ Checking OpenAI API key...');
const apiKey = envVars.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.log('❌ VITE_OPENAI_API_KEY not found in .env');
  console.log('   Please add your OpenAI API key to .env file');
  process.exit(1);
}

if (apiKey === 'your_openai_api_key_here') {
  console.log('❌ Please replace the placeholder with your actual OpenAI API key');
  process.exit(1);
}

if (!apiKey.startsWith('sk-')) {
  console.log('⚠️  API key format looks unusual (expected to start with "sk-")');
  console.log(`   Key starts with: ${apiKey.substring(0, 5)}...`);
} else {
  console.log(`✅ API key format looks correct: ${apiKey.substring(0, 8)}...`);
}

// Test 2: Import LLM module
console.log('\n2️⃣ Testing LLM module import...');
try {
  // Dynamic import since we're in Node/ESM context
  const { initializeLLM, testLLM } = await import('../src/agent/llm.ts');
  console.log('✅ LLM module imported successfully');

  // Test 3: Initialize LLM
  console.log('\n3️⃣ Initializing ChatOpenAI instance...');
  try {
    const llm = initializeLLM({
      openaiApiKey: apiKey
    });
    console.log('✅ LLM initialized successfully');
    console.log(`   Model: ${llm.modelName || 'gpt-4o-mini'}`);
    console.log(`   Temperature: ${llm.temperature}`);
    console.log(`   Streaming: ${llm.streaming}`);

    if (skipApiCall) {
      console.log('\n⏩ Skipping API call (--skip-api-call flag set)');
      console.log('✅ All local tests passed!');
      process.exit(0);
    }

    // Test 4: Make a test API call
    console.log('\n4️⃣ Making test API call to OpenAI...');
    console.log('   (This will cost ~$0.0001 - less than a penny)');
    console.log('   Press Ctrl+C within 3 seconds to cancel...');
    
    await new Promise(resolve => setTimeout(resolve, 3000));

    const result = await testLLM();
    
    if (result.success) {
      console.log('✅ API call successful!');
      console.log(`   Response: ${result.response}`);
      console.log('\n🎉 All tests passed! LLM is ready to use.');
      process.exit(0);
    } else {
      console.log('❌ API call failed:');
      console.log(`   Error: ${result.error}`);
      console.log('\nPossible issues:');
      console.log('  - Invalid API key');
      console.log('  - No credits/billing enabled on OpenAI account');
      console.log('  - Network connectivity issues');
      console.log('  - OpenAI API outage');
      process.exit(1);
    }

  } catch (error) {
    console.log('❌ Error initializing LLM:');
    console.log(`   ${error.message}`);
    process.exit(1);
  }

} catch (error) {
  console.log('❌ Error importing LLM module:');
  console.log(`   ${error.message}`);
  console.log('\nMake sure TypeScript files can be imported.');
  console.log('You may need to run this through a TypeScript-aware runner.');
  process.exit(1);
}

