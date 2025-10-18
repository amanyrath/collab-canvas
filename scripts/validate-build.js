/**
 * Build Validation Script
 * 
 * Prevents building for production with exposed API keys
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Check if .env file exists and contains exposed keys
function checkEnvFile() {
  const envPath = join(rootDir, '.env');
  
  if (!existsSync(envPath)) {
    console.log('✅ No .env file found (keys should be in backend)');
    return true;
  }

  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  const exposedKeys = [];
  const secureDangerousKeys = ['OPENAI', 'TAVILY', 'ANTHROPIC', 'COHERE'];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    
    const [key, value] = trimmed.split('=');
    const keyTrimmed = key.trim();
    
    // Check if it's a sensitive key with VITE_ prefix
    if (keyTrimmed.startsWith('VITE_')) {
      const keyUpper = keyTrimmed.toUpperCase();
      for (const dangerous of secureDangerousKeys) {
        if (keyUpper.includes(dangerous)) {
          const val = value?.trim();
          if (val && 
              val !== 'your_openai_api_key_here' && 
              val !== 'your_tavily_api_key_here' &&
              !val.startsWith('your_')) {
            exposedKeys.push(keyTrimmed);
          }
        }
      }
    }
  }

  if (exposedKeys.length > 0) {
    console.error('\n🚨 BUILD VALIDATION FAILED!\n');
    console.error('The following API keys are exposed with VITE_ prefix:');
    exposedKeys.forEach(key => console.error(`  - ${key}`));
    console.error('\n⚠️  VITE_ prefixed keys are bundled into client JavaScript!');
    console.error('   Anyone can extract these keys from your built application.\n');
    console.error('For production builds:');
    console.error('  1. Remove VITE_ prefix from sensitive keys in .env');
    console.error('  2. Set up a backend API to handle LLM calls');
    console.error('  3. Store keys as server-side environment variables\n');
    console.error('To build anyway (LOCAL DEV ONLY), run:');
    console.error('  SKIP_KEY_VALIDATION=true npm run build\n');
    return false;
  }

  console.log('✅ No exposed API keys detected in .env');
  return true;
}

// Allow skipping validation for local development
if (process.env.SKIP_KEY_VALIDATION === 'true') {
  console.log('⚠️  Skipping key validation (DEVELOPMENT ONLY)');
  process.exit(0);
}

// Check NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  console.log('ℹ️  Building in development mode - validation relaxed');
  process.exit(0);
}

console.log('🔍 Validating production build security...\n');

if (!checkEnvFile()) {
  process.exit(1);
}

console.log('\n✅ Build validation passed!\n');
process.exit(0);

