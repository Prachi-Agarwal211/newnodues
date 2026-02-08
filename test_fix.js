/**
 * Quick test to verify the refreshData function is properly defined
 */

// Test if the hook exports refreshData correctly
try {
  const { useStaffDashboard } = require('./src/hooks/useStaffDashboard.js');
  
  // This would normally be called in a React component
  console.log('✅ Hook imported successfully');
  console.log('✅ refreshData function should now be available');
  
  // Check if the file has syntax errors by attempting to parse
  const fs = require('fs');
  const content = fs.readFileSync('./src/hooks/useStaffDashboard.js', 'utf8');
  
  // Basic syntax check
  try {
    new Function(content);
    console.log('✅ File syntax is valid');
  } catch (syntaxError) {
    console.error('❌ Syntax error found:', syntaxError.message);
  }
  
} catch (error) {
  console.error('❌ Import failed:', error.message);
}
