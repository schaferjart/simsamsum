/**
 * @module data/validators
 * This module provides functions to validate the integrity of the graph data,
 * checking for issues like broken connections, orphaned nodes, and cycles.
 */
import { resolveValue } from './variable-resolver.js';

/**
 * Verifies connections for the legacy data model.
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
 * Verifies that connections are bidirectional in the legacy model.
 * @param {Object} report - The report object to be updated.
 * @param {Map<string, Object>} nodeMap - A map of node names to node objects.
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
 * Generates aggregate statistics about the graph's connections for the legacy model.
 * @param {Object} report - The report object to which the stats will be added.
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
 * Verifies connections for the new table-based data model.
 * @param {Array<Object>} nodes - Array of node objects.
 * @param {Array<Object>} connections - Array of connection objects.
 * @param {Record<string, number>} variables - Context for resolving variable values.
 * @returns {{ valid: boolean, errors: string[] }} Validation result.
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
 * Main exported verifier that handles both legacy and new data models.
 * It inspects the data shape to decide which validation logic to apply.
 * @param {Array<Object>} nodesOrAllNodes - Array of nodes.
 * @param {Array<Object>} connectionsOrAllLinks - Array of connections/links.
 * @param {Record<string, number>} variables - Context for resolving variable values.
 * @returns {Object|{valid: boolean, errors: string[]}} Validation report.
 */
export function verifyConnections(nodesOrAllNodes, connectionsOrAllLinks, variables) {
    // Legacy heuristic: presence of 'Name' field indicates old model
    if (Array.isArray(nodesOrAllNodes) && nodesOrAllNodes[0] && 'Name' in nodesOrAllNodes[0]) {
        return verifyConnectionsLegacy(nodesOrAllNodes, connectionsOrAllLinks);
    }
    return verifyConnectionsTables(nodesOrAllNodes || [], connectionsOrAllLinks || [], variables || {});
}