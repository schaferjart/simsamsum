import Papa from 'papaparse';
import { calculateNodeSize, getBorderStyle } from './utils.js';

/**
 * Processes raw data from CSV into nodes and links.
 * @param {Array<Object>} data - The raw data from PapaParse.
 * @param {boolean} costBasedSizing - Whether to use cost-based sizing.
 * @returns {{nodes: Array<Object>, links: Array<Object>}}
 */
export function processData(data, costBasedSizing) {
    console.log('Processing data:', data);

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

    console.log('Cleaned data:', cleanData);

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
                    links.push({
                        source: source,
                        target: row.Name,
                        type: 'incoming'
                    });
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

    console.log('Nodes:', nodes);
    console.log('Links:', links);
    return { nodes, links };
}

/**
 * Parses a CSV file.
 * @param {File} file - The CSV file to parse.
 * @returns {Promise<Array<Object>>} A promise that resolves with the parsed data.
 */
export function processJsonData(data, costBasedSizing) {
    console.log('Processing JSON data:', data);

    if (!data.nodes || data.nodes.length === 0) {
        return { nodes: [], links: [] };
    }

    const nodes = data.nodes.map(node => ({
        ...node,
        id: node.id || node.name,
        size: calculateNodeSize(node.effectiveCost, costBasedSizing),
        borderStyle: getBorderStyle(node.execution)
    }));

    const links = data.connections.map(link => ({
        ...link,
        source: link.fromId,
        target: link.toId,
        type: 'outgoing'
    }));

    console.log('Processed Nodes:', nodes);
    console.log('Processed Links:', links);
    return { nodes, links };
}

export function loadAndProcessData(file, costBasedSizing) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(new Error('No file provided'));
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const fileContent = event.target.result;
                let data;
                if (file.name.toLowerCase().endsWith('.json')) {
                    data = JSON.parse(fileContent);
                    resolve(processJsonData(data, costBasedSizing));
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    // CSV processing logic remains unchanged
                    Papa.parse(fileContent, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            if (results.errors.length) {
                                reject(new Error('Error parsing CSV'));
                            } else {
                                resolve(processData(results.data, costBasedSizing));
                            }
                        }
                    });
                } else {
                    reject(new Error('Unsupported file type'));
                }
            } catch (error) {
                reject(new Error('Error processing file'));
            }
        };
        reader.onerror = (error) => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

/**
 * Verifies the connections between nodes.
 * @param {Array<Object>} allNodes - All nodes in the graph.
 * @param {Array<Object>} allLinks - All links in the graph.
 * @returns {Object} A report of the connection verification.
 */
export function verifyConnections(allNodes, allLinks) {
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