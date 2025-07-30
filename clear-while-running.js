#!/usr/bin/env node

const fetch = require('node-fetch');

async function clearVisitorsWhileRunning() {
  try {
    console.log('🔄 Clearing visitor log while server is running...');
    
    const response = await fetch('http://localhost:3000/api/clear/visitors', {
      method: 'GET',
      headers: {
        'Origin': 'http://localhost:3000',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Visitor log cleared successfully!');
      console.log('📊 All visitor data reset to zero');
      console.log('🆕 Next visitor will be treated as NEW USER');
      console.log(`⏰ Timestamp: ${data.timestamp}`);
    } else {
      console.error('❌ Failed to clear visitor log:', data.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('💡 Make sure your server is running on http://localhost:3000');
  }
}

// Run if called directly
if (require.main === module) {
  clearVisitorsWhileRunning();
}

module.exports = { clearVisitorsWhileRunning }; 