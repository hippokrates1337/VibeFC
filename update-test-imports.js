const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔧 Updating test imports to use custom test utils with error boundary...\n');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  ignore: ['**/error-boundary-provider.test.tsx'] // Skip error boundary test
});

console.log(`📁 Found ${testFiles.length} test files to check:\n`);

let updatedCount = 0;

testFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file imports from @testing-library/react and doesn't already use @/test-utils
  if (content.includes('@testing-library/react') && !content.includes('@/test-utils')) {
    console.log(`🔄 Updating ${filePath}...`);
    
    // Replace the import statement
    const updatedContent = content.replace(
      /import\s*\{([^}]+)\}\s*from\s*['"]@testing-library\/react['"];?/g,
      "import {$1} from '@/test-utils';"
    );
    
    // Write back to file
    fs.writeFileSync(filePath, updatedContent);
    console.log(`✅ Updated ${filePath}`);
    updatedCount++;
  } else if (content.includes('@/test-utils')) {
    console.log(`⏭️  Skipping ${filePath} (already uses @/test-utils)`);
  } else if (!content.includes('@testing-library/react')) {
    console.log(`⏭️  Skipping ${filePath} (doesn't import @testing-library/react)`);
  }
});

console.log(`\n🎉 Update complete! Updated ${updatedCount} test files.`);
console.log('📋 All test files now use @/test-utils with error boundary support.');
console.log('🐛 This should resolve test failures caused by unhandled component errors.');

if (updatedCount === 0) {
  console.log('\n💡 All test files are already up to date!');
} 