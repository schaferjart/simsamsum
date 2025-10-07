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

function ensureUniqueId(baseId, usedIds, fallbackPrefix) {
    const base = (baseId && baseId.trim()) || fallbackPrefix;
    let candidate = base;
    let counter = 1;
    while (!candidate || usedIds.has(candidate)) {
        candidate = `${base}_${counter++}`;
    }
    usedIds.add(candidate);
    return candidate;
}

function normalizeElements(elements = []) {
    const usedIds = new Set();
    return elements
        .filter(item => item && typeof item === 'object')
        .map((element, index) => {
            const clone = { ...element };
            const name = typeof clone.name === 'string' ? clone.name.trim() : '';
            let id = typeof clone.id === 'string' ? clone.id.trim() : '';

            if (!id && name) {
                id = generateIdFromName(name);
            }

            const fallback = `element_${index + 1}`;
            clone.id = ensureUniqueId(id, usedIds, fallback);
            if (name && !clone.name) {
                clone.name = name;
            }

            delete clone.computedIncomingNumber;
            delete clone.resolvedAvgCost;
            delete clone.resolvedAvgCost;

            Object.assign(element, clone);
            return clone;
        });
}

function normalizeConnections(connections = [], elementIdSet = new Set()) {
    const usedIds = new Set();
    return connections
        .filter(item => item && typeof item === 'object')
        .map((connection, index) => {
            const fromId = typeof connection.fromId === 'string' ? connection.fromId.trim() : '';
            const toId = typeof connection.toId === 'string' ? connection.toId.trim() : '';

            if (!fromId || !toId) {
                return null;
            }

            if (elementIdSet.size && (!elementIdSet.has(fromId) || !elementIdSet.has(toId))) {
                return null;
            }

            const clone = { ...connection };
            clone.fromId = fromId;
            clone.toId = toId;

            const probability = connection.probability;
            if (probability === undefined || probability === null) {
                clone.probability = '';
            } else if (typeof probability === 'string') {
                clone.probability = probability.trim();
            } else {
                clone.probability = probability;
            }

            const optionalStringFields = ['time', 'condition', 'execution', 'AOR'];
            optionalStringFields.forEach(field => {
                const value = connection[field];
                clone[field] = typeof value === 'string' ? value : (value ?? '');
            });

            let id = typeof clone.id === 'string' ? clone.id.trim() : '';
            if (!id) {
                id = `${fromId}->${toId}`;
            }

            const fallback = `connection_${index + 1}`;
            clone.id = ensureUniqueId(id, usedIds, fallback);

            Object.assign(connection, clone);
            return clone;
        })
        .filter(Boolean);
}

function preparePersistencePayload(elements = [], connections = [], variables = {}, generatedVariables = {}) {
    const normalizedElements = normalizeElements(elements);
    const elementIdSet = new Set(normalizedElements.map(e => e.id));
    const normalizedConnections = normalizeConnections(connections, elementIdSet);
    
    // Merge manual and generated variables for persistence
    // Manual variables take precedence over generated ones
    const normalizedVariables = { 
        ...(generatedVariables || {}),
        ...(variables || {}) 
    };

    return {
        elements: normalizedElements,
        connections: normalizedConnections,
        variables: normalizedVariables
    };
}

/**
 * Save workflow data to individual JSON files using server API
 * @param {Array} elements - Elements/nodes data
 * @param {Array} connections - Connections data  
 * @param {Object} variables - Variables data
 */
export async function saveToFiles(elements, connections, variables, generatedVariables = {}) {
    const payload = preparePersistencePayload(elements, connections, variables, generatedVariables);

    try {
        // Try to save via API server first
        const response = await fetch('http://localhost:3001/api/save-workflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
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
        downloadJsonFile(payload.elements, 'elements.json');
        downloadJsonFile(payload.connections, 'connections.json');
        downloadJsonFile(payload.variables, 'variables.json');
        downloadJsonFile(payload, 'workflow.json');
        
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

export function autoSave(elements, connections, variables, generatedVariables = {}, forceServerSave = false) {
    // Always save to localStorage as backup
    const payload = saveToLocalStorage(elements, connections, variables);
    
    changeCounter++;
    
    // Periodically save to server
    if (forceServerSave || changeCounter >= AUTO_SAVE_THRESHOLD) {
        saveToFiles(payload.elements, payload.connections, payload.variables, generatedVariables);
        changeCounter = 0;
    }
}

/**
 * Save to localStorage (backup)
 */
function saveToLocalStorage(elements, connections, variables) {
    const payload = preparePersistencePayload(elements, connections, variables);
    try {
        const data = {
            ...payload,
            lastSaved: Date.now()
        };
        localStorage.setItem('workflowData', JSON.stringify(data));
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
    }
    return payload;
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
        autoSave(this.elements || this.nodes, this.connections, this.variables, this.generatedVariables);
    };
}
