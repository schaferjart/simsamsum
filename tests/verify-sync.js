#!/usr/bin/env node

/**
 * Comprehensive Data Sync Verification Report
 * This script provides a complete analysis of the data synchronization
 * between the JSON files and the application.
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

async function verifyDataSync() {
    console.log('🔍 COMPREHENSIVE DATA SYNC VERIFICATION REPORT');
    console.log('=' .repeat(60));
    
    const dataDir = path.join(__dirname, '..', 'data');
    let allTestsPassed = true;
    
    try {
        // Test 1: JSON File Integrity
        console.log('\n📁 TEST 1: JSON File Integrity');
        console.log('-'.repeat(40));
        
        const elements = JSON.parse(await fs.readFile(path.join(dataDir, 'elements.json'), 'utf8'));
        const connections = JSON.parse(await fs.readFile(path.join(dataDir, 'connections.json'), 'utf8'));
        const variables = JSON.parse(await fs.readFile(path.join(dataDir, 'variables.json'), 'utf8'));
        const workflow = JSON.parse(await fs.readFile(path.join(dataDir, 'workflow.json'), 'utf8'));
        
        console.log(`✅ elements.json: ${elements.length} items`);
        console.log(`✅ connections.json: ${connections.length} items`);
        console.log(`✅ variables.json: ${Object.keys(variables).length} items`);
        console.log(`✅ workflow.json: Combined file with timestamp ${workflow.timestamp}`);
        
        // Test 2: Data Consistency
        console.log('\n🔗 TEST 2: Data Consistency Check');
        console.log('-'.repeat(40));
        
        const elementIds = new Set(elements.map(e => e.id));
        const invalidConnections = connections.filter(c => 
            !elementIds.has(c.fromId) || !elementIds.has(c.toId)
        );
        
        if (invalidConnections.length === 0) {
            console.log('✅ All connections reference valid elements');
        } else {
            console.log(`❌ ${invalidConnections.length} invalid connections found:`);
            invalidConnections.forEach(c => console.log(`   ${c.id}: ${c.fromId} -> ${c.toId}`));
            allTestsPassed = false;
        }
        
        // Check variable references
        const usedVariables = new Set();
        const undefinedVars = new Set();
        elements.forEach(e => {
            if (typeof e.nodeMultiplier === 'string' && e.nodeMultiplier) {
                usedVariables.add(e.nodeMultiplier);
                if (!variables.hasOwnProperty(e.nodeMultiplier)) {
                    undefinedVars.add(e.nodeMultiplier);
                }
            }
            if (typeof e.incomingVolume === 'string' && e.incomingVolume) {
                usedVariables.add(e.incomingVolume);
                if (!variables.hasOwnProperty(e.incomingVolume)) {
                    undefinedVars.add(e.incomingVolume);
                }
            }
        });
        
        if (undefinedVars.size === 0) {
            console.log('✅ All variable references are valid');
        } else {
            console.log(`❌ Undefined variables: [${Array.from(undefinedVars).join(', ')}]`);
            allTestsPassed = false;
        }
        
        // Test 3: API Server Response
        console.log('\n🌐 TEST 3: API Server Response');
        console.log('-'.repeat(40));
        
        try {
            const healthResp = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/health',
                method: 'GET'
            });
            
            if (healthResp.status === 200) {
                console.log('✅ API health check successful');
                console.log(`   Server status: ${healthResp.data.status}`);
                console.log(`   Timestamp: ${healthResp.data.timestamp}`);
            } else {
                console.log(`❌ API health check failed with status ${healthResp.status}`);
                allTestsPassed = false;
            }
            
            const workflowResp = await makeRequest({
                hostname: 'localhost',
                port: 3001,
                path: '/api/load-workflow',
                method: 'GET'
            });
            
            if (workflowResp.status === 200) {
                console.log('✅ API workflow data loading successful');
                console.log(`   Elements returned: ${workflowResp.data.elements?.length || 0}`);
                console.log(`   Connections returned: ${workflowResp.data.connections?.length || 0}`);
                console.log(`   Variables returned: ${Object.keys(workflowResp.data.variables || {}).length}`);
                
                // Test 4: API vs File Data Consistency
                console.log('\n🔄 TEST 4: API vs File Data Consistency');
                console.log('-'.repeat(40));
                
                const apiElements = workflowResp.data.elements || [];
                const apiConnections = workflowResp.data.connections || [];
                const apiVariables = workflowResp.data.variables || {};
                
                if (apiElements.length === elements.length) {
                    console.log('✅ Element count matches between API and files');
                } else {
                    console.log(`❌ Element count mismatch: API=${apiElements.length}, Files=${elements.length}`);
                    allTestsPassed = false;
                }
                
                if (apiConnections.length === connections.length) {
                    console.log('✅ Connection count matches between API and files');
                } else {
                    console.log(`❌ Connection count mismatch: API=${apiConnections.length}, Files=${connections.length}`);
                    allTestsPassed = false;
                }
                
                if (Object.keys(apiVariables).length === Object.keys(variables).length) {
                    console.log('✅ Variable count matches between API and files');
                } else {
                    console.log(`❌ Variable count mismatch: API=${Object.keys(apiVariables).length}, Files=${Object.keys(variables).length}`);
                    allTestsPassed = false;
                }
                
                // Check element IDs match
                const apiElementIds = new Set(apiElements.map(e => e.id));
                const fileElementIds = new Set(elements.map(e => e.id));
                const missingFromApi = [...fileElementIds].filter(id => !apiElementIds.has(id));
                const extraInApi = [...apiElementIds].filter(id => !fileElementIds.has(id));
                
                if (missingFromApi.length === 0 && extraInApi.length === 0) {
                    console.log('✅ Element IDs match perfectly between API and files');
                } else {
                    if (missingFromApi.length > 0) {
                        console.log(`❌ Missing from API: [${missingFromApi.join(', ')}]`);
                        allTestsPassed = false;
                    }
                    if (extraInApi.length > 0) {
                        console.log(`❌ Extra in API: [${extraInApi.join(', ')}]`);
                        allTestsPassed = false;
                    }
                }
                
            } else {
                console.log(`❌ API workflow data loading failed with status ${workflowResp.status}`);
                allTestsPassed = false;
            }
            
        } catch (apiError) {
            console.log(`❌ API server connection failed: ${apiError.message}`);
            console.log('   Make sure the server is running on port 3001');
            allTestsPassed = false;
        }
        
        // Test 5: Sample Data Analysis
        console.log('\n📊 TEST 5: Sample Data Analysis');
        console.log('-'.repeat(40));
        
        const sampleElement = elements[0];
        console.log('Sample Element Structure:');
        console.log(`   ID: ${sampleElement.id}`);
        console.log(`   Name: ${sampleElement.name}`);
        console.log(`   Type: ${sampleElement.type}`);
        console.log(`   Cost: ${sampleElement.cost}`);
        console.log(`   Incoming Volume: ${sampleElement.incomingVolume}`);
        console.log(`   Node Multiplier: ${sampleElement.nodeMultiplier}`);
        
        const sampleConnection = connections[0];
        console.log('\\nSample Connection Structure:');
        console.log(`   ID: ${sampleConnection.id}`);
        console.log(`   From: ${sampleConnection.fromId}`);
        console.log(`   To: ${sampleConnection.toId}`);
        
        console.log('\\nVariable Values:');
        Object.entries(variables).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        
        // Test 6: Workflow Types Analysis
        console.log('\n🏗️ TEST 6: Workflow Structure Analysis');
        console.log('-'.repeat(40));
        
        const typeDistribution = {};
        const areaDistribution = {};
        const platformDistribution = {};
        
        elements.forEach(e => {
            typeDistribution[e.type] = (typeDistribution[e.type] || 0) + 1;
            areaDistribution[e.area] = (areaDistribution[e.area] || 0) + 1;
            platformDistribution[e.platform] = (platformDistribution[e.platform] || 0) + 1;
        });
        
        console.log('Type Distribution:');
        Object.entries(typeDistribution).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} elements`);
        });
        
        console.log('\\nArea Distribution:');
        Object.entries(areaDistribution).forEach(([area, count]) => {
            console.log(`   ${area}: ${count} elements`);
        });
        
        console.log('\\nPlatform Distribution:');
        Object.entries(platformDistribution).forEach(([platform, count]) => {
            console.log(`   ${platform}: ${count} elements`);
        });
        
        // Summary
        console.log('\\n' + '='.repeat(60));
        console.log('📋 VERIFICATION SUMMARY');
        console.log('='.repeat(60));
        
        if (allTestsPassed) {
            console.log('✅ ALL TESTS PASSED!');
            console.log('');
            console.log('Data synchronization is working correctly:');
            console.log('• JSON files are valid and consistent');
            console.log('• API server is responding correctly');
            console.log('• Data structures match between files and API');
            console.log('• All element and connection references are valid');
            console.log('• Variable references are properly defined');
            console.log('');
            console.log('The workflow visualizer should display:');
            console.log(`• ${elements.length} nodes representing the workflow elements`);
            console.log(`• ${connections.length} links showing the flow connections`);
            console.log(`• Interactive features powered by ${Object.keys(variables).length} variables`);
            
        } else {
            console.log('❌ SOME TESTS FAILED!');
            console.log('');
            console.log('There are issues with data synchronization.');
            console.log('Please review the test results above and fix any issues.');
        }
        
        console.log('\\n🌐 Frontend Verification:');
        console.log('• Open http://localhost:5174/ to see the main application');
        console.log('• Open http://localhost:5174/debug.html to run browser-side tests');
        console.log('• Check browser console for any JavaScript errors');
        console.log('• Verify that nodes and connections are visible in the visualization');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        process.exit(1);
    }
}

// Run the verification
verifyDataSync().catch(console.error);
