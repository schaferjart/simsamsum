/**
 * @module layouts/hierarchical-layout
 * This module contains logic for applying hierarchical layouts, including a simple
 * version and a more advanced version with orthogonal edge routing.
 */
import * as d3 from 'd3';

// --- Helper functions for Hierarchical Layout ---

/**
 * Calculates the level of each node in the hierarchy (distance from a root node).
 * @param {Array<Object>} nodes - The array of all nodes.
 * @param {Array<Object>} links - The array of all links.
 * @returns {Object.<string, number>} An object mapping node ID to its level.
 * @private
 */
function calculateNodeLevels(nodes, links) {
    const levels = {};
    const visited = new Set();
    const rootNodes = nodes.filter(node => !links.some(link => (link.target.id || link.target) === node.id));

    if (rootNodes.length === 0 && nodes.length > 0) {
        rootNodes.push(nodes[0]);
    }

    const queue = rootNodes.map(node => ({ node, level: 0 }));

    while (queue.length > 0) {
        const { node, level } = queue.shift();
        if (visited.has(node.id)) continue;
        visited.add(node.id);
        levels[node.id] = level;

        links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            if (sourceId === node.id && !visited.has(targetId)) {
                const targetNode = nodes.find(n => n.id === targetId);
                if (targetNode) {
                    queue.push({ node: targetNode, level: level + 1 });
                }
            }
        });
    }
    return levels;
}

/**
 * Builds a more detailed hierarchical structure for the orthogonal layout.
 * @param {Array<Object>} nodes - The array of all nodes.
 * @param {Array<Object>} links - The array of all links.
 * @returns {Object} A hierarchy object.
 * @private
 */
function buildAdvancedHierarchy(nodes, links) {
    const hierarchy = { levels: {}, nodesByLevel: {}, maxLevel: 0, connections: new Map() };
    links.forEach(link => {
        const sourceId = link.source.id || link.source;
        const targetId = link.target.id || link.target;
        if (!hierarchy.connections.has(sourceId)) {
            hierarchy.connections.set(sourceId, []);
        }
        hierarchy.connections.get(sourceId).push({ target: targetId, probability: link.probability || 1.0 });
    });

    const rootNodes = nodes.filter(node => !links.some(link => (link.target.id || link.target) === node.id));
    const queue = rootNodes.map(node => ({ node, level: 0, branch: 0 }));
    const processed = new Set();

    while (queue.length > 0) {
        const { node, level } = queue.shift();
        if (processed.has(node.id)) continue;
        processed.add(node.id);
        hierarchy.levels[node.id] = level;
        if (!hierarchy.nodesByLevel[level]) hierarchy.nodesByLevel[level] = [];
        hierarchy.nodesByLevel[level].push({ node });
        hierarchy.maxLevel = Math.max(hierarchy.maxLevel, level);

        const connections = hierarchy.connections.get(node.id) || [];
        connections.forEach((conn) => {
            const targetNode = nodes.find(n => n.id === conn.target);
            if (targetNode && !processed.has(conn.target)) {
                queue.push({ node: targetNode, level: level + 1 });
            }
        });
    }
    return hierarchy;
}

/**
 * Positions nodes based on the calculated hierarchy.
 * @param {Object} hierarchy - The hierarchy object.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @param {Array<Object>} nodes - The array of all nodes.
 * @param {Array<Object>} links - The array of all links.
 * @private
 */
function positionNodesInHierarchy(hierarchy, width, height, nodes, links) {
    const spacing = { vertical: 200, horizontal: 300 };
    const topPadding = 80;

    Object.keys(hierarchy.nodesByLevel).forEach(levelStr => {
        const level = parseInt(levelStr);
        const levelNodes = hierarchy.nodesByLevel[level];
        const y = topPadding + level * spacing.vertical;

        if (levelNodes.length === 1) {
            levelNodes[0].node.fx = width / 2;
            levelNodes[0].node.fy = y;
        } else {
            distributeNodesAtLevel(levelNodes, y, spacing, hierarchy, level, width, nodes, links);
        }
    });
}

/**
 * Distributes nodes horizontally at a specific level of the hierarchy.
 * @param {Array<Object>} levelNodes - The nodes at the current level.
 * @param {number} y - The y-coordinate for this level.
 * @param {Object} spacing - The spacing configuration.
 * @param {Object} hierarchy - The main hierarchy object.
 * @param {number} level - The current level number.
 * @param {number} width - The width of the visualization area.
 * @param {Array<Object>} nodes - The array of all nodes.
 * @param {Array<Object>} links - The array of all links.
 * @private
 */
function distributeNodesAtLevel(levelNodes, y, spacing, hierarchy, level, width, nodes, links) {
    if (level > 0) {
        levelNodes.sort((a, b) => getParentAverageX(a.node, nodes, links) - getParentAverageX(b.node, nodes, links));
    }

    const maxNodes = Math.max(...Object.values(hierarchy.nodesByLevel).map(n => n.length));
    const adaptiveSpacing = Math.min(spacing.horizontal, (width - 200) / maxNodes);
    const finalSpacing = Math.max(150, adaptiveSpacing);
    const totalWidth = (levelNodes.length - 1) * finalSpacing;
    const startX = Math.max(100, (width - totalWidth) / 2);

    levelNodes.forEach(({ node }, index) => {
        node.fx = startX + (index * finalSpacing);
        node.fy = y;
        node.x = node.fx;
        node.y = node.fy;
    });
}

/**
 * Calculates the average x-position of a node's parent nodes.
 * @param {Object} node - The node whose parents' average x-position is to be calculated.
 * @param {Array<Object>} allNodes - The array of all nodes in the graph.
 * @param {Array<Object>} allLinks - The array of all links in the graph.
 * @returns {number} The average x-position of the parent nodes.
 * @private
 */
function getParentAverageX(node, allNodes, allLinks) {
    const parents = allLinks
        .filter(link => (link.target.id || link.target) === node.id)
        .map(link => allNodes.find(n => n.id === (link.source.id || link.source)))
        .filter(parent => parent && parent.x !== undefined);
    if (parents.length === 0) return 0;
    return parents.reduce((sum, p) => sum + p.x, 0) / parents.length;
}


/**
 * Attempts to minimize edge crossings using the barycenter method.
 * @param {Object} hierarchy - The hierarchy object.
 * @param {number} width - The width of the visualization area.
 * @param {Array<Object>} nodes - The array of all nodes.
 * @param {Array<Object>} links - The array of all links.
 * @private
 */
function minimizeEdgeCrossings(hierarchy, width, nodes, links) {
    for (let level = 1; level <= hierarchy.maxLevel; level++) {
        const levelNodes = hierarchy.nodesByLevel[level];
        if (!levelNodes || levelNodes.length <= 1) continue;

        levelNodes.forEach(({ node }) => {
            const parents = links.filter(link => (link.target.id || link.target) === node.id)
                .map(link => nodes.find(n => n.id === (link.source.id || link.source)))
                .filter(Boolean);
            node.barycenter = parents.length > 0 ? d3.mean(parents, p => p.x) : node.x;
        });

        levelNodes.sort((a, b) => a.node.barycenter - b.node.barycenter);

        const spacing = 300;
        const totalWidth = (levelNodes.length - 1) * spacing;
        const startX = Math.max(100, (width - totalWidth) / 2);
        levelNodes.forEach(({ node }, index) => {
            node.fx = startX + (index * spacing);
            node.x = node.fx;
        });
    }
}

/**
 * Applies the calculated hierarchical positions to the nodes.
 * @param {Array<Object>} nodes - The array of nodes with x and y properties already calculated.
 * @private
 */
function applyHierarchicalPositions(nodes) {
    nodes.forEach(node => {
        node.fx = node.x;
        node.fy = node.y;
    });
}


/**
 * Applies a basic hierarchical layout.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {Array<Object>} links - The array of links.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} A simulation for collision detection.
 */
export function applyHierarchicalLayout(nodes, links, width, height) {
    const levels = calculateNodeLevels(nodes, links);
    const maxLevel = Math.max(...Object.values(levels));

    const gridPadding = 150;
    const gridCellSize = 200;
    const collisionPadding = 40;

    const availableWidth = width - (gridPadding * 2);
    const availableHeight = height - (gridPadding * 2);

    const levelCounts = {};
    Object.values(levels).forEach(level => {
        levelCounts[level] = (levelCounts[level] || 0) + 1;
    });

    const effectiveGridSize = Math.min(
        availableWidth / Math.max(...Object.values(levelCounts)),
        availableHeight / (maxLevel + 1)
    );

    const finalGridSize = Math.max(gridCellSize, effectiveGridSize);

    const levelPositions = {};
    nodes.forEach(node => {
        const level = levels[node.id] || 0;
        levelPositions[level] = (levelPositions[level] || 0) + 1;
        const levelWidth = levelCounts[level] * finalGridSize;
        const levelStartX = (width - levelWidth) / 2;
        node.fx = levelStartX + (levelPositions[level] - 0.5) * finalGridSize;
        node.fy = gridPadding + level * finalGridSize;
    });

    return d3.forceSimulation(nodes)
        .force('collision', d3.forceCollide().radius(d => d.size + collisionPadding))
        .alpha(0.3);
}

/**
 * Applies an advanced hierarchical layout with orthogonal links.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {Array<Object>} links - The array of links.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 */
export function applyHierarchicalOrthogonalLayout(nodes, links, width, height) {
    console.log('🎯 Starting advanced hierarchical orthogonal layout...');
    const hierarchy = buildAdvancedHierarchy(nodes, links);
    positionNodesInHierarchy(hierarchy, width, height, nodes, links);
    minimizeEdgeCrossings(hierarchy, width, nodes, links);
    applyHierarchicalPositions(nodes);
    console.log('✅ Hierarchical orthogonal layout complete');
}