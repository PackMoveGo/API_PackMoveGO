#!/usr/bin/env node

// Simple JavaScript server for Render deployment
// This bypasses TypeScript compilation issues

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'packmovego-api',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'PackMoveGO API',
    status: 'running',
    service: 'api',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api/*'
    }
  });
});

// Basic API endpoint
app.get('/api/status', (req, res) => {
  res.status(200).json({
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PackMoveGO API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
}); 