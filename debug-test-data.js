// Simple test data to verify the flow
export const testData = {
    elements: [
        {
            id: "test1",
            name: "Test Element 1",
            type: "Action",
            area: "Testing",
            platform: "Test Platform",
            execution: "Manual",
            cost: 10,
            incomingVolume: 0,
            description: "Test element for debugging"
        }
    ],
    connections: [
        {
            id: "test1->test2",
            fromId: "test1",
            toId: "test2",
            probability: 1.0,
            type: "flow",
            description: "Test connection"
        }
    ],
    variables: {
        test_rate: 0.5
    }
};

// Function to load test data
export function loadTestData() {
    if (window.workflowApp) {
        console.log('Loading test data...');
        window.workflowApp.updateFromTable('elements', testData.elements);
        window.workflowApp.updateFromTable('connections', testData.connections);
        window.workflowApp.updateFromTable('variables', testData.variables);
        console.log('Test data loaded!');
    } else {
        console.log('workflowApp not available');
    }
}
