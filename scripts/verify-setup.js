#!/usr/bin/env node

/**
 * Setup verification script for NestJS OpenTelemetry POC
 * 
 * This script checks if all required dependencies and files are present
 * and provides helpful error messages if something is missing.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying NestJS OpenTelemetry POC setup...\n');

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Are you in the project root directory?');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.error('❌ node_modules not found. Please run: npm install');
  process.exit(1);
}

// Check required files
const requiredFiles = [
  'src/main.ts',
  'src/app.module.ts',
  'src/common/telemetry/telemetry.service.ts',
  'src/common/telemetry/telemetry.module.ts',
  'src/common/telemetry/telemetry.interceptor.ts',
];

let missingFiles = [];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:');
  missingFiles.forEach(file => console.error(`   - ${file}`));
  process.exit(1);
}

// Check TypeScript compilation
console.log('📦 Checking TypeScript compilation...');
const { execSync } = require('child_process');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe' });
  console.log('✅ TypeScript compilation successful');
} catch (error) {
  console.error('❌ TypeScript compilation failed:');
  console.error(error.stdout.toString());
  process.exit(1);
}

console.log('\n✅ Setup verification complete! You can now run:');
console.log('   npm run start:dev');