#!/usr/bin/env node

// Simple start script for Render deployment
// This will compile TypeScript and start the server

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 PackMoveGO API - Starting deployment...');

// Function to compile TypeScript
function compileTypeScript() {
  try {
    console.log('🔨 Compiling TypeScript...');
    execSync('npm run build:backend', { stdio: 'inherit' });
    console.log('✅ TypeScript compilation successful');
    return true;
  } catch (error) {
    console.error('❌ TypeScript compilation failed:', error.message);
    return false;
  }
}

// Function to start the server
function startServer() {
  const serverPath = path.join(__dirname, 'dist', 'src', 'server.js');
  
  if (fs.existsSync(serverPath)) {
    console.log('✅ Starting compiled server...');
    require(serverPath);
  } else {
    console.error('❌ Compiled server not found at:', serverPath);
    process.exit(1);
  }
}

// Main execution
console.log('📁 Current directory:', __dirname);

// Always compile first
if (compileTypeScript()) {
  startServer();
} else {
  console.error('❌ Failed to compile TypeScript, exiting...');
  process.exit(1);
} 