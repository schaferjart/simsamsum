/**
 * Quick debug test for table modifications
 * Open browser console and run this to test table updates
 */

// Test direct modification of elements
if (window.workflowApp) {
    console.log('Testing table modification...');
    
    // Get current data
    const currentElements = window.workflowApp.elements || [];
    console.log('Current elements:', currentElements);
    
    // Modify first element
    if (currentElements.length > 0) {
        const modified = [...currentElements];
        modified[0].name = 'MODIFIED - ' + modified[0].name;
        modified[0].cost = 999;
        
        console.log('Calling updateFromTable with modified data...');
        window.workflowApp.updateFromTable('elements', modified);
        
        console.log('Update completed. Check graph for changes.');
    } else {
        console.log('No elements found to modify');
    }
} else {
    console.log('workflowApp not found on window');
}
