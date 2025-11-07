#!/usr/bin/env node
/**
 * PackMoveGO API - Universal Entry Point
 * 
 * This file detects which service should run based on environment variables:
 * - SERVICE_TYPE=gateway → Runs Gateway service
 * - SERVICE_TYPE=private → Runs Private API service
 * - Default → Runs both services (development mode)
 */

const { spawn } = require('child_process');
const path = require('path');

// Detect service type from environment
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'both';
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('🚀 PackMoveGO API Entry Point');
console.log(`📦 Service Type: ${SERVICE_TYPE}`);
console.log(`🌍 Environment: ${NODE_ENV}`);

// Determine which entry file to use
let entryFile;

if (SERVICE_TYPE === 'gateway') {
  entryFile = path.join(__dirname, 'dist', 'src', 'gateway', 'gateway-entry.js');
  console.log('🔀 Starting Gateway Service...');
} else if (SERVICE_TYPE === 'private') {
  entryFile = path.join(__dirname, 'dist', 'src', 'server-entry.js');
  console.log('🔒 Starting Private API Service...');
} else {
  // Development mode - run both services
  console.log('🔧 Development Mode - Starting both services...');
  
  const concurrently = require('concurrently');
  
  concurrently([
    { command: 'npm run start:server', name: 'API', prefixColor: 'green' },
    { command: 'npm run start:gateway', name: 'Gateway', prefixColor: 'blue' }
  ], {
    prefix: 'name',
    killOthers: ['failure', 'success'],
    restartTries: 3,
  }).then(
    () => console.log('✅ All services completed'),
    () => console.error('❌ One or more services failed')
  );
  
  return;
}

// Check if entry file exists
const fs = require('fs');
if (!fs.existsSync(entryFile)) {
  console.error(`❌ Error: Entry file not found: ${entryFile}`);
  console.error('💡 Make sure you run "npm run build" first');
  process.exit(1);
}

// Start the appropriate service
console.log(`▶️  Running: ${entryFile}`);

const service = spawn('node', [entryFile], {
  stdio: 'inherit',
  env: process.env
});

service.on('error', (error) => {
  console.error(`❌ Failed to start service: ${error.message}`);
  process.exit(1);
});

service.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Service exited with code ${code}`);
    process.exit(code);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  service.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  service.kill('SIGTERM');
});

