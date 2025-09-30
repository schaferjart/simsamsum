import * as d3 from 'd3';
import { showStatus, calculateNodeSize, downloadJsonFile, snapToGrid } from './utils.js';
import { processData, parseCSV, verifyConnections, computeDerivedFields as computeDerivedFieldsData } from './data.js';
import { initVisualization, renderVisualizationElements, updatePositions, highlightNode, clearHighlight, updateTextRotation, updateGridDisplay } from './render.js';
import { applyLayout } from './layouts.js';
import * as interactions from './interactions.js';
import * as layoutManager from './layoutManager.js';
import * as ui from './ui.js';
import { exportToPDF } from './export.js';
import { initFileManager, saveToFiles, loadFromFile } from './fileManager.js';
import { SelectionManager } from './selection.js';

/**
 * Main class for the Workflow Visualizer application.
 * Manages the application state, data, and interactions.
 */
class WorkflowVisualizer {
    /**
     * Initializes the application state and kicks off the initialization process.
     */
    constructor() {
        /**
         * The central state object for the application.
         * @type {object}
         * @property {number} width - The width of the SVG container.
         * @property {number} height - The height of the SVG container.
         * @property {d3.Selection} svg - The main SVG element.
         * @property {d3.Selection} zoomGroup - The group element that zoom is applied to.
         * @property {d3.Selection} g - The main group element for graph contents.
         * @property {d3.Simulation} simulation - The D3 force simulation instance.
         * @property {Array<Object>} nodes - The currently displayed nodes.
         * @property {Array<Object>} links - The currently displayed links.
         * @property {Array<Object>} allNodes - The complete set of nodes from the data source.
         * @property {Array<Object>} allLinks - The complete set of links from the data source.
         * @property {d3.ZoomBehavior} zoom - The D3 zoom behavior.
         * @property {boolean} costBasedSizing - Whether node size is based on cost.
         * @property {string} currentLayout - The name of the currently active layout.
         * @property {number} graphRotation - The current rotation of the graph in degrees.
         * @property {Object} graphTransform - The current scale transform of the graph.
         * @property {number} gridSize - The size of the grid for manual layout.
         * @property {boolean} showGrid - Whether the grid is currently visible.
         * @property {string} currentDataFile - The name of the currently loaded data file.
         */
        this.state = {
            width: 0,
            height: 0,
            svg: null,
            zoomGroup: null,
            g: null,
            simulation: null,
            nodes: [],
            links: [],
            allNodes: [],
            allLinks: [],
            zoom: null,
            costBasedSizing: true,
            currentLayout: 'manual-grid',
            graphRotation: 0,
            graphTransform: { scaleX: 1, scaleY: 1 },
            gridSize: 50,
            showGrid: false,
            currentDataFile: 'sample-data.csv'
        };

        // Initialize selection manager for multi-select drag and drop
        this.selectionManager = new SelectionManager();

    /**
     * Table-oriented state for editing/importing raw elements, connections, and variables
     * independent of the visualization's internal state. These are intentionally kept
     * outside of this.state to avoid collisions with the rendering pipeline.
     * @type {Array<{ id: string, name: string, type: string, area: string, platform: string, cost: number, incomingVolume: number, description: string, x: number, y: number }>}
     */
    this.elements = [];
    /**
     * @type {Array<{ id: string, fromId: string, toId: string }>}
     */
    this.connections = [];
    /**
     * @type {{ [key: string]: number }}
     */
    this.variables = {};
    }

    /**
     * Sets up the initial visualization, binds event listeners, and loads sample data.
     * @private
     */
    async init() {
        const container = document.getElementById('networkGraph');
        if (!container) return;

        const { svg, zoomGroup, g, zoom, width, height } = initVisualization(
            container,
            (event) => interactions.handleZoom(event, this.state.zoomGroup),
            () => {}
        );

        this.state.svg = svg;
        this.state.zoomGroup = zoomGroup;
        this.state.g = g;
        this.state.zoom = zoom;
        this.state.width = width;
        this.state.height = height;

    ui.bindEventListeners(this.getEventHandlers());

        // Set the initial state of the layout dropdown and controls
        document.getElementById('layoutSelect').value = this.state.currentLayout;
        this.handleLayoutChange(this.state.currentLayout);

        // Priority: 1) JSON files, 2) localStorage, 3) empty state
        const loaded = await this.loadFromJsonFiles() || this.loadFromLocalStorage();
        if (!loaded) {
            this.initializeEmptyState();
        }

        // Now that data is loaded, render the visualization
        this.updateVisualization();

        // After loading data, try to load the default layout
        const defaultLayout = await layoutManager.loadLayout('default');
        if (defaultLayout) {
            this.applyPositions(defaultLayout);
        }

        // Initialize table editors (if available)
        if (typeof ui.initEditorTables === 'function') {
            ui.initEditorTables(this);
        }
        
        // Initialize file manager for better persistence
        initFileManager(this);
        
        // Enable Shift-only rectangle selection on the background
        if (this.state.svg && this.state.g) {
            interactions.initShiftRectangleSelection(
                this.state.svg,
                this.state.g,
                this.selectionManager,
                () => this.state.nodes
            );
        }

        // Keyboard shortcuts for selection (keep)
        interactions.initKeyboardShortcuts(
            this.selectionManager, 
            this.state.g, 
            this.state.allNodes
        );
        
        // Quick visibility for dev/test
        // eslint-disable-next-line no-console
        console.log('[Tables] Initialized with:', {
            elements: this.elements,
            connections: this.connections,
            variables: this.variables
        });
    }

    /**
     * Returns the current editable table-oriented state for export.
     */
    getState() {
        return {
            elements: this.elements,
            connections: this.connections,
            variables: this.variables,
            // Legacy support
            nodes: this.elements
        };
    }

    /**
     * Returns a method to save current state to files
     */
    saveToFiles() {
        return saveToFiles(this.elements, this.connections, this.variables);
    }

    /**
     * Legacy method for backward compatibility
     */
    getStateLegacy() {
        return {
            nodes: this.nodes,
            connections: this.connections,
            variables: this.variables
        };
    }

    /**
     * Load application data from JSON files in data/ directory (priority #1).
     * Returns true if data was loaded from files, false otherwise.
     */
    async loadFromJsonFiles() {
        try {
            // Try to load via API server first
            try {
                const apiResponse = await fetch('/api/load-workflow');
                if (apiResponse.ok) {
                    const data = await apiResponse.json();
                    this.elements = Array.isArray(data.elements) ? data.elements : [];
                    this.connections = Array.isArray(data.connections) ? data.connections : [];
                    this.variables = data.variables && typeof data.variables === 'object' ? data.variables : {};
                    
                    console.log('✅ Loaded from API server:', { 
                        elements: this.elements.length, 
                        connections: this.connections.length,
                        variables: Object.keys(this.variables).length 
                    });
                    
                    this.computeDerivedFields();
                    let { nodes: vizNodes, links: vizLinks } = processData({
                        nodes: this.elements,
                        connections: this.connections,
                        variables: this.variables
                    }, this.state.costBasedSizing);

                    const idSet = new Set((vizNodes || []).map(n => n.id));
                    vizLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));

                    this.state.allNodes = vizNodes;
                    this.state.allLinks = vizLinks;
                    this.state.nodes = [...vizNodes];
                    this.state.links = [...vizLinks];
                    this.refreshTables();
                    return true;
                }
            } catch (apiError) {
                console.log('📁 API server not available, trying direct file access...');
            }

            // Fallback: try to load from data directory files directly
            const responses = await Promise.allSettled([
                fetch('./data/elements.json'),
                fetch('./data/connections.json'), 
                fetch('./data/variables.json')
            ]);
            
            // Check if all files loaded successfully
            const [elementsRes, connectionsRes, variablesRes] = responses;
            if (elementsRes.status !== 'fulfilled' || !elementsRes.value.ok) {
                console.log('📁 No data/elements.json found, falling back to localStorage/sample');
                return false;
            }
            
            // Parse the JSON files
            const elements = await elementsRes.value.json();
            const connections = connectionsRes.status === 'fulfilled' && connectionsRes.value.ok 
                ? await connectionsRes.value.json() : [];
            const variables = variablesRes.status === 'fulfilled' && variablesRes.value.ok 
                ? await variablesRes.value.json() : {};
                
            // Set the data
            this.elements = Array.isArray(elements) ? elements : [];
            this.connections = Array.isArray(connections) ? connections : [];
            this.variables = variables && typeof variables === 'object' ? variables : {};
            
            console.log('✅ Loaded from JSON files:', { 
                elements: this.elements.length, 
                connections: this.connections.length,
                variables: Object.keys(this.variables).length 
            });
            
            // Compute derived fields and hydrate visualization
            this.computeDerivedFields();
            let { nodes: vizNodes, links: vizLinks } = processData({
                nodes: this.elements,
                connections: this.connections,
                variables: this.variables
            }, this.state.costBasedSizing);

            // Sanitize links
            const idSet = new Set((vizNodes || []).map(n => n.id));
            vizLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));

            this.state.allNodes = vizNodes;
            this.state.allLinks = vizLinks;
            this.state.nodes = [...vizNodes];
            this.state.links = [...vizLinks];
            
            // Refresh table data after loading from files
            this.refreshTables();
            return true;
            
        } catch (error) {
            console.log('📁 Failed to load from JSON files:', error.message);
            return false;
        }
    }

    /**
     * Load application data from localStorage (if present) and hydrate visualization.
     * Returns true if data was loaded from storage, false otherwise.
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('workflowData');
            if (!saved) return false;
            const { elements, nodes, connections, variables } = JSON.parse(saved);
            // Support both new format (elements) and legacy format (nodes)
            this.elements = Array.isArray(elements) ? elements : (Array.isArray(nodes) ? nodes : []);
            this.connections = Array.isArray(connections) ? connections : [];
            this.variables = variables && typeof variables === 'object' ? variables : {};

            // Compute derived fields and hydrate visualization state from table model
            this.computeDerivedFields();
            let { nodes: vizNodes, links: vizLinks } = processData({
                nodes: this.elements, // processData still expects 'nodes' key
                connections: this.connections,
                variables: this.variables
            }, this.state.costBasedSizing);

            // Sanitize links against resolved node ids to avoid d3 force errors on stale endpoints
            const idSet = new Set((vizNodes || []).map(n => n.id));
            vizLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));

            this.state.allNodes = vizNodes;
            this.state.allLinks = vizLinks;
            this.state.nodes = [...vizNodes];
            this.state.links = [...vizLinks];
            return true;
        } catch (e) {
            console.warn('Failed to load from localStorage, using sample data instead.', e);
            return false;
        }
    }

    /**
     * Persist current tables data to localStorage.
     */
    saveToLocalStorage() {
        try {
            const state = {
                elements: this.elements,
                connections: this.connections,
                variables: this.variables,
                // Keep legacy nodes key for backward compatibility
                nodes: this.elements
            };
            localStorage.setItem('workflowData', JSON.stringify(state));
        } catch (e) {
            console.warn('Failed to save to localStorage', e);
        }
    }

    /**
     * Creates and returns an object containing all the event handler functions for the UI.
     * This keeps the event binding logic clean and centralized.
     * @returns {Object.<string, function>} An object where keys are handler names and values are the corresponding functions.
     * @private
     */
    getEventHandlers() {
        return {
            handleFileSelect: (e) => {
                const fileName = e.target.files[0]?.name || 'No file selected';
                showStatus(`Selected: ${fileName}`, 'info');
            },
            handleFileUpload: () => this.handleFileUpload(),
            handleSearch: () => this.applyFilters(),
            handleFilter: () => this.applyFilters(),
            handleReset: () => this.resetView(),
            handleSizeToggle: (enabled) => this.handleSizeToggle(enabled),
            handleLayoutChange: (layout) => this.handleLayoutChange(layout),
            toggleGrid: () => this.toggleGrid(),
            snapAllToGrid: () => this.snapAllToGrid(),
            saveLayout: () => this.saveCurrentLayout(),
            loadLayout: () => this.loadSavedLayout(),
            updateGridSize: (size) => this.updateGridSize(size),
            rotateGraph: (degrees) => this.rotateGraph(degrees),
            flipGraph: (direction) => this.flipGraph(direction),
            centerGraph: () => this.centerGraph(),
            fitToScreen: () => this.fitToScreen(),
            handleVerify: () => this.showConnectionReport(),
            handleExport: () => exportToPDF(this.state),
            handleResize: () => interactions.handleResize(this.state, this.state.svg)
        };
    }

    /**
     * Rerenders the visualization. This is the main function called after any data or layout change.
     * It applies the current layout, sets up the simulation (if any), and calls the rendering functions.
     */
    updateVisualization() {
        console.log('Updating visualization with nodes:', this.state.nodes.length, 'links:', this.state.links.length);
        if (this.state.nodes.length === 0) {
            showStatus('No data to display', 'info');
        }

    // Filter out any links with missing endpoints before layout
    const idSet2 = new Set(this.state.nodes.map(n => n.id));
    this.state.links = this.state.links.filter(l => idSet2.has(l.source?.id ?? l.source) && idSet2.has(l.target?.id ?? l.target));
    this.state.simulation = applyLayout(this.state.currentLayout, this.state);

        if (this.state.simulation) {
            this.state.simulation.on('tick', () => updatePositions(this.state.g));
        }

        renderVisualizationElements(
            this.state.g,
            this.state.nodes,
            this.state.links,
            this.state.currentLayout,
            {
                dragStarted: (event, d) => interactions.dragStarted(event, d, this.state.simulation, this.state.currentLayout, this.selectionManager, this.state.nodes),
                dragged: (event, d) => {
                    interactions.dragged(event, d, this.state.simulation, this.state.currentLayout, this.state.gridSize, this.selectionManager, this.state.nodes)
                    updatePositions(this.state.g);
                },
                dragEnded: (event, d) => interactions.dragEnded(event, d, this.state.simulation, this.state.currentLayout, this.selectionManager, this.state.nodes),
                nodeClicked: (event, d) => {
                    event.stopPropagation();
                    ui.showNodeDetails(d);
                    // Handle multi-select and visual feedback
                    interactions.handleNodeClickSelection(event, d, this.selectionManager, this.state.g);
                },
                nodeMouseOver: (event, d) => highlightNode(this.state.g, d, this.state.links),
                nodeMouseOut: () => clearHighlight(this.state.g)
            }
        );
        updatePositions(this.state.g);
    }

    /**
     * Applies the current search and filter values to the dataset and updates the visualization.
     */
    applyFilters() {
        const searchQuery = document.getElementById('searchInput').value;
        const typeFilter = document.getElementById('typeFilter').value;
        const executionFilter = document.getElementById('executionFilter').value;

        const { filteredNodes, filteredLinks } = interactions.applyFilters(
            searchQuery, typeFilter, executionFilter, this.state.allNodes, this.state.allLinks
        );

        this.state.nodes = filteredNodes;
        this.state.links = filteredLinks;
        this.updateVisualization();
    }

    /**
     * Handles the user uploading a CSV file.
     * It reads the file, processes the data, and updates the visualization.
     */
    async handleFileUpload() {
        const fileInput = document.getElementById('csvFile');
        const file = fileInput.files[0];
        if (!file) {
            showStatus('Please select a CSV file first', 'error');
            return;
        }
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showStatus('Please select a valid CSV file', 'error');
            return;
        }

        this.state.currentDataFile = file.name;
        showStatus('Processing CSV file...', 'loading');
        try {
            const data = await parseCSV(file);
            const { nodes, links } = processData(data, this.state.costBasedSizing);
            this.state.allNodes = nodes;
            this.state.allLinks = links;
            this.state.nodes = [...this.state.allNodes];
            this.state.links = [...this.state.allLinks];
            this.updateVisualization();
            showStatus('CSV loaded successfully!', 'success');
        } catch (error) {
            showStatus(error.message, 'error');
        }
    }

    /**
     * Initializes empty state when no data files are found.
     */
    initializeEmptyState() {
        console.log('📋 Initializing empty workspace...');
        this.elements = [];
        this.connections = [];
        this.variables = {};
        
        this.state.allNodes = [];
        this.state.allLinks = [];
        this.state.nodes = [];
        this.state.links = [];
        this.state.currentDataFile = 'new-workflow';
        
        this.updateVisualization();
        showStatus('Ready to create new workflow', 'info');
    }

    /**
     * Seeds the table-oriented state (this.nodes, this.connections, this.variables)
     * from the current visualization state. This provides a baseline for editing via tables.
     * @private
     */
    populateTablesFromCurrentState() {
        // Map visualization nodes to table elements
        this.elements = (this.state.allNodes || []).map(n => ({
            id: n.id,
            name: n.Name || n.name || n.id,
            incomingNumber: n.incomingNumber || '',
            variable: typeof n.variable === 'number' ? n.variable : (typeof n.Variable === 'number' ? n.Variable : 1.0),
            type: n.Type || n.type || '',
            subType: n.SubType || n.subType || '',
            aOR: n.AOR || n.aOR || '',
            execution: n.Execution || n.execution || 'Manual',
            account: n.Account || n.account || '',
            platform: n.Platform || n.platform || '',
            monitoring: n.Monitoring || n.monitoring || '',
            monitoredData: n.MonitoredData || n.monitoredData || '',
            description: n.description || n.Description || '',
            avgCostTime: n.avgCostTime || n.AvgCostTime || '',
            avgCost: typeof n.avgCost === 'number' ? n.avgCost : (typeof n.AvgCost === 'number' ? n.AvgCost : 0),
            effectiveCost: typeof n.effectiveCost === 'number' ? n.effectiveCost : (typeof n["Effective Cost"] === 'number' ? n["Effective Cost"] : (typeof n.costValue === 'number' ? n.costValue : 0)),
            lastUpdate: n.lastUpdate || n.LastUpdate || '',
            nextUpdate: n.nextUpdate || n.NextUpdate || '',
            kPI: n.kPI || n.KPI || '',
            scheduleStart: n.scheduleStart || n.ScheduleStart || '',
            scheduleEnd: n.scheduleEnd || n.ScheduleEnd || '',
            frequency: n.frequency || n.Frequency || '',
            x: typeof n.x === 'number' ? n.x : 0,
            y: typeof n.y === 'number' ? n.y : 0
        }));

        // Map visualization links to table connections
        this.connections = (this.state.allLinks || []).map(l => {
            const fromId = l.source?.id ?? l.source;
            const toId = l.target?.id ?? l.target;
            return {
                id: `${fromId}->${toId}`,
                fromId,
                toId
            };
        });

        // Initialize variables as empty by default
        this.variables = this.variables || {};

        // Compute derived fields (stub)
        this.computeDerivedFields();
    }

    /**
     * Updates the table-oriented state from external inputs (e.g., editable tables)
     * and triggers a visualization refresh.
     * @param {'nodes'|'connections'|'variables'} type - The dataset being updated.
     * @param {any} data - The new data to apply.
     */
    updateFromTable(type, data) {
        console.log('🎯 updateFromTable called:', type, 'with', Array.isArray(data) ? data.length : typeof data, 'items');
        
        if (type === 'elements' || type === 'nodes') {
            this.elements = Array.isArray(data) ? [...data] : [];
            console.log('✅ Updated elements:', this.elements.length);
        } else if (type === 'connections') {
            this.connections = Array.isArray(data) ? [...data] : [];
            // Resolve any variable references within connection probabilities
            this.resolveVariables();
        } else if (type === 'variables') {
            // Normalize variable values to numbers
            const normalized = {};
            Object.entries(data || {}).forEach(([k, v]) => {
                const num = typeof v === 'number' ? v : parseFloat(v);
                if (!Number.isNaN(num)) normalized[k] = num;
            });
            this.variables = normalized;
            // Re-resolve probabilities with new variable values
            this.resolveVariables();
        } else {
            console.warn('[updateFromTable] Unknown type:', type);
            return;
        }

        // Recompute derived values and sync to visualization state
        this.computeDerivedFields();
        this.syncTableDataToVisualization();
        this.updateVisualization();
        // Auto-save after edits
        this.saveToLocalStorage();
        // Do not reload editor tables here; hot.loadData causes focus loss and jank during typing.
        // UI will refresh tables explicitly after bulk imports or structure changes.
    }    /**
     * Resolves string-based probability values in connections using variables.
     * Accepts numeric strings (e.g., "0.25") or variable keys (e.g., "callback_rate" or "${callback_rate}").
     */
    resolveVariables() {
        const varKeyFromString = (s) => {
            if (typeof s !== 'string') return null;
            const trimmed = s.trim();
            // Try numeric first
            const asNum = parseFloat(trimmed);
            if (!Number.isNaN(asNum)) return asNum;
            // Extract key from patterns like ${key}, {key}, or key
            const match = trimmed.match(/^\s*(?:\$?\{)?([a-zA-Z_][\w]*)\}?\s*$/);
            if (match) {
                const key = match[1];
                const val = this.variables?.[key];
                return typeof val === 'number' ? val : null;
            }
            return null;
        };

        this.connections = (this.connections || []).map(c => {
            let prob = c.probability;
            if (typeof prob === 'string') {
                const resolved = varKeyFromString(prob);
                if (resolved !== null) prob = resolved;
            }
            return { ...c, probability: prob };
        });
    }

    /**
     * Computes derived fields for table nodes, such as volumeIn.
     * Maps elements.json structure to calculation format and back.
     */
    computeDerivedFields() {
        // Map elements to the format expected by computeDerivedFields
        const mappedElements = this.elements.map(e => ({
            ...e,
            incomingVolume: e.incomingNumber || 0,
            nodeMultiplier: 1.0  // Don't use variable as multiplier here, it's used for connection probability
        }));
        
        // Map connections with semantic probability logic
        const connectionCounts = new Map(); // toId -> count of incoming connections
        this.connections.forEach(c => {
            connectionCounts.set(c.toId, (connectionCounts.get(c.toId) || 0) + 1);
        });
        
        const mappedConnections = this.connections.map(c => {
            const targetElement = this.elements.find(e => e.id === c.toId);
            const incomingCount = connectionCounts.get(c.toId) || 1;
            
            if (incomingCount === 1) {
                // Single incoming: use target's variable as conversion probability
                const probability = targetElement && targetElement.variable !== undefined ? targetElement.variable : 1.0;
                return { ...c, probability: probability };
            } else {
                // Multiple incoming: distinguish between primary and secondary flows
                // Primary flow (from larger volume source): use target's variable
                // Secondary flows: pass-through (probability = 1.0)
                
                // Simple heuristic: if source has "application" or "text" in name, it's primary
                const isPrimaryFlow = c.fromId.includes('application') || c.fromId.includes('text');
                
                if (isPrimaryFlow) {
                    const probability = targetElement && targetElement.variable !== undefined ? targetElement.variable : 1.0;
                    return { ...c, probability: probability };
                } else {
                    // Secondary flow: pass-through
                    return { ...c, probability: 1.0 };
                }
            }
        });
        
        console.log('🔄 Computing volumes with:', {
            elements: mappedElements.length,
            connections: mappedConnections.length,
            variables: Object.keys(this.variables).length
        });
        
        // Compute the volumes
        computeDerivedFieldsData(mappedElements, mappedConnections, this.variables);
        
        // Map the calculated volumes back to incomingNumber for display
        mappedElements.forEach((mapped, index) => {
            const calculatedVolume = mapped.computedVolumeIn || mapped.incomingVolume || 0;
            this.elements[index].incomingNumber = Math.round(calculatedVolume);
        });
        
        console.log('✅ Volume calculation completed for', this.elements.length, 'elements');
    }

    /**
     * Syncs the table data (elements, connections, variables) to the visualization state.
     * This converts table format to the format expected by the visualization.
     */
    syncTableDataToVisualization() {
        console.log('🔄 Syncing table data to visualization...', {
            elements: this.elements.length,
            connections: this.connections.length,
            variables: Object.keys(this.variables).length
        });

        // Convert table data to visualization format using processData
        const { nodes: vizNodes, links: vizLinks } = processData({
            nodes: this.elements,
            connections: this.connections,
            variables: this.variables
        }, this.state.costBasedSizing);

        // Sanitize links against resolved node ids
        const idSet = new Set((vizNodes || []).map(n => n.id));
        const sanitizedLinks = (vizLinks || []).filter(l => 
            idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target)
        );

        // Update visualization state
        this.state.allNodes = vizNodes || [];
        this.state.allLinks = sanitizedLinks;
        this.state.nodes = [...this.state.allNodes];
        this.state.links = [...this.state.allLinks];

        console.log('✅ Synced to visualization:', {
            nodes: this.state.nodes.length,
            links: this.state.links.length
        });
    }

    /**
     * Refreshes the table displays with current data
     */
    refreshTables() {
        // Trigger table refresh through UI module
        if (typeof ui.refreshEditorData === 'function') {
            ui.refreshEditorData(this);
        }
    }

    /**
     * Handles the toggling of cost-based node sizing.
     * @param {boolean} enabled - Whether cost-based sizing should be enabled.
     */
    handleSizeToggle(enabled) {
        this.state.costBasedSizing = enabled;
        this.state.allNodes.forEach(node => {
            node.size = calculateNodeSize(node.costValue, this.state.costBasedSizing);
        });
        this.state.nodes.forEach(node => {
            node.size = calculateNodeSize(node.costValue, this.state.costBasedSizing);
        });
        this.updateVisualization();
        showStatus(enabled ? 'Cost-based sizing enabled' : 'Uniform sizing enabled', 'info');
    }

    /**
     * Handles changing the graph layout.
     * @param {string} layoutType - The new layout type to apply.
     */
    handleLayoutChange(layoutType) {
    this.state.currentLayout = layoutType;
    // Enable grid controls for manual-grid and hierarchical-orthogonal layouts
    const gridCapable = layoutType === 'manual-grid' || layoutType === 'hierarchical-orthogonal';
    ui.toggleGridControls(gridCapable);
    if (!gridCapable) {
            this.state.showGrid = false;
            updateGridDisplay(this.state.svg, this.state.showGrid, this.state.width, this.state.height, this.state.gridSize);
            ui.updateGridUI(this.state.showGrid);
        }
        this.updateVisualization();
        showStatus(`Layout changed to ${layoutType}`, 'info');
    }

    /**
     * Toggles the visibility of the grid overlay.
     */
    toggleGrid() {
        this.state.showGrid = !this.state.showGrid;
        updateGridDisplay(this.state.svg, this.state.showGrid, this.state.width, this.state.height, this.state.gridSize);
        ui.updateGridUI(this.state.showGrid);
    }

    /**
     * Snaps all nodes to the nearest grid lines.
     */
    snapAllToGrid() {
        this.state.nodes.forEach(node => {
            const snapped = snapToGrid(node.x, node.y, this.state.gridSize);
            node.x = snapped.x;
            node.y = snapped.y;
            node.fx = snapped.x;
            node.fy = snapped.y;
        });
        updatePositions(this.state.g);
        showStatus('All nodes snapped to grid', 'info');
    }

    /**
     * Updates the size of the grid.
     * @param {number} newSize - The new size for the grid cells.
     */
    updateGridSize(newSize) {
        this.state.gridSize = newSize;
        ui.updateGridSizeLabel(newSize);
        if (this.state.showGrid) {
            updateGridDisplay(this.state.svg, this.state.showGrid, this.state.width, this.state.height, this.state.gridSize);
        }
    }

    /**
     * Saves the current layout of nodes to a JSON file.
     * Only saves the positions of the currently visible nodes.
     */
    /**
     * Applies a set of node positions to the current graph.
     * @param {object} positions - An object mapping node IDs to {x, y} coordinates.
     * @private
     */
    applyPositions(positions) {
        if (!positions) return;
        let loadedCount = 0;
        this.state.nodes.forEach(node => {
            if (positions[node.id]) {
                const pos = positions[node.id];
                node.x = pos.x;
                node.y = pos.y;
                node.fx = pos.x;
                node.fy = pos.y;
                loadedCount++;
            }
        });
        if (this.state.g) {
            updatePositions(this.state.g);
        }
        console.log(`Applied positions to ${loadedCount}/${this.state.nodes.length} nodes.`);
    }

    /**
     * Saves the current node positions to a named layout on the server.
     * Prompts the user for a layout name.
     */
    async saveCurrentLayout() {
        const layoutName = prompt('Enter a name for this layout:', 'default');
        if (!layoutName) {
            showStatus('Save cancelled.', 'info');
            return;
        }

        const positions = {};
        this.state.nodes.forEach(node => {
            positions[node.id] = { x: node.x, y: node.y };
        });

        const success = await layoutManager.saveLayout(layoutName, positions);
        if (success) {
            showStatus(`Layout "${layoutName}" saved successfully.`, 'success');
            // Refresh the layouts dropdown
            if (ui.populateLayoutsDropdown) {
                ui.populateLayoutsDropdown();
            }
        } else {
            showStatus(`Error saving layout "${layoutName}".`, 'error');
        }
    }

    /**
     * Loads a named layout from the server and applies it.
     * @param {string} layoutName - The name of the layout to load.
     */
    async loadSavedLayout(layoutName) {
        if (!layoutName) return;

        showStatus(`Loading layout "${layoutName}"...`, 'loading');
        const positions = await layoutManager.loadLayout(layoutName);

        if (positions) {
            this.applyPositions(positions);
            showStatus(`Layout "${layoutName}" loaded successfully.`, 'success');
        } else {
            showStatus(`Failed to load layout "${layoutName}".`, 'error');
        }
    }

    /**
     * Rotates the graph by a given number of degrees.
     * @param {number} degrees - The number of degrees to rotate (e.g., 90 or -90).
     */
    rotateGraph(degrees) {
        this.state.graphRotation += degrees;
        this.applyGraphTransform();
        showStatus(`Graph rotated ${degrees > 0 ? 'right' : 'left'}`, 'info');
    }

    /**
     * Flips the graph horizontally or vertically.
     * @param {string} direction - The direction to flip ('horizontal' or 'vertical').
     */
    flipGraph(direction) {
        if (direction === 'horizontal') this.state.graphTransform.scaleX *= -1;
        if (direction === 'vertical') this.state.graphTransform.scaleY *= -1;
        this.applyGraphTransform();
        showStatus(`Graph flipped ${direction}ly`, 'info');
    }

    /**
     * Applies the current rotation and scale transformations to the main graph group.
     * @private
     */
    applyGraphTransform() {
        if (!this.state.g) return;
        const bounds = this.calculateGraphBounds();
        const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : this.state.width / 2;
        const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : this.state.height / 2;
        const transform = `translate(${centerX}, ${centerY}) rotate(${this.state.graphRotation}) scale(${this.state.graphTransform.scaleX}, ${this.state.graphTransform.scaleY}) translate(${-centerX}, ${-centerY})`;
        this.state.g.transition().duration(300).attr('transform', transform);
        updateTextRotation(this.state.g, this.state.graphRotation, this.state.graphTransform);
    }

    /**
     * Resets the zoom and pan to center the graph.
     */
    centerGraph() {
        if (this.state.svg && this.state.zoom) {
            this.state.svg.transition().duration(750).call(this.state.zoom.transform, d3.zoomIdentity);
            showStatus('Graph centered', 'info');
        }
    }

    /**
     * Adjusts the zoom and pan to fit the entire graph within the viewport.
     */
    fitToScreen() {
        if (!this.state.g || this.state.nodes.length === 0) return;
        const bounds = this.calculateGraphBounds();
        if (!bounds) return;
        const padding = 50;
        const scale = Math.min(
            (this.state.width - padding * 2) / (bounds.maxX - bounds.minX),
            (this.state.height - padding * 2) / (bounds.maxY - bounds.minY),
            2
        );
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        const transform = d3.zoomIdentity
            .translate(this.state.width / 2, this.state.height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);
        this.state.svg.transition().duration(750).call(this.state.zoom.transform, transform);
        showStatus('Graph fitted to screen', 'info');
    }

    /**
     * Calculates the bounding box of the currently displayed nodes.
     * @returns {{minX: number, maxX: number, minY: number, maxY: number}|null} The bounding box or null if no nodes.
     * @private
     */
    calculateGraphBounds() {
        if (this.state.nodes.length === 0) return null;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        this.state.nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
                minX = Math.min(minX, node.x - node.size);
                maxX = Math.max(maxX, node.x + node.size);
                minY = Math.min(minY, node.y - node.size);
                maxY = Math.max(maxY, node.y + node.size);
            }
        });
        return minX === Infinity ? null : { minX, maxX, minY, maxY };
    }

    /**
     * Runs a verification on the graph connections and displays a report.
     */
    showConnectionReport() {
        const report = verifyConnections(this.state.allNodes, this.state.allLinks);
        let message = `📊 Connection Report: Total Nodes: ${report.totalNodes}, Total Links: ${report.totalLinks}, Broken Connections: ${report.brokenConnections.length}, Orphaned Nodes: ${report.orphanedNodes.length}, Dead-end Nodes: ${report.deadEndNodes.length}, Validation Errors: ${report.validationErrors.length}`;
        if (report.brokenConnections.length > 0 || report.validationErrors.length > 0) {
            showStatus('Connection issues found - check console for details', 'error');
            console.warn('❌ Connection Issues Found:');
            report.brokenConnections.forEach(issue => console.warn('  -', issue.error));
            report.validationErrors.forEach(issue => console.warn('  -', issue.error));
        } else {
            showStatus('All connections verified successfully!', 'success');
        }
        console.log(message);
    }

    /**
     * Resets the view to its initial state (filters, layout, zoom, etc.).
     */
    resetView() {
        ui.resetUI();
        this.state.currentLayout = 'force';
        this.state.graphRotation = 0;
        this.state.graphTransform = { scaleX: 1, scaleY: 1 };
        this.state.nodes = [...this.state.allNodes];
        this.state.links = [...this.state.allLinks];
        this.updateVisualization();
        this.centerGraph();
        updateTextRotation(this.state.g, this.state.graphRotation, this.state.graphTransform);
        showStatus('View reset', 'success');
    }
}

/**
 * Initializes the application by creating a new WorkflowVisualizer instance.
 * This is the main entry point of the application.
 */
export async function initializeApp() {
    const app = new WorkflowVisualizer();
    await app.init();
    
    // Expose for debugging
    window.workflowApp = app;
    console.log('🎯 App instance available as window.workflowApp for debugging');
    
    return app;
}