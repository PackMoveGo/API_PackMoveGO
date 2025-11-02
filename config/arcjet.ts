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

// In development, create a dummy/noop Arcjet instance
if(!isProduction) {
  console.log('   Arcjet: COMPLETELY DISABLED (development mode)');
  // Create a mock object that doesn't do anything
  aj={
    protect: async (req: any, options: any) => ({
      isDenied: () => false,
      isAllowed: () => true,
      reason: null
    })
  };
} else {
  console.log(`   Arcjet Mode: LIVE`);
  aj=arcjet({
    key: config.ARCJET_KEY!,
    characteristics: ["ip.src"],
    rules: [
      shield({ mode: "LIVE" }),
      detectBot({
        mode: "LIVE",
        allow: [
          "CATEGORY:VERCEL",
          "CATEGORY:MONITOR",
          "CATEGORY:SEARCH_ENGINE",
          "CATEGORY:BROWSER", // Allow browsers
          "POSTMAN",
          "CURL", // Allow curl for testing
        ],
      }),
      tokenBucket({
        mode: "LIVE",
        refillRate: 20,
        interval: 10,
        capacity: 30,
      }),
    ],
  });
}

export default aj;

