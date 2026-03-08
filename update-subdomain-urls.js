#!/usr/bin/env node

/**
 * Update hardcoded URLs for subdomain deployment
 * Changes all 'https://newnodues.vercel.app' to 'https://jecrc-no-dues-system.reverbex.in'
 */

const fs = require('fs');
const path = require('path');

const OLD_URL = 'https://newnodues.vercel.app';
const NEW_URL = 'https://jecrc-no-dues-system.reverbex.in';

const FILES_TO_UPDATE = [
  'src/lib/urlHelper.js',
  'src/lib/emailService.js', 
  'src/app/api/admin/send-reminder/route.js',
  'src/lib/blockchainService.js'
];

console.log('🔧 Updating hardcoded URLs for subdomain deployment...\n');

FILES_TO_UPDATE.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  
  try {
    // Read file
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Check if file contains old URL
    if (!content.includes(OLD_URL)) {
      console.log(`⚠️  ${filePath} - No old URL found`);
      return;
    }
    
    // Count occurrences
    const occurrences = (content.match(new RegExp(OLD_URL, 'g')) || []).length;
    
    // Replace URLs
    content = content.replace(new RegExp(OLD_URL, 'g'), NEW_URL);
    
    // Write back
    fs.writeFileSync(fullPath, content, 'utf8');
    
    console.log(`✅ ${filePath} - Updated ${occurrences} occurrence(s)`);
    
  } catch (error) {
    console.log(`❌ ${filePath} - Error: ${error.message}`);
  }
});

console.log('\n🎉 URL update complete!');
console.log('📝 Don\'t forget to:');
console.log('   1. Add NEXT_PUBLIC_BASE_URL=https://jecrc-no-dues-system.reverbex.in to your .env');
console.log('   2. Update your Vercel project domain');
console.log('   3. Test all email links and redirects');
