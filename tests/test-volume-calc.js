/**
 * Test volume calculation functionality
 * Run this in the browser console to test the volume calculation
 */

console.log('🧪 Testing Volume Calculation');
console.log('=' .repeat(50));

if (window.workflowApp) {
    console.log('📊 Current state:');
    console.log('Elements:', window.workflowApp.elements?.length || 0);
    console.log('Connections:', window.workflowApp.connections?.length || 0);
    console.log('Variables:', window.workflowApp.variables);
    
    // Find source nodes (nodes with incomingNumber that reference variables)
    console.log('\n🔍 Source nodes (with incomingNumber referring to variables):');
    const variables = window.workflowApp.variables || {};
    const elements = window.workflowApp.elements || [];
    
    const sourceNodes = elements.filter(e => {
        return e.incomingNumber && (
            variables.hasOwnProperty(e.incomingNumber) || 
            e.incomingNumber.startsWith('${')
        );
    });
    
    sourceNodes.forEach(node => {
        console.log(`  ${node.id}: ${node.incomingNumber} -> ${variables[node.incomingNumber] || 'variable not found'}`);
    });
    
    // Check current incomingNumber values
    console.log('\n📊 Current incomingNumber values (first 10 elements):');
    elements.slice(0, 10).forEach(e => {
        console.log(`  ${e.id}: ${e.incomingNumber || 'empty'}`);
    });
    
    // Force volume calculation
    console.log('\n🔄 Triggering volume calculation...');
    window.workflowApp.computeDerivedFields();
    
    // Check updated values
    setTimeout(() => {
        console.log('\n✅ Updated incomingNumber values (first 10 elements):');
        elements.slice(0, 10).forEach(e => {
            console.log(`  ${e.id}: ${e.incomingNumber || 'empty'}`);
        });
        
        console.log('\n📋 Check the Elements table to see if incomingNumber column shows calculated volumes!');
    }, 1000);
    
} else {
    console.log('❌ workflowApp not found');
}
