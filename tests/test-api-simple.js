#!/usr/bin/env node

/**
 * Test API endpoints from Node.js
 */

const http = require('http');

function makeRequest(options) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Testing API endpoints...\n');
    
    try {
        // Test health endpoint
        console.log('Testing /api/health...');
        const health = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/health',
            method: 'GET'
        });
        console.log('✅ Health:', health);
        
        // Test load workflow endpoint
        console.log('\nTesting /api/load-workflow...');
        const workflow = await makeRequest({
            hostname: 'localhost',
            port: 3001,
            path: '/api/load-workflow',
            method: 'GET'
        });
        console.log('✅ Workflow loaded:');
        console.log(`   Elements: ${workflow.elements?.length || 0}`);
        console.log(`   Connections: ${workflow.connections?.length || 0}`);
        console.log(`   Variables: ${Object.keys(workflow.variables || {}).length}`);
        
        if (workflow.elements && workflow.elements.length > 0) {
            console.log('\n📋 Sample loaded element:');
            console.log(JSON.stringify(workflow.elements[0], null, 2));
        }
        
        console.log('\n✅ API test completed successfully!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('   Make sure the API server is running on port 3001');
        }
    }
}

testAPI().catch(console.error);
