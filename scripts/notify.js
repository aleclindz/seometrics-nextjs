#!/usr/bin/env node

const notifier = require('node-notifier');

// Get command line arguments
const args = process.argv.slice(2);
const message = args[0] || 'Task completed!';
const title = args[1] || 'Claude Code';
const sound = args[2] || 'Ping';

// Send notification
notifier.notify({
  title: title,
  message: message,
  sound: sound,
  icon: './public/favicon.ico'
});

console.log(`📱 Notification sent: "${message}"`);