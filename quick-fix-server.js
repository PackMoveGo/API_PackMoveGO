#!/usr/bin/env node

// Quick fix: Temporary bypass for testing while waiting for Render deployment
// This temporarily disables authentication for testing

const fs = require('fs');
const path = require('path');

console.log('🔧 Creating temporary authentication bypass...\n');

const serverPath = path.join(__dirname, 'src', 'server.ts');

// Read current server.ts
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Create backup
const backupPath = serverPath + '.backup';
if (!fs.existsSync(backupPath)) {
  fs.writeFileSync(backupPath, serverContent);
  console.log('✅ Backup created: src/server.ts.backup');
}

// Add temporary bypass after security middleware
const bypassCode = `
// TEMPORARY: Allow all requests during testing (REMOVE BEFORE PRODUCTION)
app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || 
                   req.headers['x-real-ip']?.toString() || 
                   req.ip || req.socket.remoteAddress || '';
  
  // Always allow health checks
  if (req.path === '/api/health' || req.path === '/health' || req.path === '/api/health/simple') {
    return next();
  }
  
  console.log(\`🔓 TEMPORARY BYPASS: Allowing \${req.method} \${req.path} from \${clientIp}\`);
  return next();
});
`;

// Find the line where to insert the bypass
const insertPoint = serverContent.indexOf('// API Authentication middleware with multiple access methods');

if (insertPoint === -1) {
  console.log('❌ Could not find insertion point in server.ts');
  process.exit(1);
}

// Insert the bypass code before the existing authentication
const modifiedContent = serverContent.slice(0, insertPoint) + 
                        bypassCode + 
                        serverContent.slice(insertPoint);

// Write the modified file
fs.writeFileSync(serverPath, modifiedContent);

console.log('✅ Temporary bypass added to src/server.ts');
console.log('⚠️  WARNING: This allows ALL requests - use only for testing!');
console.log('📝 To restore: cp src/server.ts.backup src/server.ts');
console.log('\nNext steps:');
console.log('1. git add . && git commit -m "Temporary auth bypass for testing"');
console.log('2. git push origin main');
console.log('3. Wait for Render deployment (2-3 minutes)');
console.log('4. Test your frontend');
console.log('5. Restore the original file when environment variables are ready'); 