#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Set the working directory to the project root
process.chdir(__dirname);

// Start the application
const child = spawn('node', ['dist/src/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('exit', (code) => {
  process.exit(code);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
}); 