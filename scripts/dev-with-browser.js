#!/usr/bin/env node

const { spawn } = require('child_process');
const notifier = require('node-notifier');

console.log('🚀 Starting SEOAgent development server...');

// Start Next.js dev server
const devProcess = spawn('npm', ['run', 'dev:next'], {
  stdio: 'inherit',
  shell: true
});

// Wait a bit for the server to start, then open browser
setTimeout(async () => {
  try {
    console.log('🌐 Opening browser...');
    
    // Dynamic import for ES module
    const { default: open } = await import('open');
    await open('http://localhost:3000/login');
    
    // Send notification
    notifier.notify({
      title: 'SEOAgent Dev Server',
      message: 'Development server is running! Browser opened to login page.',
      sound: 'Ping',
      icon: './public/favicon.ico'
    });
  } catch (error) {
    console.error('Failed to open browser:', error.message);
  }
}, 3000); // Wait 3 seconds for server to start

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down dev server...');
  devProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  devProcess.kill('SIGTERM');
  process.exit(0);
});