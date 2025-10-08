/**
 * @module data/data-processor
 * This module handles processing raw data into a structured format of nodes and links,
 * and computing derived fields based on data flow.
 */

import { getBorderStyle } from '../utils.js';
import { resolveValue } from './variable-resolver.js';

/**
 * Processes raw data from various formats into a standardized structure of nodes and links.
 * It supports both a legacy array-based format and a new structured format with nodes, connections, and variables.
 * @param {Array<Object>|Object} data - The raw data, which can be an array of records or an object with `nodes`, `connections`, and `variables`.
 * @param {Object} sizingConfig - Configuration for node sizing, e.g., `{ baseSize: 40 }`.
 * @param {Object} variables - A key-value map of variables to be used in value resolution.
 * @returns {{nodes: Array<Object>, links: Array<Object>}} An object containing arrays of processed nodes and links.
 */
export function processData(data, sizingConfig = {}, variables = {}) {
    const baseSize = sizingConfig?.baseSize ?? 40;
    // Shape detection: legacy flat array vs new model { nodes, connections, variables }
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
            size: baseSize,
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
        // 1. Normalize identifiers for backward compatibility
        const id = n.id || n.Id;
        const name = n.name || n.Name || id;

        // 2. Normalize core attributes, falling back from new to old format
        const type = n.type || n.Type || '';
        const execution = n.execution || n.Execution || 'Manual';
        const platform = n.platform || n.Platform || '';
        const description = n.description || n.Description || '';

        // 3. Resolve cost from multiple possible fields, then resolve variables
        const effectiveCostRaw = n.effectiveCost !== undefined ? n.effectiveCost : (n['Effective Cost'] !== undefined ? n['Effective Cost'] : 0);
        const avgCostRaw = n.avgCost !== undefined ? n.avgCost : (n.AvgCost !== undefined ? n.AvgCost : (n['Ø Cost'] !== undefined ? n['Ø Cost'] : (n.cost !== undefined ? n.cost : 0)));
        const costRaw = effectiveCostRaw !== undefined ? effectiveCostRaw : avgCostRaw;
        const resolvedCost = resolveValue(costRaw, vars);

        // 4. Resolve incoming volume from multiple possible fields, then resolve variables
        const incomingVolumeRaw = n.incomingNumber !== undefined ? n.incomingNumber : (n['Incoming Number'] !== undefined ? n['Incoming Number'] : (n.incomingVolume !== undefined ? n.incomingVolume : 0));
        const resolvedIncomingVolume = resolveValue(incomingVolumeRaw, vars);

        // 5. Build the final node object explicitly, mapping all new fields and maintaining existing conventions
        const finalNode = {
            // Core IDs and names
            id: id,
            Name: name, // Keep PascalCase for consistency with existing app code

            // Core visual properties
            Type: type,
            Execution: execution,
            Platform: platform,
            Description: description,

            // New properties from the new format
            SubType: n.subType || n.SubType,
            AOR: n.aOR || n.AOR,
            Account: n.account || n.Account,
            Monitoring: n.monitoring || n.Monitoring,
            MonitoredData: n.monitoredData || n['Monitored Data'],
            AvgCostTime: n.avgCostTime || n.AvgCostTime,
            AvgCost: n.avgCost || n.AvgCost,
            LastUpdate: n.lastUpdate || n.LastUpdate,
            NextUpdate: n.nextUpdate || n.NextUpdate,
            KPI: n.kPI || n.KPI,
            Variable: n.variable || n.Variable || 1.0,
            IncomingNumber: n.incomingNumber || n.IncomingNumber || '',
            ScheduleStart: n.scheduleStart || n.ScheduleStart || '',
            ScheduleEnd: n.scheduleEnd || n.ScheduleEnd || '',
            Frequency: n.frequency || n.Frequency || '',

            // Properties for d3 and rendering logic
            size: baseSize,
            borderStyle: getBorderStyle(execution),
            x: typeof n.x === 'number' ? n.x : undefined,
            y: typeof n.y === 'number' ? n.y : undefined,

            // Resolved values for data processing and display
            incomingVolume: resolvedIncomingVolume,
            costValue: resolvedCost,
            "Effective Cost": resolvedCost // Keep this for backward compatibility in UI/tables
        };
        return finalNode;
    });

    const links = tableConns.map(c => {
        // Normalize source and target IDs for backward compatibility
        const source = c.source || c.fromId || c.FromId || c.Source;
        const target = c.target || c.toId || c.ToId || c.Target;

        return {
            source: source,
            target: target,
            type: 'outgoing', // Simplified: all connections are flow connections
            probability: c.probability !== undefined ? resolveValue(c.probability, vars) : 1.0
        };
    }).filter(c => c.source && c.target); // Filter out links with missing source or target

    console.log('🔗 Generated links:', links.length, 'from connections:', tableConns.length);
    console.log('📊 Generated nodes:', nodes.length, 'from elements:', tableNodes.length);

    return { nodes, links };
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
        const hasInitialVolume = node.incomingVolume !== undefined &&
                                node.incomingVolume !== null &&
                                node.incomingVolume !== 0 &&
                                node.incomingVolume !== '';

        if (hasInitialVolume) {
            // Source node - resolve initial volume from variables
            const initialVolume = resolveValue(node.incomingVolume, variables);
            const nodeMultiplier = node.nodeMultiplier ? resolveValue(node.nodeMultiplier, variables) : 1;
            const finalVolume = initialVolume * nodeMultiplier;

            nodeVolumes.set(node.id, finalVolume);
            if (!hasIncoming) {
                sourceNodes.push(node.id);
            }

            console.log(`📊 ${hasIncoming ? 'Node with initial volume' : 'Source node'} ${node.id}: ${node.incomingVolume} × ${nodeMultiplier} = ${finalVolume}`);
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