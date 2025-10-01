/**
 * File Manager for Workflow Visualizer
 * Handles saving and loading workflow data to/from actual files in the project directory
 */

import { generateIdFromName } from './utils.js';

/**
 * Default file paths for persistence
 */
const DEFAULT_FILES = {
    elements: 'data/elements.json',
    connections: 'data/connections.json', 
    variables: 'data/variables.json',
    combined: 'data/workflow.json'
};

/**
 * Save workflow data to individual JSON files using server API
 * @param {Array} elements - Elements/nodes data
 * @param {Array} connections - Connections data  
 * @param {Object} variables - Variables data
 */
export async function saveToFiles(elements, connections, variables) {
    const data = {
        elements: elements || [],
        connections: connections || [],
        variables: variables || {}
    };

    try {
        // Try to save via API server first
        const response = await fetch('http://localhost:3001/api/save-workflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Workflow data saved to actual files via API server');
            return true;
        } else {
            throw new Error(`API server error: ${response.status}`);
        }

    } catch (error) {
        console.warn('⚠️ API server not available, falling back to downloads:', error.message);
        
        // Fallback: download files
        downloadJsonFile(data.elements, 'elements.json');
        downloadJsonFile(data.connections, 'connections.json');
        downloadJsonFile(data.variables, 'variables.json');
        downloadJsonFile(data, 'workflow.json');
        
        console.log('📥 Workflow data downloaded as files (fallback)');
        return false;
    }
}

/**
 * Load workflow data from a JSON file
 * @param {File} file - The JSON file to load
 * @returns {Promise<Object>} Parsed workflow data
 */
export async function loadFromFile(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Handle both combined format and individual formats
        if (data.elements && data.connections && data.variables) {
            // Combined format
            return {
                elements: data.elements || [],
                connections: data.connections || [],
                variables: data.variables || {}
            };
        } else if (Array.isArray(data)) {
            // Legacy nodes array format
            return convertLegacyFormat(data);
        } else {
            // Single file format (elements, connections, or variables)
            return data;
        }
    } catch (error) {
        console.error('❌ Failed to load from file:', error);
        throw new Error('Invalid JSON file format');
    }
}

/**
 * Auto-save functionality - saves to localStorage as backup
 * and triggers server save every N changes
 */
let changeCounter = 0;
const AUTO_SAVE_THRESHOLD = 10; // Save to server every 10 changes

export function autoSave(elements, connections, variables, forceServerSave = false) {
    // Always save to localStorage as backup
    saveToLocalStorage(elements, connections, variables);
    
    changeCounter++;
    
    // Periodically save to server
    if (forceServerSave || changeCounter >= AUTO_SAVE_THRESHOLD) {
        saveToFiles(elements, connections, variables);
        changeCounter = 0;
    }
}

/**
 * Save to localStorage (backup)
 */
function saveToLocalStorage(elements, connections, variables) {
    try {
        const data = {
            elements,
            connections, 
            variables,
            lastSaved: Date.now()
        };
        localStorage.setItem('workflowData', JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
}

/**
 * Download JSON data as file
 */
function downloadJsonFile(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
        type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Convert legacy flat array format to new structure
 */
function convertLegacyFormat(legacyData) {
    const elements = legacyData.map((item, index) => {
        const name = item.Name || `Element ${index}`;
        return {
            id: generateIdFromName(name), // Auto-generate ID from name
            name: name,
            type: item.Type || 'Action',
            area: item.Area || 'General',
            cost: parseFloat(item['Ø Cost'] || item.Cost || 0),
            platform: item.Platform || '',
            execution: item.Execution || 'Manual',
            incomingVolume: 0, // Will be calculated
            description: item.Description || ''
        };
    });

    const connections = [];
    legacyData.forEach(item => {
        if (item.Outgoing) {
            const targets = item.Outgoing.split(',').map(s => s.trim());
            targets.forEach(target => {
                connections.push({
                    id: `${item.Name}->${target}`, // Auto-generate ID
                    fromId: item.Name,
                    toId: target
                });
            });
        }
    });

    return {
        elements,
        connections,
        variables: {}
    };
}

/**
 * Initialize file manager with auto-save functionality
 */
export function initFileManager(core) {
    // Auto-save on changes (no additional UI needed - button is in HTML)
    const originalUpdateFromTable = core.updateFromTable.bind(core);
    core.updateFromTable = function(type, data) {
        originalUpdateFromTable(type, data);
        autoSave(this.elements || this.nodes, this.connections, this.variables);
    };
}
