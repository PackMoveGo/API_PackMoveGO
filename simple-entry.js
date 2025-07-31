#!/usr/bin/env node

// Simple entry point for Render deployment
// This bypasses TypeScript compilation issues

const path = require('path');
const fs = require('fs');

console.log('🚀 PackMoveGO API - Simple entry point starting...');

// Try multiple possible paths for the server
const possiblePaths = [
  path.join(__dirname, 'dist', 'src', 'server.js'),
  path.join(__dirname, 'dist', 'server.js'),
  path.join(__dirname, 'src', 'server.js'),
  path.join(__dirname, 'server.js'),
  path.join(__dirname, 'index.js'),
  path.join(__dirname, 'app.js')
];

console.log('🔍 Looking for server files...');

for (const serverPath of possiblePaths) {
  console.log(`  Checking: ${serverPath}`);
  if (fs.existsSync(serverPath)) {
    console.log(`✅ Found server at: ${serverPath}`);
    console.log('🚀 Loading server...');
    require(serverPath);
    return;
  }
}

// If no compiled files found, try to run the TypeScript file with ts-node
console.log('⚠️  No compiled server found, trying ts-node...');
try {
  require('ts-node/register');
  const serverPath = path.join(__dirname, 'src', 'server.ts');
  if (fs.existsSync(serverPath)) {
    console.log(`✅ Found TypeScript server at: ${serverPath}`);
    require(serverPath);
    return;
  }
} catch (error) {
  console.error('❌ ts-node not available:', error.message);
}

console.error('❌ No server found!');
console.error('Tried paths:', possiblePaths);
console.error('Please ensure the build process completed successfully.');
process.exit(1); 