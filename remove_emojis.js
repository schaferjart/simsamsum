#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to remove emojis from text
function removeEmojis(text) {
    return text
        // Remove specific common emojis found in the codebase
        .replace(/DEBUG:/g, 'DEBUG:')
        .replace(/SUCCESS:/g, 'SUCCESS:')
        .replace(/ERROR:/g, 'ERROR:')
        .replace(/WARNING:/g, 'WARNING:')
        .replace(/STATS:/g, 'STATS:')
        .replace(/LINKS:/g, 'LINKS:')
        .replace(/SEARCH:/g, 'SEARCH:')
        .replace(/FILES:/g, 'FILES:')
        .replace(/SAVE:/g, 'SAVE:')
        .replace(/SYNC:/g, 'SYNC:')
        .replace(/INIT:/g, 'INIT:')
        .replace(/TARGET:/g, 'TARGET:')
        .replace(/FLOW:/g, 'FLOW:')
        .replace(/DOWNLOAD:/g, 'DOWNLOAD:')
        .replace(/PROCESS:/g, 'PROCESS:')
        .replace(/LAUNCH:/g, 'LAUNCH:')
        .replace(/TEST:/g, 'TEST:')
        .replace(/DOC:/g, 'DOC:')
        .replace(/TEST:/g, 'TEST:')
        .replace(/PACKAGE:/g, 'PACKAGE:')
        .replace(/STYLE:/g, 'STYLE:')
        .replace(/MASK:/g, 'MASK:')
        // Remove any remaining emoji unicode ranges
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
}

// Function to process a JavaScript file
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const cleanContent = removeEmojis(content);
        
        if (content !== cleanContent) {
            fs.writeFileSync(filePath, cleanContent, 'utf8');
            console.log(`Cleaned emojis from: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
    }
}

// Function to recursively find and process JS files
function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            processDirectory(fullPath);
        } else if (stat.isFile() && item.endsWith('.js')) {
            processFile(fullPath);
        }
    }
}

// Start processing from current directory
const startDir = process.cwd();
console.log(`Starting emoji removal from: ${startDir}`);
processDirectory(startDir);
console.log('Emoji removal completed!');
