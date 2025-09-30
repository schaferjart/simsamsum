import * as d3 from 'd3';

/**
 * Applies the selected layout to the graph.
 * @param {string} layoutType - The type of layout to apply.
 * @param {object} state - The current state of the visualization.
 * @returns {d3.Simulation} The configured D3 simulation, or null if no simulation is used.
 */
export function applyLayout(layoutType, state) {
    console.log(`🎨 Applying layout: ${layoutType}`);
    const { nodes, links, width, height } = state;

    if (state.simulation) {
        state.simulation.stop();
    }

    switch (layoutType) {
        case 'force':
            // Ensure links reference node objects
            linkify(links, nodes);
            return applyForceLayout(nodes, links, width, height);
        case 'hierarchical':
            linkify(links, nodes);
            return applyHierarchicalLayout(nodes, links, width, height);
        case 'hierarchical-orthogonal':
            linkify(links, nodes);
            applyHierarchicalOrthogonalLayout(nodes, links, width, height);
            return null; // No simulation
        case 'circular':
            linkify(links, nodes);
            return applyCircularLayout(nodes, width, height);
        case 'grid':
            linkify(links, nodes);
            return applyGridLayout(nodes, width, height);
        case 'manual-grid':
            linkify(links, nodes);
            applyManualGridLayout(nodes, state.gridSize);
            return null; // No simulation
        default:
            linkify(links, nodes);
            return applyForceLayout(nodes, links, width, height);
    }
}

function linkify(links, nodes) {
    const byId = new Map(nodes.map(n => [n.id, n]));
    for (let i = 0; i < links.length; i++) {
        const l = links[i];
        if (!l) continue;
        if (!l.source || typeof l.source !== 'object') {
            l.source = byId.get(l.source);
        }
        if (!l.target || typeof l.target !== 'object') {
            l.target = byId.get(l.target);
        }
    }
}

/**
 * Applies a force-directed layout.
 * This is the default layout, simulating physical forces between nodes.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {Array<Object>} links - The array of links.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} The configured D3 simulation.
 * @private
 */
function applyForceLayout(nodes, links, width, height) {
    const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150).strength(0.8))
        .force('charge', d3.forceManyBody().strength(-600))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.size + 10));
    simulation.alpha(1).restart();
    return simulation;
}

/**
 * Applies a basic hierarchical layout.
 * Nodes are arranged in levels based on their connectivity from root nodes.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {Array<Object>} links - The array of links.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} A simulation for collision detection.
 * @private
 */
function applyHierarchicalLayout(nodes, links, width, height) {
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
 * This layout attempts to minimize edge crossings and arrange nodes in a clean, top-down structure.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {Array<Object>} links - The array of links.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @private
 */
function applyHierarchicalOrthogonalLayout(nodes, links, width, height) {
    console.log('🎯 Starting advanced hierarchical orthogonal layout...');
    const hierarchy = buildAdvancedHierarchy(nodes, links);
    positionNodesInHierarchy(hierarchy, width, height, nodes, links);
    minimizeEdgeCrossings(hierarchy, width, nodes, links);
    applyHierarchicalPositions(nodes);
    console.log('✅ Hierarchical orthogonal layout complete');
}

/**
 * Applies a circular layout.
 * Nodes are arranged in a circle around the center of the visualization area.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} A simulation for collision detection.
 * @private
 */
function applyCircularLayout(nodes, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 3;

    nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length;
        node.fx = centerX + radius * Math.cos(angle);
        node.fy = centerY + radius * Math.sin(angle);
    });

    return d3.forceSimulation(nodes)
        .force('collision', d3.forceCollide().radius(d => d.size + 10))
        .alpha(0.3);
}

/**
 * Applies a grid layout.
 * Nodes are arranged in a simple grid.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {number} width - The width of the visualization area.
 * @param {number} height - The height of the visualization area.
 * @returns {d3.Simulation} A simulation for collision detection.
 * @private
 */
function applyGridLayout(nodes, width, height) {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const rows = Math.ceil(nodes.length / cols);
    const padding = 50;
    const cellWidth = (width - padding * 2) / Math.max(1, cols);
    const cellHeight = (height - padding * 2) / Math.max(1, rows);

    nodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
    node.fx = padding + cellWidth * (col + 0.5);
    node.fy = padding + cellHeight * (row + 0.5);
    });

    return d3.forceSimulation(nodes)
        .force('collision', d3.forceCollide().radius(d => d.size + 10))
        .alpha(0.3);
}

/**
 * Applies a manual grid layout.
 * This layout allows users to drag and drop nodes, which then snap to a grid.
 * It initializes node positions if they aren't already set.
 * @param {Array<Object>} nodes - The array of nodes.
 * @param {number} gridSize - The size of the grid for snapping.
 * @private
 */
function applyManualGridLayout(nodes, gridSize) {
    console.log('🎯 Applying manual grid layout...');
    // Initial placement if no position is set
    if (nodes.some(n => n.x === undefined || n.y === undefined)) {
        initializeManualLayout(nodes, gridSize);
    }
    nodes.forEach(node => {
        node.fx = node.x;
        node.fy = node.y;
    });
}

/**
 * Initializes the positions of nodes for the manual grid layout.
 * This is called when switching to manual layout if nodes don't have prior positions.
 * @param {Array<Object>} nodes - The array of nodes to position.
 * @param {number} gridSize - The grid size to determine spacing.
 * @private
 */
function initializeManualLayout(nodes, gridSize) {
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const spacing = gridSize * 4;
    const startX = 100;
    const startY = 100;

    nodes.forEach((node, i) => {
    if (typeof node.x === 'number' && typeof node.y === 'number') return; // keep existing
    const col = i % cols;
    const row = Math.floor(i / cols);
    node.x = startX + col * spacing;
    node.y = startY + row * spacing;
        node.fx = node.x;
        node.fy = node.y;
    });
}

// --- Helper functions for Hierarchical Layout ---

/**
 * Calculates the level of each node in the hierarchy (distance from a root node).
 * This is used for the basic hierarchical layout.
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
 * It determines levels, groupings, and connections for more complex arrangements.
 * @param {Array<Object>} nodes - The array of all nodes.
 * @param {Array<Object>} links - The array of all links.
 * @returns {Object} A hierarchy object containing levels, nodes by level, and connection data.
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
 * It iterates through each level and distributes nodes horizontally.
 * @param {Object} hierarchy - The hierarchy object from buildAdvancedHierarchy.
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
 * It sorts nodes based on their parent's position to reduce crossovers and then spaces them out.
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
 * This is used as a heuristic to sort nodes at the same level to minimize link crossings.
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
 * This function iterates through each level of the hierarchy and re-orders the nodes
 * based on the average position (barycenter) of their parents in the level above.
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
 * It sets the `fx` and `fy` properties to fix the node positions,
 * effectively overriding the simulation's positioning forces.
 * @param {Array<Object>} nodes - The array of nodes with x and y properties already calculated.
 * @private
 */
function applyHierarchicalPositions(nodes) {
    nodes.forEach(node => {
        node.fx = node.x;
        node.fy = node.y;
    });
}