// Quick test function for connection styling
// Run this in the browser console after loading data

function testConnectionStyling() {
    console.log('TEST: Testing connection styling...');
    
    if (!window.workflowApp) {
        console.error('ERROR: App not loaded - load data first');
        return;
    }
    
    const nodes = window.workflowApp.state.nodes;
    const links = window.workflowApp.state.links;
    
    console.log('STATS: Available nodes:', nodes.length);
    console.log('LINKS: Available links:', links.length);
    
    // Test: Find nodes by type
    const actionNodes = nodes.filter(n => n.Type === 'Action');
    const resourceNodes = nodes.filter(n => n.Type === 'Resource');
    
    console.log('MASK: Action nodes:', actionNodes.length);
    console.log('PACKAGE: Resource nodes:', resourceNodes.length);
    
    // Test: Create a simple styling rule
    const testRule = {
        scope: 'connection',
        condition: { column: 'source.Type', operator: 'equals', value: 'Action' },
        style: { color: '#ff0000', strokeWidth: 5 }
    };
    
    // Apply the rule manually
    const { applyStylingRules } = window.workflowApp.modules?.filtering || {};
    if (applyStylingRules) {
        applyStylingRules(nodes, links, [testRule]);
        
        // Count styled links
        const styledLinks = links.filter(l => l.customStyle && l.customStyle.color);
        console.log('STYLE: Links with custom styling:', styledLinks.length);
        
        // Update visualization
        window.workflowApp.updateVisualization();
        console.log('SUCCESS: Test complete - check for red thick connections from Action nodes');
    } else {
        console.error('ERROR: Styling functions not available');
    }
}

// Export for browser console
window.testConnectionStyling = testConnectionStyling;
