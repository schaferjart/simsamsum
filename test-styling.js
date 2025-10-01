// Test styling rules to verify functionality

// Test node styling
console.log('Testing node styling...');
const testNodeRule = {
    scope: 'node',
    condition: { column: 'Type', operator: 'equals', value: 'Resource' },
    style: { color: '#ff0000', strokeWidth: 5 }
};

// Test connection styling
console.log('Testing connection styling...');
const testConnectionRule = {
    scope: 'connection',
    condition: { column: 'source.Type', operator: 'equals', value: 'Resource' },
    style: { color: '#00ff00', strokeWidth: 4 }
};

// Apply test rules if app is available
if (window.workflowApp) {
    console.log('Applying test styling rules...');
    const { applyStylingRules } = await import('./src/js/filtering.js');
    
    const nodes = window.workflowApp.state.nodes;
    const links = window.workflowApp.state.links;
    
    applyStylingRules(nodes, links, [testNodeRule, testConnectionRule]);
    window.workflowApp.updateVisualization();
    console.log('Test styling applied!');
} else {
    console.log('App not available - load data first');
}
