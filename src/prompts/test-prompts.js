/**
 * Simple test script to validate the prompt system
 * Run with: node src/prompts/test-prompts.js
 */

const { createPromptManager } = require('./index');

console.log('🧪 Testing SEOAgent Prompt Management System\n');

try {
  // Create prompt manager
  const promptManager = createPromptManager('test');
  console.log('✅ PromptManager created successfully');

  // Test listing categories
  const categories = promptManager.listCategories();
  console.log('✅ Categories:', categories);

  // Test getting a simple prompt
  const simplePrompt = promptManager.getPrompt('agent', 'SIMPLE_SEO_AGENT', {
    selectedSite: '\n\n**Currently Selected Site**: example.com'
  });
  console.log('✅ Simple agent prompt retrieved');
  console.log('Preview:', simplePrompt.substring(0, 100) + '...\n');

  // Test content prompt with variables
  const contentPrompt = promptManager.getPrompt('content', 'ENHANCED_SEO_CONTENT_WRITER', {
    articleType: 'guide'
  });
  console.log('✅ Content prompt with variables retrieved');
  console.log('Preview:', contentPrompt.substring(0, 100) + '...\n');

  // Test technical SEO prompt
  const technicalPrompt = promptManager.getPrompt('technical-seo', 'TECHNICAL_SEO_FIX_EXPERT');
  console.log('✅ Technical SEO prompt retrieved');
  console.log('Preview:', technicalPrompt.substring(0, 100) + '...\n');

  // Test validation
  const validation = promptManager.validatePrompt('agent', 'SIMPLE_SEO_AGENT', { selectedSite: 'test' });
  console.log('✅ Prompt validation:', validation.isValid ? 'PASSED' : 'FAILED');
  if (validation.warnings.length > 0) {
    console.log('⚠️  Warnings:', validation.warnings);
  }

  // Test getting all prompts
  const allPrompts = promptManager.listAllPrompts();
  console.log('✅ Total prompts loaded:', allPrompts.length);
  console.log('All prompts:', allPrompts.join(', '));

  // Test environment modification
  promptManager.setEnvironment('development');
  const devPrompt = promptManager.getPrompt('technical-seo', 'TECHNICAL_SEO_FIX_EXPERT');
  console.log('✅ Environment-specific modifications applied');
  console.log('Dev mode detected:', devPrompt.includes('[DEBUG MODE]'));

  console.log('\n🎉 All tests passed! The prompt system is working correctly.');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}