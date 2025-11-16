import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/node";
import envLoader from './env';

const config=envLoader.getConfig();

// Determine Arcjet mode based on environment
const isProduction=config.NODE_ENV==='production';

// Log Arcjet configuration for debugging
console.log('🔧 Arcjet Configuration:');
console.log(`   NODE_ENV: ${config.NODE_ENV}`);
console.log(`   Environment: ${isProduction ? 'Production' : 'Development'}`);

let aj: any;

// Configure Arcjet based on environment
// In development: use DRY_RUN mode (logs but doesn't block)
// In production: use LIVE mode (actively blocks threats)
const arcjetMode = isProduction ? "LIVE" : "DRY_RUN";

console.log(`   Arcjet Mode: ${arcjetMode}`);

aj=arcjet({
  key: config.ARCJET_KEY!,
  characteristics: ["ip.src"],
  rules: [
    shield({ mode: arcjetMode }),
    detectBot({
      mode: arcjetMode,
      allow: [
        "CATEGORY:VERCEL",
        "CATEGORY:MONITOR",
        "CATEGORY:SEARCH_ENGINE",
        "POSTMAN",
        "CURL", // Allow curl for testing
      ],
    }),
    tokenBucket({
      mode: arcjetMode,
      refillRate: 20,
      interval: 10,
      capacity: 30,
    }),
  ],
});

export default aj;

