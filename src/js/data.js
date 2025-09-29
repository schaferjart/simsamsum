import Papa from 'papaparse';
import { calculateNodeSize, getBorderStyle } from './utils.js';

export const sampleData = [
    {
        "Name": "Indeed",
        "Type": "Resource",
        "Execution": "Automatic",
        "Ø Cost": 0.3,
        "Effective Cost": 120.0,
        "Monitoring": "Team Tailor",
        "Platform": "Indeed",
        "Incoming": "",
        "Outgoing": "Text Application"
    },
    {
        "Name": "Text Application",
        "Type": "Action",
        "Execution": "Applicant",
        "Ø Cost": 0.2,
        "Effective Cost": 80.0,
        "Monitoring": "Team Tailor",
        "Platform": "TypeForm",
        "Incoming": "Indeed",
        "Outgoing": "Video Application"
    },
    {
        "Name": "AI Call",
        "Type": "Action",
        "Execution": "Automatic",
        "Ø Cost": 0.4,
        "Effective Cost": 40.0,
        "Monitoring": "Team Tailor",
        "Platform": "Solers",
        "Incoming": "Pre Call SMS",
        "Outgoing": "Pre Video Mail"
    },
    {
        "Name": "Application Review 1",
        "Type": "Decision",
        "Execution": "Noemie",
        "Ø Cost": 0.1,
        "Effective Cost": 4.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Video Application",
        "Outgoing": "Rejection 1,Application Review 2"
    },
    {
        "Name": "Ghost 1",
        "Type": "State",
        "Execution": "Applicant",
        "Ø Cost": null,
        "Effective Cost": null,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Video Application",
        "Outgoing": ""
    },
    {
        "Name": "Pre Call SMS",
        "Type": "Action",
        "Execution": "Automatic",
        "Ø Cost": 0.1,
        "Effective Cost": 10.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Text Application",
        "Outgoing": "AI Call"
    },
    {
        "Name": "Pre Video Mail",
        "Type": "Action",
        "Execution": "Automatic",
        "Ø Cost": 0.05,
        "Effective Cost": 5.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "AI Call",
        "Outgoing": "Video Application"
    },
    {
        "Name": "Video Application",
        "Type": "Action",
        "Execution": "Applicant",
        "Ø Cost": 0.1,
        "Effective Cost": 40.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Pre Video Mail",
        "Outgoing": "Application Review 1,Ghost 1"
    },
    {
        "Name": "Rejection 1",
        "Type": "State",
        "Execution": "Automatic",
        "Ø Cost": 0.1,
        "Effective Cost": 2.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Application Review 1",
        "Outgoing": ""
    },
    {
        "Name": "Application Review 2",
        "Type": "Decision",
        "Execution": "Manual",
        "Ø Cost": 1.0,
        "Effective Cost": 50.0,
        "Monitoring": "Team Tailor",
        "Platform": "Team Tailor",
        "Incoming": "Application Review 1",
        "Outgoing": ""
    }
];

/**
 * Resolves a numeric value possibly defined as a variable reference.
 * Accepts numeric values, numeric strings, or variable keys like "rate" or "${rate}".
 * @param {string|number} value
 * @param {Record<string, number>} variables
 * @returns {number}
 */
export function resolveValue(value, variables = {}) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        const asNum = parseFloat(trimmed);
        if (!Number.isNaN(asNum)) return asNum;
        const match = trimmed.match(/^\s*(?:\$?\{)?([a-zA-Z_][\w]*)\}?\s*$/);
        if (match) {
            const key = match[1];
            const v = variables[key];
            return typeof v === 'number' ? v : 0;
        }
        return 0;
    }
    const n = parseFloat(value);
    return Number.isNaN(n) ? 0 : n;
}

/**
 * Processes raw data from CSV into nodes and links.
 * @param {Array<Object>} data - The raw data from PapaParse.
 * @param {boolean} costBasedSizing - Whether to use cost-based sizing.
 * @returns {{nodes: Array<Object>, links: Array<Object>}}
 */
export function processData(data, costBasedSizing, variables = {}) {
    // Shape detection: legacy CSV rows array vs new model { nodes, connections, variables }
    if (Array.isArray(data)) {
        // Legacy path (existing behavior)
        const cleanData = data.filter(row => row.Name && row.Name.trim() !== '')
            .map(row => {
                const cleaned = {};
                Object.keys(row).forEach(key => {
                    const value = row[key];
                    if (value === 'NaN' || value === '' || value === null || value === undefined) {
                        cleaned[key] = key.includes('Cost') ? null : '';
                    } else if (!isNaN(value) && value !== '' && typeof value !== 'string') {
                        cleaned[key] = parseFloat(value);
                    } else {
                        cleaned[key] = value.toString().trim();
                    }
                });

                const effectiveCost = cleaned["Effective Cost"] || cleaned["EffectiveCost"];
                const oCost = cleaned["Ø Cost"] || cleaned["Cost"];
                cleaned.costValue = effectiveCost !== null && effectiveCost !== undefined ? effectiveCost : oCost;
                return cleaned;
            });

        if (cleanData.length === 0) {
            return { nodes: [], links: [] };
        }

        const nodes = cleanData.map((row) => ({
            id: row.Name,
            size: calculateNodeSize(row.costValue, costBasedSizing),
            borderStyle: getBorderStyle(row.Execution),
            ...row
        }));

        const links = [];
        cleanData.forEach(row => {
            if (row.Incoming) {
                const incomingNodes = row.Incoming.split(',').map(s => s.trim()).filter(s => s);
                incomingNodes.forEach(source => {
                    if (cleanData.find(n => n.Name === source)) {
                        links.push({ source, target: row.Name, type: 'incoming' });
                    }
                });
            }
            for (let i = 1; i <= 5; i++) {
                const outgoingKey = `Outgoing${i}`;
                const varKey = `VarO${i}`;
                if (row[outgoingKey] && row[outgoingKey].trim()) {
                    const targetName = row[outgoingKey].trim();
                    const probability = row[varKey] || 1.0;
                    if (cleanData.find(n => n.Name === targetName)) {
                        links.push({
                            source: row.Name,
                            target: targetName,
                            type: 'outgoing',
                            probability: parseFloat(probability) || 1.0,
                            outgoingIndex: i
                        });
                    }
                }
            }
        });
        return { nodes, links };
    }

    // New model path: expect { nodes, connections, variables? }
    const tableNodes = data?.nodes || data?.elements || [];
    const tableConns = data?.connections || [];
    const vars = { ...(data?.variables || {}), ...variables };

    console.log('Processing data (flexible model):', {
        nodes: tableNodes.length ? tableNodes : 'empty',
        connections: tableConns.length ? tableConns : 'empty', 
        variables: vars
    });

    const nodes = tableNodes.map(n => {
        const name = n.name || n.id;
        const execution = n.execution || 'Manual';
        const cost = typeof n.cost === 'number' ? n.cost : resolveValue(n.cost, vars);
        const incomingVolume = typeof n.incomingVolume === 'number' ? n.incomingVolume : resolveValue(n.incomingVolume, vars);
        return {
            id: n.id,
            Name: name,
            Type: n.type || '',
            Platform: n.platform || '',
            Execution: execution,
            size: calculateNodeSize(cost, costBasedSizing),
            borderStyle: getBorderStyle(execution),
            x: typeof n.x === 'number' ? n.x : undefined,
            y: typeof n.y === 'number' ? n.y : undefined,
            incomingVolume: incomingVolume,
            // For compatibility with existing code paths
            costValue: cost,
            "Effective Cost": cost
        };
    });

    const links = tableConns.map(c => ({
        source: c.fromId,
        target: c.toId,
        type: 'outgoing', // Simplified: all connections are flow connections
        probability: c.probability !== undefined ? resolveValue(c.probability, vars) : 1.0
    }));

    console.log('🔗 Generated links:', links.length, 'from connections:', tableConns.length);
    console.log('📊 Generated nodes:', nodes.length, 'from elements:', tableNodes.length);

    return { nodes, links };
}

/**
 * Parses a CSV file.
 * @param {File} file - The CSV file to parse.
 * @returns {Promise<Array<Object>>} A promise that resolves with the parsed data.
 */
export function parseCSV(file) {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error('CSV parsing errors:', results.errors);
                    return reject(new Error('Error parsing CSV file'));
                }
                if (results.data.length === 0) {
                    return reject(new Error('CSV file appears to be empty'));
                }
                resolve(results.data);
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                reject(new Error('Error reading CSV file'));
            }
        });
    });
}

/**
 * Verifies the connections between nodes.
 * @param {Array<Object>} allNodes - All nodes in the graph.
 * @param {Array<Object>} allLinks - All links in the graph.
 * @returns {Object} A report of the connection verification.
 */
function verifyConnectionsLegacy(allNodes, allLinks) {
    const report = {
        totalNodes: allNodes.length,
        totalLinks: allLinks.length,
        brokenConnections: [],
        orphanedNodes: [],
        deadEndNodes: [],
        connectionSummary: {},
        validationErrors: []
    };

    console.log('🔍 Starting connection verification...');

    const nodeMap = new Map(allNodes.map(node => [node.Name, node]));

    allNodes.forEach(node => {
        const nodeConnections = {
            name: node.Name,
            incoming: [],
            outgoing: [],
            incomingCount: 0,
            outgoingCount: 0,
            brokenIncoming: [],
            brokenOutgoing: []
        };

        if (node.Incoming && node.Incoming.trim()) {
            const incomingNodes = node.Incoming.split(',').map(s => s.trim()).filter(Boolean);
            incomingNodes.forEach(incomingName => {
                if (nodeMap.has(incomingName)) {
                    nodeConnections.incoming.push(incomingName);
                    nodeConnections.incomingCount++;
                } else {
                    nodeConnections.brokenIncoming.push(incomingName);
                    report.brokenConnections.push({ from: incomingName, to: node.Name, error: `Incoming connection references non-existent node: "${incomingName}"` });
                }
            });
        }

        for (let i = 1; i <= 5; i++) {
            const outgoingKey = `Outgoing${i}`;
            const varKey = `VarO${i}`;
            if (node[outgoingKey] && node[outgoingKey].trim()) {
                const outgoingName = node[outgoingKey].trim();
                const probability = node[varKey] || 'N/A';
                if (nodeMap.has(outgoingName)) {
                    nodeConnections.outgoing.push({ name: outgoingName, probability });
                    nodeConnections.outgoingCount++;
                } else {
                    nodeConnections.brokenOutgoing.push({ name: outgoingName, probability });
                    report.brokenConnections.push({ from: node.Name, to: outgoingName, error: `Outgoing connection references non-existent node: "${outgoingName}"` });
                }
            }
        }

        if (nodeConnections.incomingCount === 0 && node.Name !== 'Indeed') {
            report.orphanedNodes.push({ name: node.Name, type: node.Type, issue: 'No incoming connections' });
        }

        if (nodeConnections.outgoingCount === 0) {
            report.deadEndNodes.push({ name: node.Name, type: node.Type, issue: 'No outgoing connections' });
        }

        report.connectionSummary[node.Name] = nodeConnections;
    });

    verifyBidirectionalConnections(report, nodeMap);
    generateConnectionStats(report);

    console.log('✅ Connection verification completed');
    console.log('📊 Verification Report:', report);
    return report;
}

/**
 * Verifies that connections are bidirectional.
 * If node A lists node B as an outgoing connection, this function checks
 * if node B also lists node A as an incoming connection.
 * @param {Object} report - The report object to be updated with validation errors.
 * @param {Map<string, Object>} nodeMap - A map of node names to node objects for quick lookup.
 * @private
 */
function verifyBidirectionalConnections(report, nodeMap) {
    console.log('🔗 Verifying bidirectional consistency...');
    Object.values(report.connectionSummary).forEach(nodeConn => {
        nodeConn.outgoing.forEach(outgoing => {
            const targetNode = nodeMap.get(outgoing.name);
            if (targetNode) {
                const targetIncoming = (targetNode.Incoming || '').split(',').map(s => s.trim());
                if (!targetIncoming.includes(nodeConn.name)) {
                    report.validationErrors.push({
                        type: 'Bidirectional Mismatch',
                        error: `"${nodeConn.name}" lists "${outgoing.name}" as outgoing, but "${outgoing.name}" doesn't list "${nodeConn.name}" as incoming`
                    });
                }
            }
        });
    });
}

/**
 * Generates aggregate statistics about the graph's connections.
 * Calculates metrics like average incoming/outgoing links, max links, etc.
 * @param {Object} report - The report object to which the stats will be added.
 * @private
 */
function generateConnectionStats(report) {
    const stats = {
        nodesWithIncoming: 0,
        nodesWithOutgoing: 0,
        nodesWithBoth: 0,
        averageIncoming: 0,
        averageOutgoing: 0,
        maxIncoming: 0,
        maxOutgoing: 0,
    };

    let totalIncoming = 0;
    let totalOutgoing = 0;

    Object.values(report.connectionSummary).forEach(conn => {
        if (conn.incomingCount > 0) stats.nodesWithIncoming++;
        if (conn.outgoingCount > 0) stats.nodesWithOutgoing++;
        if (conn.incomingCount > 0 && conn.outgoingCount > 0) stats.nodesWithBoth++;
        totalIncoming += conn.incomingCount;
        totalOutgoing += conn.outgoingCount;
        stats.maxIncoming = Math.max(stats.maxIncoming, conn.incomingCount);
        stats.maxOutgoing = Math.max(stats.maxOutgoing, conn.outgoingCount);
    });

    if (report.totalNodes > 0) {
        stats.averageIncoming = totalIncoming / report.totalNodes;
        stats.averageOutgoing = totalOutgoing / report.totalNodes;
    }

    report.statistics = stats;
}

/**
 * Enhanced verification for the new table model.
 * Checks probability sums (~1 per source), orphan nodes, and simple cycle detection.
 * @param {Array<Object>} nodes - [{ id, ... }]
 * @param {Array<Object>} connections - [{ fromId, toId, probability, ... }]
 * @param {Record<string, number>} variables
 * @returns {{ valid: boolean, errors: string[] }}
 */
function verifyConnectionsTables(nodes, connections, variables = {}) {
    const errors = [];
    const idSet = new Set(nodes.map(n => n.id));

    // Orphans and adjacency
    const incoming = new Map();
    const outgoing = new Map();
    const adj = new Map();
    nodes.forEach(n => { incoming.set(n.id, 0); outgoing.set(n.id, 0); adj.set(n.id, []); });

    connections.forEach(c => {
        if (!idSet.has(c.fromId)) errors.push(`Connection '${c.id || `${c.fromId}->${c.toId}`}' has unknown fromId '${c.fromId}'`);
        if (!idSet.has(c.toId)) errors.push(`Connection '${c.id || `${c.fromId}->${c.toId}`}' has unknown toId '${c.toId}'`);
        if (idSet.has(c.toId)) incoming.set(c.toId, (incoming.get(c.toId) || 0) + 1);
        if (idSet.has(c.fromId)) {
            outgoing.set(c.fromId, (outgoing.get(c.fromId) || 0) + 1);
            adj.get(c.fromId).push(c.toId);
        }
    });

    nodes.forEach(n => {
        if ((incoming.get(n.id) || 0) === 0) errors.push(`Orphan node: '${n.id}' has no incoming connections`);
        // Optionally flag dead-ends
        if ((outgoing.get(n.id) || 0) === 0) errors.push(`Dead-end node: '${n.id}' has no outgoing connections`);
    });

    // Probability sum check by fromId
    const bySource = new Map();
    connections.forEach(c => {
        const list = bySource.get(c.fromId) || [];
        list.push(c);
        bySource.set(c.fromId, list);
    });
    bySource.forEach((conns, fromId) => {
        const sum = conns.reduce((acc, cc) => acc + resolveValue(cc.probability, variables), 0);
        if (conns.length > 0 && Math.abs(sum - 1) > 0.01) {
            errors.push(`Probabilities from '${fromId}' sum to ${sum.toFixed(3)} (expected ~1)`);
        }
    });

    // Simple cycle detection (DFS)
    const visited = new Set();
    const stack = new Set();
    const hasCycleFrom = (u) => {
        if (stack.has(u)) return true;
        if (visited.has(u)) return false;
        visited.add(u);
        stack.add(u);
        for (const v of (adj.get(u) || [])) {
            if (hasCycleFrom(v)) return true;
        }
        stack.delete(u);
        return false;
    };
    for (const n of nodes) {
        if (hasCycleFrom(n.id)) { errors.push('Cycle detected in graph'); break; }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Backward-compatible exported verifier that supports both legacy and new models.
 */
export function verifyConnections(nodesOrAllNodes, connectionsOrAllLinks, variables) {
    // Legacy heuristic: presence of 'Name' field indicates old model
    if (Array.isArray(nodesOrAllNodes) && nodesOrAllNodes[0] && 'Name' in nodesOrAllNodes[0]) {
        return verifyConnectionsLegacy(nodesOrAllNodes, connectionsOrAllLinks);
    }
    return verifyConnectionsTables(nodesOrAllNodes || [], connectionsOrAllLinks || [], variables || {});
}

/**
 * Import structured data from JSON string
 */
export function importFromJson(json) {
    try {
    const obj = JSON.parse(json);
    const nodes = Array.isArray(obj.nodes) ? obj.nodes : [];
    const connections = Array.isArray(obj.connections) ? obj.connections : [];
    const variables = (obj && typeof obj.variables === 'object' && obj.variables !== null) ? obj.variables : {};
    return { nodes, connections, variables };
    } catch (e) {
        return { nodes: [], connections: [], variables: {} };
    }
}

/**
 * Export structured data to a JSON string (pretty-printed)
 */
export function exportToJson(data) {
    return JSON.stringify(data, null, 2);
}

/**
 * Import nodes and connections from CSV strings.
 * Variables are handled separately.
 */
export function importFromCsv(nodesCsv, connectionsCsv) {
    const parse = (csv) => Papa.parse(csv, { header: true, skipEmptyLines: true }).data;
    const rawNodes = parse(nodesCsv) || [];
    const rawConns = parse(connectionsCsv) || [];
    const nodes = rawNodes.map(n => ({
        id: n.id || n.ID || n.Id,
        name: n.name || n.Name || n.id,
        type: n.type || n.Type || '',
        platform: n.platform || n.Platform || '',
        cost: typeof n.cost === 'number' ? n.cost : parseFloat(n.cost || n.Cost || 0) || 0,
        volumeIn: typeof n.volumeIn === 'number' ? n.volumeIn : parseFloat(n.volumeIn || n.VolumeIn || 0) || 0,
        description: n.description || n.Description || '',
        x: typeof n.x === 'number' ? n.x : parseFloat(n.x || 0) || 0,
        y: typeof n.y === 'number' ? n.y : parseFloat(n.y || 0) || 0
    })).filter(n => n.id);
    const connections = rawConns.map(c => {
        const fromId = c.fromId || c.FromId || c.Source || '';
        const toId = c.toId || c.ToId || c.Target || '';
        return {
            id: `${fromId}->${toId}`, // Auto-generate ID
            fromId,
            toId
        };
    }).filter(c => c.fromId && c.toId);
    return { nodes, connections };
}

/**
 * Export nodes and connections as CSV strings. Includes a resolved probability column.
 */
export function exportToCsv(data) {
    const vars = data.variables || {};
    const nodesCsv = Papa.unparse((data.nodes || []).map(n => ({
        id: n.id, name: n.name, type: n.type, platform: n.platform,
        cost: n.cost, volumeIn: n.volumeIn, description: n.description, x: n.x, y: n.y
    })));
    const connectionsCsv = Papa.unparse((data.connections || []).map(c => ({
        id: c.id, fromId: c.fromId, toId: c.toId
    })));
    return { nodesCsv, connectionsCsv };
}

/**
 * Compute derived fields using flow-based volume calculation.
 * Source nodes start with their initial volumes (resolved from variables).
 * Downstream nodes receive calculated volumes based on incoming flows.
 * Multiple inputs to a node are summed up.
 * @param {Array<{id: string, incomingVolume?: number|string, nodeMultiplier?: number|string}>} nodes
 * @param {Array<{fromId: string, toId: string, probability?: number|string}>} connections
 * @param {Record<string, number>} variables
 */
export function computeDerivedFields(nodes, connections, variables = {}) {
    if (!nodes || !connections) return nodes;

    // Step 1: Build connection map and resolve all variables
    const connectionMap = new Map(); // fromId -> [{toId, probability}]
    const incomingMap = new Map();   // toId -> [{fromId, probability}]
    
    connections.forEach(conn => {
        // Default to probability = 1 if not specified (simplified connections)
        const probability = conn.probability !== undefined ? resolveValue(conn.probability, variables) : 1.0;
        
        // Build outgoing map
        if (!connectionMap.has(conn.fromId)) {
            connectionMap.set(conn.fromId, []);
        }
        connectionMap.get(conn.fromId).push({
            toId: conn.toId,
            probability: probability
        });
        
        // Build incoming map
        if (!incomingMap.has(conn.toId)) {
            incomingMap.set(conn.toId, []);
        }
        incomingMap.get(conn.toId).push({
            fromId: conn.fromId,
            probability: probability
        });
    });

    // Step 2: Identify source nodes (nodes with initial volumes but no incoming connections)
    const nodeVolumes = new Map();
    const sourceNodes = [];
    
    nodes.forEach(node => {
        const hasIncoming = incomingMap.has(node.id);
        const hasInitialVolume = node.incomingVolume !== undefined && node.incomingVolume !== null && node.incomingVolume !== 0;
        
        if (hasInitialVolume && !hasIncoming) {
            // Source node - resolve initial volume from variables
            const initialVolume = resolveValue(node.incomingVolume, variables);
            const nodeMultiplier = node.nodeMultiplier ? resolveValue(node.nodeMultiplier, variables) : 1;
            const finalVolume = initialVolume * nodeMultiplier;
            
            nodeVolumes.set(node.id, finalVolume);
            sourceNodes.push(node.id);
            
            console.log(`📊 Source node ${node.id}: ${node.incomingVolume} × ${nodeMultiplier} = ${finalVolume}`);
        } else {
            nodeVolumes.set(node.id, 0); // Will be calculated
        }
    });

    // Step 3: Topological sort to calculate volumes in correct order
    const visited = new Set();
    const calculating = new Set();
    
    function calculateNodeVolume(nodeId) {
        if (visited.has(nodeId)) {
            return nodeVolumes.get(nodeId);
        }
        
        if (calculating.has(nodeId)) {
            console.warn(`🔄 Cycle detected involving node ${nodeId}`);
            return nodeVolumes.get(nodeId) || 0;
        }
        
        calculating.add(nodeId);
        
        // If it's a source node, volume is already set
        if (sourceNodes.includes(nodeId)) {
            visited.add(nodeId);
            calculating.delete(nodeId);
            return nodeVolumes.get(nodeId);
        }
        
        // Calculate volume from incoming connections
        let totalIncomingVolume = 0;
        const incomingConnections = incomingMap.get(nodeId) || [];
        
        incomingConnections.forEach(incoming => {
            const fromVolume = calculateNodeVolume(incoming.fromId);
            const flowVolume = fromVolume * incoming.probability;
            totalIncomingVolume += flowVolume;
            
            console.log(`📈 Flow: ${incoming.fromId}(${fromVolume}) → ${nodeId}: ${fromVolume} × ${incoming.probability} = ${flowVolume}`);
        });
        
        // Apply node multiplier if it exists
        const node = nodes.find(n => n.id === nodeId);
        const nodeMultiplier = node?.nodeMultiplier ? resolveValue(node.nodeMultiplier, variables) : 1;
        const finalVolume = totalIncomingVolume * nodeMultiplier;
        
        nodeVolumes.set(nodeId, finalVolume);
        visited.add(nodeId);
        calculating.delete(nodeId);
        
        console.log(`✅ Node ${nodeId}: incoming ${totalIncomingVolume} × multiplier ${nodeMultiplier} = ${finalVolume}`);
        
        return finalVolume;
    }

    // Step 4: Calculate volumes for all nodes
    nodes.forEach(node => {
        calculateNodeVolume(node.id);
    });

    // Step 5: Update nodes with calculated volumes
    nodes.forEach(node => {
        const calculatedVolume = nodeVolumes.get(node.id) || 0;
        node.computedVolumeIn = calculatedVolume;
        
        // Also update incomingVolume if it was calculated (for display purposes)
        if (!sourceNodes.includes(node.id)) {
            node.incomingVolume = calculatedVolume;
        }
    });

    console.log('📊 Final volumes:', Object.fromEntries(nodeVolumes));
    return nodes;
}