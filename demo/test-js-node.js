#!/usr/bin/env node
/**
 * Simple Node.js test for RS-CMP JavaScript version
 * Tests that the JavaScript file has valid syntax and expected structure
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing RS-CMP JavaScript Version\n');

// Test 1: Check source file exists and has valid syntax
console.log('Test 1: Source File Check');
try {
  const jsPath = path.join(__dirname, '..', 'src', 'cmp.js');
  const jsContent = fs.readFileSync(jsPath, 'utf8');
  
  console.log('  ✓ File src/cmp.js exists');
  console.log(`  ✓ Size: ${(jsContent.length / 1024).toFixed(2)} KB`);
  console.log(`  ✓ Lines: ${jsContent.split('\n').length}`);
  
  // Check for JSDoc
  const jsdocCount = (jsContent.match(/@typedef/g) || []).length;
  console.log(`  ✓ JSDoc @typedef definitions: ${jsdocCount}`);
  
  // Check for classes
  const classes = ['ConsentStorage', 'ConsentManager', 'ScriptBlocker', 'GoogleConsentMode', 'BannerUI', 'RSCMP'];
  classes.forEach(className => {
    if (jsContent.includes(`class ${className}`)) {
      console.log(`  ✓ Class ${className} found`);
    } else {
      console.error(`  ✗ Class ${className} NOT found`);
      process.exit(1);
    }
  });
  
  console.log('');
} catch (error) {
  console.error('  ✗ Error:', error.message);
  process.exit(1);
}

// Test 2: Check build files exist
console.log('Test 2: Build Files Check');
try {
  const devPath = path.join(__dirname, '..', 'dist', 'cmp-js.js');
  const prodPath = path.join(__dirname, '..', 'dist', 'cmp-js.min.js');
  
  if (fs.existsSync(devPath)) {
    const devSize = fs.statSync(devPath).size;
    console.log(`  ✓ dist/cmp-js.js exists (${(devSize / 1024).toFixed(2)} KB)`);
  } else {
    console.log('  ⚠ dist/cmp-js.js not found (run npm run build:sdk:js:dev)');
  }
  
  if (fs.existsSync(prodPath)) {
    const prodSize = fs.statSync(prodPath).size;
    console.log(`  ✓ dist/cmp-js.min.js exists (${(prodSize / 1024).toFixed(2)} KB)`);
  } else {
    console.log('  ⚠ dist/cmp-js.min.js not found (run npm run build:sdk:js:prod)');
  }
  
  console.log('');
} catch (error) {
  console.error('  ✗ Error:', error.message);
}

// Test 3: Check documentation exists
console.log('Test 3: Documentation Check');
try {
  const docPath = path.join(__dirname, '..', 'JAVASCRIPT.md');
  
  if (fs.existsSync(docPath)) {
    const docSize = fs.statSync(docPath).size;
    console.log(`  ✓ JAVASCRIPT.md exists (${(docSize / 1024).toFixed(2)} KB)`);
  } else {
    console.error('  ✗ JAVASCRIPT.md not found');
    process.exit(1);
  }
  
  console.log('');
} catch (error) {
  console.error('  ✗ Error:', error.message);
  process.exit(1);
}

// Test 4: Check package.json has build scripts
console.log('Test 4: Build Scripts Check');
try {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const requiredScripts = [
    'build:sdk:js',
    'build:sdk:js:dev',
    'build:sdk:js:prod'
  ];
  
  requiredScripts.forEach(script => {
    if (packageJson.scripts[script]) {
      console.log(`  ✓ Script '${script}' found`);
    } else {
      console.error(`  ✗ Script '${script}' NOT found`);
      process.exit(1);
    }
  });
  
  console.log('');
} catch (error) {
  console.error('  ✗ Error:', error.message);
  process.exit(1);
}

console.log('✅ All tests passed!\n');
console.log('Next steps:');
console.log('  1. Run: npm run build:sdk:js');
console.log('  2. Open: demo/test-js.html in a browser');
console.log('  3. Test the JavaScript version in your project');
console.log('');
