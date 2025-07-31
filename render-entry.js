#!/usr/bin/env node

// Render deployment entry point
// This file is specifically for Render to use as the start command

const path = require('path');
const fs = require('fs');

console.log('🚀 PackMoveGO API - Render deployment starting...');

// Try to load the compiled server
const compiledServerPath = path.join(__dirname, 'dist', 'src', 'server.js');

if (fs.existsSync(compiledServerPath)) {
  console.log(`✅ Found compiled server at: ${compiledServerPath}`);
  require(compiledServerPath);
} else {
  console.error('❌ Compiled server not found!');
  console.error('Expected:', compiledServerPath);
  console.error('Please ensure the build process completed successfully.');
  process.exit(1);
} 