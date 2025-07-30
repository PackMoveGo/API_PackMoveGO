#!/usr/bin/env node

const readline = require('readline');
const { clearVisitorLog } = require('./clear-visitors.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎯 Visitor Log Manager');
console.log('Type "Clear" to reset visitor data');
console.log('Type "exit" to quit');
console.log('');

rl.on('line', (input) => {
  const command = input.trim().toLowerCase();
  
  if (command === 'clear') {
    clearVisitorLog();
  } else if (command === 'exit' || command === 'quit') {
    console.log('👋 Goodbye!');
    rl.close();
    process.exit(0);
  } else if (command === 'help') {
    console.log('📋 Available commands:');
    console.log('  clear  - Reset visitor log');
    console.log('  exit   - Quit the manager');
    console.log('  help   - Show this help');
  } else if (command !== '') {
    console.log('❓ Unknown command. Type "help" for available commands.');
  }
});

console.log('> Ready for commands...'); 