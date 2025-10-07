#!/usr/bin/env node

/**
 * Recalculate and update elements.json based on current variables and connections
 * Run this after manually editing variables.json to update the stored values
 */

import { computeDerivedFields } from '../src/js/data.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

console.log('🔄 Recalculating element volumes based on current variables...\n');

// Load current data
const elements = JSON.parse(fs.readFileSync(path.join(dataDir, 'elements.json'), 'utf8'));
const connections = JSON.parse(fs.readFileSync(path.join(dataDir, 'connections.json'), 'utf8'));
const variables = JSON.parse(fs.readFileSync(path.join(dataDir, 'variables.json'), 'utf8'));

console.log('📁 Loaded:');
console.log(`  Elements: ${elements.length}`);
console.log(`  Connections: ${connections.length}`);
console.log(`  Variables: ${Object.keys(variables).length}`);

// Map elements to calculation format
const mappedElements = elements.map(e => ({
    ...e,
    incomingVolume: e.incomingNumber ?? 0,
    nodeMultiplier: 1.0
}));

const mappedConnections = connections.map(c => ({
    ...c,
    fromId: c.fromId,
    toId: c.toId,
    probability: c.probability
}));

console.log('\n🔢 Computing volumes...');

// Run the calculation
computeDerivedFields(mappedElements, mappedConnections, variables);

console.log('\n📊 Updating elements with calculated values:');
console.log('-'.repeat(60));

// Update original elements with calculated values
let changesCount = 0;
mappedElements.forEach((mapped, index) => {
    const element = elements[index];
    const oldIncoming = element.incomingNumber;
    const oldEffective = element.effectiveCost;
    
    // Update incoming number (if it was calculated)
    const calculatedVolume = Number.isFinite(mapped.computedVolumeIn) 
        ? Math.round(mapped.computedVolumeIn * 100) / 100
        : null;
    
    if (calculatedVolume !== null) {
        // Check if this is a source node (has a variable reference)
        const isSourceNode = typeof element.incomingNumber === 'string' && element.incomingNumber.trim() !== '';
        
        if (!isSourceNode) {
            element.computedIncomingNumber = calculatedVolume;
            element.incomingNumber = calculatedVolume;
        } else {
            element.computedIncomingNumber = calculatedVolume;
        }
    }
    
    // Update effective cost
    const avgCost = parseFloat(element.avgCost) || 0;
    const incomingVol = typeof element.incomingNumber === 'number' 
        ? element.incomingNumber 
        : (element.computedIncomingNumber || 0);
    const newEffectiveCost = Math.round(avgCost * incomingVol * 100) / 100;
    
    element.effectiveCost = newEffectiveCost;
    
    // Log changes
    if (oldIncoming !== element.incomingNumber || oldEffective !== element.effectiveCost) {
        console.log(`✏️  ${element.name}`);
        if (oldIncoming !== element.incomingNumber) {
            console.log(`    Incoming: ${oldIncoming} → ${element.incomingNumber}`);
        }
        if (oldEffective !== element.effectiveCost) {
            console.log(`    Effective Cost: ${oldEffective} → ${element.effectiveCost}`);
        }
        changesCount++;
    }
});

// Save updated elements
fs.writeFileSync(
    path.join(dataDir, 'elements.json'),
    JSON.stringify(elements, null, 2)
);

console.log('-'.repeat(60));
console.log(`✅ Updated ${changesCount} elements`);
console.log('\n💾 Saved to data/elements.json');
console.log('\n🌐 Reload the browser to see changes in the UI');
