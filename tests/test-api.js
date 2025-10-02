/**
 * Test the API server endpoints
 * Run this in browser console to test file saving functionality
 */

async function testAPI() {
    console.log('TEST: Testing API server...');
    
    // Test health endpoint
    try {
        const health = await fetch('http://localhost:3001/api/health');
        const healthData = await health.json();
        console.log('SUCCESS: Health check:', healthData);
    } catch (error) {
        console.error('ERROR: Health check failed:', error);
        return;
    }
    
    // Test save endpoint
    const testData = {
        elements: [
            {
                id: "api_test",
                name: "API Test Element",
                type: "Action",
                area: "Testing",
                platform: "API",
                execution: "Automatic",
                cost: 1.5,
                incomingVolume: 0,
                description: "Test element created via API"
            }
        ],
        connections: [
            {
                id: "api_test_connection",
                fromId: "api_test",
                toId: "target",
                probability: 0.8,
                type: "flow",
                description: "Test connection via API"
            }
        ],
        variables: {
            api_test_rate: 0.75
        }
    };
    
    try {
        const saveResponse = await fetch('http://localhost:3001/api/save-workflow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        const saveResult = await saveResponse.json();
        console.log('SUCCESS: Save test:', saveResult);
    } catch (error) {
        console.error('ERROR: Save test failed:', error);
    }
    
    // Test load endpoint
    try {
        const loadResponse = await fetch('http://localhost:3001/api/load-workflow');
        const loadData = await loadResponse.json();
        console.log('SUCCESS: Load test:', loadData);
    } catch (error) {
        console.error('ERROR: Load test failed:', error);
    }
}

// Run the test
testAPI();
