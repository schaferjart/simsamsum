/**
 * Test script to verify table-data synchronization
 * Run this in the browser console to test if the table shows the correct data
 */

console.log('🧪 Testing table-data synchronization...');

// Check if workflowApp is available
if (window.workflowApp) {
    console.log('📊 Current application state:');
    console.log('Elements:', window.workflowApp.elements?.length || 0);
    console.log('Connections:', window.workflowApp.connections?.length || 0);
    console.log('Variables:', Object.keys(window.workflowApp.variables || {}).length);
    
    // Check first element structure
    if (window.workflowApp.elements && window.workflowApp.elements.length > 0) {
        console.log('📝 First element structure:');
        console.log(window.workflowApp.elements[0]);
        
        // Check if required fields from elements.json are present
        const requiredFields = ['id', 'name', 'type', 'subType', 'aOR', 'execution', 'platform', 'variable', 'avgCost'];
        const firstElement = window.workflowApp.elements[0];
        
        console.log('🔍 Field validation:');
        requiredFields.forEach(field => {
            const hasField = field in firstElement;
            const value = firstElement[field];
            console.log(`  ${hasField ? '✅' : '❌'} ${field}: ${value}`);
        });
    }
    
    console.log('✅ Test completed. Check the Elements table in the UI to verify the data matches elements.json');
} else {
    console.log('❌ workflowApp not found on window object');
}
