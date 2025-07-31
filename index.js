#!/usr/bin/env node

// Entry point for Render deployment
// This ensures we load the compiled TypeScript server

const path = require('path');
const fs = require('fs');

console.log('🚀 PackMoveGO API - Starting from index.js...');

// Try multiple possible paths for the compiled server
const possiblePaths = [
  path.join(__dirname, 'dist', 'src', 'server.js'),
  path.join(__dirname, 'dist', 'server.js'),
  path.join(__dirname, 'src', 'server.js')
];

let serverPath = null;

for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    serverPath = path;
    console.log(`✅ Found server at: ${path}`);
    break;
  }
}

if (serverPath) {
  require(serverPath);
} else {
  console.error('❌ No compiled server found!');
  console.error('Tried paths:', possiblePaths);
  console.error('Please ensure the build process completed successfully.');
  process.exit(1);
} 