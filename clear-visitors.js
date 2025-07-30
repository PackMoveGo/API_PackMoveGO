#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function clearVisitorLog() {
  const dataPath = path.join(__dirname, 'data/user-sessions.json');
  
  try {
    // Create fresh visitor data
    const freshData = {
      users: {},
      totalVisits: 0,
      uniqueUsers: 0
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(dataPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write fresh data
    fs.writeFileSync(dataPath, JSON.stringify(freshData, null, 2));
    
    console.log('✅ Visitor log cleared successfully!');
    console.log('📊 All visitor data reset to zero');
    console.log('🆕 Next visitor will be treated as NEW USER');
    
  } catch (error) {
    console.error('❌ Error clearing visitor log:', error.message);
  }
}

// Check if script is run directly
if (require.main === module) {
  clearVisitorLog();
}

module.exports = { clearVisitorLog }; 