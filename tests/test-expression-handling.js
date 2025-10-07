#!/usr/bin/env node

/**
 * Test script to verify connection expression handling
 * Simulates the data flow when editing connection probabilities with expressions
 */

import { resolveValue, extractExpressionTokens } from '../src/js/data.js';

console.log('🧪 CONNECTION EXPRESSION HANDLING TEST\n');
console.log('=' .repeat(60));

// Test 1: Expression token extraction
console.log('\n📋 TEST 1: Expression Token Extraction');
console.log('-'.repeat(60));

const testExpressions = [
    '1 - text_application->pre_call_sms',
    '0.5 * (var1 + text_app->ghost)',
    'text_application->pre_call_sms',
    '0.75',
    'callback_rate'
];

testExpressions.forEach(expr => {
    const tokens = extractExpressionTokens(expr);
    console.log(`Expression: "${expr}"`);
    console.log(`  Tokens: [${tokens.join(', ')}]`);
});

// Test 2: Expression evaluation with generated variables
console.log('\n🔢 TEST 2: Expression Evaluation');
console.log('-'.repeat(60));

const variables = {
    'text_application->pre_call_sms': 0.6,
    'callback_rate': 0.4,
    'var1': 0.3,
    'text_app->ghost': 0.2
};

const testEvaluations = [
    { expr: '1 - text_application->pre_call_sms', expected: 0.4 },
    { expr: '0.5 * (var1 + text_app->ghost)', expected: 0.25 },
    { expr: 'text_application->pre_call_sms', expected: 0.6 },
    { expr: '0.75', expected: 0.75 },
    { expr: 'callback_rate', expected: 0.4 }
];

let passed = 0;
let failed = 0;

testEvaluations.forEach(({ expr, expected }) => {
    const result = resolveValue(expr, variables);
    const match = Math.abs(result - expected) < 0.0001;
    const status = match ? '✅' : '❌';
    
    console.log(`${status} Expression: "${expr}"`);
    console.log(`   Expected: ${expected}, Got: ${result}`);
    
    if (match) passed++;
    else failed++;
});

// Test 3: Simulated data flow
console.log('\n🔄 TEST 3: Simulated Data Flow');
console.log('-'.repeat(60));

// Simulate what happens in the application
const connections = [
    { id: 'text_application->pre_call_sms', fromId: 'text_application', toId: 'pre_call_sms', probability: 0.6 },
    { id: 'text_application->ghost', fromId: 'text_application', toId: 'ghost', probability: '1 - text_application->pre_call_sms' }
];

console.log('Initial connections:');
connections.forEach(c => {
    console.log(`  ${c.id}: probability = ${JSON.stringify(c.probability)}`);
});

// Step 1: Generate variables from connections (what refreshGeneratedVariables does)
const generatedVariables = {};
connections.forEach(conn => {
    const probabilityRaw = conn.probability !== undefined && conn.probability !== null ? conn.probability : 1;
    
    if (typeof probabilityRaw === 'number') {
        generatedVariables[conn.id] = probabilityRaw;
    } else if (typeof probabilityRaw === 'string' && probabilityRaw.trim() !== '') {
        const trimmed = probabilityRaw.trim();
        if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
            generatedVariables[conn.id] = Number(trimmed);
        } else {
            generatedVariables[conn.id] = trimmed; // Keep expression as-is
        }
    } else {
        generatedVariables[conn.id] = 1;
    }
});

console.log('\nGenerated variables (for persistence):');
Object.entries(generatedVariables).forEach(([k, v]) => {
    console.log(`  ${k}: ${JSON.stringify(v)}`);
});

// Step 2: Evaluate expressions (what happens during computeDerivedFields)
console.log('\nEvaluated values (for calculations):');
Object.entries(generatedVariables).forEach(([k, v]) => {
    const evaluated = resolveValue(v, generatedVariables);
    console.log(`  ${k}: ${JSON.stringify(v)} → ${evaluated}`);
});

// Test 4: Persistence simulation
console.log('\n💾 TEST 4: Persistence Simulation');
console.log('-'.repeat(60));

const manualVariables = {
    'callback_rate': 0.4,
    'incoming_volume': 10000
};

// What gets saved (manual + generated)
const persistedVariables = {
    ...generatedVariables,
    ...manualVariables
};

console.log('Persisted variables (saved to variables.json):');
Object.entries(persistedVariables).forEach(([k, v]) => {
    const type = typeof v === 'string' ? 'expression' : 'number';
    console.log(`  ${k}: ${JSON.stringify(v)} (${type})`);
});

// Verify expressions are preserved
const hasExpression = Object.values(persistedVariables).some(v => 
    typeof v === 'string' && v.includes('-')
);

console.log(`\n${hasExpression ? '✅' : '❌'} Expressions preserved in persisted data`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Evaluation tests: ${passed} passed, ${failed} failed`);
console.log(`Expression preservation: ${hasExpression ? 'PASS' : 'FAIL'}`);
console.log(`\nOverall: ${failed === 0 && hasExpression ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
console.log('='.repeat(60));
