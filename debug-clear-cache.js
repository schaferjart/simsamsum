/**
 * Debugging script to clear localStorage and force fresh start
 * Run this in browser console to clear any cached data
 */

console.log('🧹 Clearing localStorage...');
localStorage.removeItem('workflowData');
console.log('✅ localStorage cleared');

console.log('🔄 Reloading page...');
window.location.reload();
