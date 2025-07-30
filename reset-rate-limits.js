#!/usr/bin/env node

/**
 * Rate Limit Reset Script
 * This script clears all rate limit data and resets the rate limiting system
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

console.log('🔄 Rate Limit Reset Script');
console.log('========================');

// Clear any in-memory rate limit stores
if (global.rateLimitStore) {
  global.rateLimitStore.clear();
  console.log('✅ Cleared global rate limit store');
}

// Clear any Map-based rate limit stores
if (global.frontendRateLimit) {
  global.frontendRateLimit.clear();
  console.log('✅ Cleared frontend rate limit store');
}

// Clear any other potential rate limit stores
const storesToClear = [
  'rateLimitStore',
  'frontendRateLimit', 
  'apiRateLimitStore',
  'burstProtectionStore'
];

storesToClear.forEach(storeName => {
  if (global[storeName]) {
    global[storeName].clear();
    console.log(`✅ Cleared ${storeName}`);
  }
});

// Reset Redis-based rate limits if Redis is used
try {
  const redis = require('redis');
  const client = redis.createClient();
  
  client.on('connect', () => {
    console.log('🔗 Connected to Redis');
    client.flushdb((err, succeeded) => {
      if (err) {
        console.log('❌ Redis flush failed:', err.message);
      } else {
        console.log('✅ Redis rate limit data cleared');
      }
      client.quit();
    });
  });
  
  client.on('error', () => {
    console.log('ℹ️ Redis not available, skipping Redis reset');
  });
} catch (error) {
  console.log('ℹ️ Redis not installed, skipping Redis reset');
}

console.log('\n🎯 Rate limit reset complete!');
console.log('📝 Next steps:');
console.log('1. Restart your backend server');
console.log('2. Test your frontend connections');
console.log('3. Monitor the logs for any remaining rate limit issues');

// Also provide a simple test endpoint
const app = express();
const testLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Very high limit for testing
  skip: (req) => req.path.startsWith('/v0/') || req.path === '/health',
  message: {
    success: false,
    error: 'Test rate limit exceeded',
    message: 'Test rate limit hit'
  }
});

app.use(testLimiter);

app.get('/test-reset', (req, res) => {
  res.json({
    success: true,
    message: 'Rate limits have been reset',
    timestamp: new Date().toISOString(),
    note: 'Restart your main server to apply changes'
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n🧪 Test server running on http://localhost:${PORT}/test-reset`);
  console.log('💡 You can test the reset by visiting the test endpoint');
});

// Auto-exit after 5 seconds
setTimeout(() => {
  console.log('\n⏰ Auto-exiting in 5 seconds...');
  process.exit(0);
}, 5000); 