#!/usr/bin/env node

(async () => {
  try {
    const { default: open } = await import('open');
    await open('http://localhost:3000/test-agent');
    console.log('🌐 Opened http://localhost:3000/test-agent');
  } catch (error) {
    console.error('Failed to open browser:', error.message);
  }
})();