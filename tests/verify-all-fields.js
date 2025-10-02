/**
 * Comprehensive verification script to check all fields are properly displayed
 * Run this in the browser console to verify the table mapping
 */

console.log('SEARCH: COMPREHENSIVE FIELD VERIFICATION');
console.log('=' .repeat(50));

if (window.workflowApp && window.workflowApp.elements && window.workflowApp.elements.length > 0) {
    const firstElement = window.workflowApp.elements[0];
    
    console.log('STATS: First element from workflowApp.elements:');
    console.log(firstElement);
    
    // All fields that should be in elements.json
    const expectedFields = [
        'id', 'name', 'incomingNumber', 'variable', 'type', 'subType', 
        'aOR', 'execution', 'account', 'platform', 'monitoring', 
        'monitoredData', 'description', 'avgCostTime', 'avgCost', 
        'effectiveCost', 'lastUpdate', 'nextUpdate', 'kPI', 
        'scheduleStart', 'scheduleEnd', 'frequency'
    ];
    
    console.log('\nSUCCESS: FIELD MAPPING VERIFICATION:');
    console.log('-'.repeat(40));
    
    let missingFields = [];
    let presentFields = [];
    
    expectedFields.forEach(field => {
        if (field in firstElement) {
            presentFields.push(field);
            console.log(`SUCCESS: ${field}: "${firstElement[field]}"`);
        } else {
            missingFields.push(field);
            console.log(`ERROR: ${field}: MISSING`);
        }
    });
    
    console.log('\nSTATS: SUMMARY:');
    console.log(`SUCCESS: Present fields: ${presentFields.length}/${expectedFields.length}`);
    console.log(`ERROR: Missing fields: ${missingFields.length}`);
    
    if (missingFields.length > 0) {
        console.log(`Missing: ${missingFields.join(', ')}`);
    } else {
        console.log(' All fields are properly mapped!');
    }
    
    console.log('\nINIT: TABLE VERIFICATION:');
    console.log('Check the Elements tab in the UI to verify:');
    console.log('1. All 22 columns are visible');
    console.log('2. Data matches elements.json values');
    console.log('3. incomingNumber, kPI, and other fields are now displayed');
    
} else {
    console.log('ERROR: workflowApp.elements not available');
}
