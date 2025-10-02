/**
 * Test the specific volume calculation fix
 * Run this in the browser console to verify the calculation
 */

console.log('TEST: Testing Volume Calculation Fix');
console.log('=' .repeat(50));

if (window.workflowApp) {
    const elements = window.workflowApp.elements || [];
    const connections = window.workflowApp.connections || [];
    const variables = window.workflowApp.variables || {};
    
    console.log('STATS: Key nodes and their variables:');
    const keyNodes = ['indeed', 'text_application', 'pre_call_sms', 'ai_call', 'pre_video_mail'];
    keyNodes.forEach(nodeId => {
        const node = elements.find(e => e.id === nodeId);
        if (node) {
            console.log(`  ${nodeId}: incomingNumber="${node.incomingNumber}", variable=${node.variable}`);
        }
    });
    
    console.log('\nLINKS: Key connections:');
    const keyConnections = connections.filter(c => 
        keyNodes.includes(c.fromId) && keyNodes.includes(c.toId)
    );
    keyConnections.forEach(conn => {
        const targetNode = elements.find(e => e.id === conn.toId);
        console.log(`  ${conn.fromId} → ${conn.toId} (target variable: ${targetNode?.variable || 'N/A'})`);
    });
    
    console.log('\nSTATS: Variables from variables.json:');
    console.log(variables);
    
    console.log('\nSYNC: Triggering volume calculation...');
    window.workflowApp.computeDerivedFields();
    
    setTimeout(() => {
        console.log('\nSUCCESS: Updated volumes:');
        keyNodes.forEach(nodeId => {
            const node = elements.find(e => e.id === nodeId);
            if (node) {
                console.log(`  ${nodeId}: ${node.incomingNumber}`);
            }
        });
        
        console.log('\nTARGET: Expected vs Actual:');
        console.log('Expected:');
        console.log('  indeed: 2000');
        console.log('  text_application: 2000');
        console.log('  pre_call_sms: 500 (2000 × 0.25)');
        console.log('  ai_call: 500');
        console.log('  pre_video_mail: 1500 (2000 × 0.75)');
        
        console.log('\nActual:');
        keyNodes.forEach(nodeId => {
            const node = elements.find(e => e.id === nodeId);
            if (node) {
                console.log(`  ${nodeId}: ${node.incomingNumber}`);
            }
        });
    }, 1000);
    
} else {
    console.log('ERROR: workflowApp not found');
}
