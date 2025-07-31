#!/usr/bin/env node

// Render gateway deployment entry point
// This file is specifically for the gateway service

const path = require('path');
const fs = require('fs');

console.log('🚀 PackMoveGO Gateway - Render deployment starting...');

// Try to load the compiled gateway
const compiledGatewayPath = path.join(__dirname, 'dist', 'src', 'gateway.js');

if (fs.existsSync(compiledGatewayPath)) {
  console.log(`✅ Found compiled gateway at: ${compiledGatewayPath}`);
  require(compiledGatewayPath);
} else {
  console.error('❌ Compiled gateway not found!');
  console.error('Expected:', compiledGatewayPath);
  console.error('Please ensure the build process completed successfully.');
  process.exit(1);
} 