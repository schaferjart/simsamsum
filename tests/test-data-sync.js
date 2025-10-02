#!/usr/bin/env node

/**
 * Simple test script to verify data synchronization between JSON files and the app
 */

const fs = require('fs').promises;
const path = require('path');

async function testDataSync() {
    console.log('🧪 Testing data synchronization...\n');
    
    const dataDir = path.join(__dirname, '..', 'data');
    
    try {
        // Test 1: Check if data files exist
        console.log('📁 Checking data files existence...');
        const files = ['elements.json', 'connections.json', 'variables.json', 'workflow.json'];
        
        for (const file of files) {
            const filePath = path.join(dataDir, file);
            try {
                await fs.access(filePath);
                const stats = await fs.stat(filePath);
                console.log(`✅ ${file}: ${stats.size} bytes, modified: ${stats.mtime.toISOString()}`);
            } catch (error) {
                console.log(`❌ ${file}: NOT FOUND`);
            }
        }
        
        console.log('\n📊 Loading and analyzing data...');
        
        // Test 2: Load and validate data structure
        const elements = JSON.parse(await fs.readFile(path.join(dataDir, 'elements.json'), 'utf8'));
        const connections = JSON.parse(await fs.readFile(path.join(dataDir, 'connections.json'), 'utf8'));
        const variables = JSON.parse(await fs.readFile(path.join(dataDir, 'variables.json'), 'utf8'));
        
        console.log(`✅ Elements: ${elements.length} items`);
        console.log(`✅ Connections: ${connections.length} items`);
        console.log(`✅ Variables: ${Object.keys(variables).length} items`);
        
        // Test 3: Verify data consistency
        console.log('\n🔍 Verifying data consistency...');
        
        const elementIds = new Set(elements.map(e => e.id));
        const connectionIds = new Set();
        const invalidConnections = [];
        
        connections.forEach(conn => {
            connectionIds.add(conn.id);
            if (!elementIds.has(conn.fromId)) {
                invalidConnections.push(`${conn.id}: fromId '${conn.fromId}' not found`);
            }
            if (!elementIds.has(conn.toId)) {
                invalidConnections.push(`${conn.id}: toId '${conn.toId}' not found`);
            }
        });
        
        if (invalidConnections.length > 0) {
            console.log('❌ Invalid connections found:');
            invalidConnections.forEach(err => console.log(`   ${err}`));
        } else {
            console.log('✅ All connections reference valid elements');
        }
        
        // Test 4: Check for variable references
        console.log('\n🔗 Checking variable references...');
        const variableNames = Object.keys(variables);
        const usedVariables = new Set();
        const undefinedVariables = new Set();
        
        elements.forEach(element => {
            if (typeof element.nodeMultiplier === 'string' && element.nodeMultiplier !== '') {
                usedVariables.add(element.nodeMultiplier);
                if (!variables.hasOwnProperty(element.nodeMultiplier)) {
                    undefinedVariables.add(element.nodeMultiplier);
                }
            }
            if (typeof element.incomingVolume === 'string' && element.incomingVolume !== '') {
                usedVariables.add(element.incomingVolume);
                if (!variables.hasOwnProperty(element.incomingVolume)) {
                    undefinedVariables.add(element.incomingVolume);
                }
            }
        });
        
        console.log(`✅ Variables defined: [${variableNames.join(', ')}]`);
        console.log(`✅ Variables used: [${Array.from(usedVariables).join(', ')}]`);
        
        if (undefinedVariables.size > 0) {
            console.log(`❌ Undefined variables used: [${Array.from(undefinedVariables).join(', ')}]`);
        } else {
            console.log('✅ All used variables are defined');
        }
        
        // Test 5: Sample data structure
        console.log('\n📋 Sample data structure:');
        console.log('First element:', JSON.stringify(elements[0], null, 2));
        console.log('First connection:', JSON.stringify(connections[0], null, 2));
        console.log('Variables:', JSON.stringify(variables, null, 2));
        
        console.log('\n✅ Data synchronization test completed successfully!');
        
    } catch (error) {
        console.error('❌ Data synchronization test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testDataSync().catch(console.error);
