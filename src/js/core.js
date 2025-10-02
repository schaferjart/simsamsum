import * as d3 from 'd3';
import { showStatus, calculateNodeSize, downloadJsonFile, snapToGrid } from './utils.js';
import { processData, verifyConnections, computeDerivedFields as computeDerivedFieldsData } from './data.js';
import { initVisualization, renderVisualizationElements, updatePositions, highlightNode, clearHighlight, updateTextRotation, updateGridDisplay, updateSelectionVisuals } from './render.js';
import { applyLayout } from './layouts.js';
import * as interactions from './interactions.js';
import * as layoutManager from './layoutManager.js';
import * as ui from './ui.js';
import { exportToPDF } from './export.js';
import { initFileManager, saveToFiles, loadFromFile } from './fileManager.js';
import alasql from 'alasql';
import { SelectionManager } from './selection.js';
import { filterData, applyStylingRules } from './filtering.js';

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

        this.selectionManager = new SelectionManager();
        this.isUpdatingFromQuery = false; // Flag to prevent selection-to-query feedback loop
        this.undoStack = [];
        this.maxUndo = 50;
        this.elements = [];
        this.connections = [];
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
            () => {
                this.selectionManager.clearSelection();
                updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes);
                ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes);
            }
        );

        this.state.svg = svg;
        this.state.zoomGroup = zoomGroup;
        this.state.g = g;
        this.state.zoom = zoom;
        this.state.width = width;
        this.state.height = height;

        ui.bindEventListeners(this.getEventHandlers());

        document.getElementById('layoutSelect').value = this.state.currentLayout;
        this.handleLayoutChange(this.state.currentLayout);

        const loaded = await this.loadFromJsonFiles() || this.loadFromLocalStorage();
        if (!loaded) {
            this.initializeEmptyState();
        }

        this.updateVisualization();

        const defaultLayout = await layoutManager.loadLayout('default');
        if (defaultLayout) {
            this.applyPositions(defaultLayout);
        }

        if (typeof ui.initEditorTables === 'function') {
            ui.initEditorTables(this);
        }
        
        initFileManager(this);
        
        if (this.state.svg && this.state.g) {
            interactions.initShiftRectangleSelection(
                this.state.svg,
                this.state.g,
                this.selectionManager,
                () => this.state.nodes
            );
        }

        this.selectionManager.setOnChange((beforeIds, afterIds) => {
            this.updateUIFromSelection();
            this._pushUndo({
                type: 'selection',
                before: beforeIds,
                after: afterIds
            });
        });

        document.addEventListener('keydown', (e) => {
            const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z');
            if (!isUndo) return;

            const ae = document.activeElement;
            const tag = (ae?.tagName || '').toLowerCase();
            const isTyping = tag === 'input' || tag === 'textarea' || (ae && ae.isContentEditable);
            if (isTyping) return;

            const target = e.target;
            if (target && typeof target.closest === 'function' && target.closest('.handsontable')) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            this.undoLastAction();
        }, true);

        interactions.initKeyboardShortcuts(
            this.selectionManager, 
            this.state.g, 
            this.state.allNodes
        );
        
        console.log('[Tables] Initialized with:', {
            elements: this.elements,
            connections: this.connections,
            variables: this.variables
        });
    }

    getState() {
        return {
            elements: this.elements,
            connections: this.connections,
            variables: this.variables,
            nodes: this.elements
        };
    }

    saveToFiles() {
        return saveToFiles(this.elements, this.connections, this.variables);
    }

    getStateLegacy() {
        return {
            nodes: this.nodes,
            connections: this.connections,
            variables: this.variables
        };
    }

    async loadFromJsonFiles() {
        try {
            try {
                const apiResponse = await fetch('/api/load-workflow');
                if (apiResponse.ok) {
                    const data = await apiResponse.json();
                    this.elements = data.elements || [];
                    this.connections = data.connections || [];
                    this.variables = data.variables || {};
                    this.computeDerivedFields();
                    let { nodes: vizNodes, links: vizLinks } = processData({ nodes: this.elements, connections: this.connections, variables: this.variables }, this.state.costBasedSizing);
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
                console.log('API server not available, trying direct file access...');
            }

            const [elementsRes, connectionsRes, variablesRes] = await Promise.allSettled([
                fetch('./data/elements.json'),
                fetch('./data/connections.json'), 
                fetch('./data/variables.json')
            ]);
            
            if (elementsRes.status !== 'fulfilled' || !elementsRes.value.ok) return false;
            
            this.elements = await elementsRes.value.json();
            this.connections = connectionsRes.status === 'fulfilled' && connectionsRes.value.ok ? await connectionsRes.value.json() : [];
            this.variables = variablesRes.status === 'fulfilled' && variablesRes.value.ok ? await variablesRes.value.json() : {};
            
            this.computeDerivedFields();
            let { nodes: vizNodes, links: vizLinks } = processData({ nodes: this.elements, connections: this.connections, variables: this.variables }, this.state.costBasedSizing);
            const idSet = new Set((vizNodes || []).map(n => n.id));
            vizLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));
            this.state.allNodes = vizNodes;
            this.state.allLinks = vizLinks;
            this.state.nodes = [...vizNodes];
            this.state.links = [...vizLinks];
            
            this.refreshTables();
            return true;
        } catch (error) {
            console.log('Failed to load from JSON files:', error.message);
            return false;
        }
    }

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('workflowData');
            if (!saved) return false;
            const { elements, nodes, connections, variables } = JSON.parse(saved);
            this.elements = elements || nodes || [];
            this.connections = connections || [];
            this.variables = variables || {};
            this.computeDerivedFields();
            let { nodes: vizNodes, links: vizLinks } = processData({ nodes: this.elements, connections: this.connections, variables: this.variables }, this.state.costBasedSizing);
            const idSet = new Set((vizNodes || []).map(n => n.id));
            vizLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));
            this.state.allNodes = vizNodes;
            this.state.allLinks = vizLinks;
            this.state.nodes = [...vizNodes];
            this.state.links = [...vizLinks];
            return true;
        } catch (e) {
            console.warn('Failed to load from localStorage', e);
            return false;
        }
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('workflowData', JSON.stringify({
                elements: this.elements,
                connections: this.connections,
                variables: this.variables,
                nodes: this.elements
            }));
        } catch (e) {
            console.warn('Failed to save to localStorage', e);
        }
    }

    getEventHandlers() {
        return {
            applyFiltersAndStyles: () => this.applyFiltersAndStyles(),
            handleReset: () => this.resetView(),
            handleSizeToggle: (enabled) => this.handleSizeToggle(enabled),
            handleLayoutChange: (layout) => this.handleLayoutChange(layout),
            toggleGrid: () => this.toggleGrid(),
            snapAllToGrid: () => this.snapAllToGrid(),
            saveLayout: () => this.saveCurrentLayout(),
            loadLayout: (layoutName) => this.loadSavedLayout(layoutName),
            updateGridSize: (size) => this.updateGridSize(size),
            rotateGraph: (degrees) => this.rotateGraph(degrees),
            flipGraph: (direction) => this.flipGraph(direction),
            centerGraph: () => this.centerGraph(),
            fitToScreen: () => this.fitToScreen(),
            handleVerify: () => this.showConnectionReport(),
            handleExport: () => exportToPDF(this.state),
            handleResize: () => interactions.handleResize(this.state, this.state.svg),
            handleQueryChange: (query) => this.handleQueryChange(query),
            handleStyleChange: () => this.handleStyleChange(),
            handleSaveStyle: () => this.handleSaveStyle(),
            handleLoadStyle: () => this.handleLoadStyle()
        };
    }

    handleQueryChange(query) {
        this.isUpdatingFromQuery = true;
        try {
            if (!query.trim()) {
                this.selectionManager.clearSelection();
                return;
            }
            const sql = `SELECT id FROM ? WHERE ${query}`;
            const results = alasql(sql, [this.state.allNodes]);
            const selectedNodeIds = results.map(row => row.id);
            this.selectionManager.selectAll(selectedNodeIds); // selectAll replaces the current selection
        } catch (e) {
            console.error("Alasql query error:", e);
            this.selectionManager.clearSelection();
            showStatus('Invalid query.', 'error');
        } finally {
            this.isUpdatingFromQuery = false;
        }
    }

    updateUIFromSelection() {
        const selectedIds = this.selectionManager.getSelectedIds();
        const selectedNodes = new Set(selectedIds);
        updateSelectionVisuals(this.state.g, selectedNodes);
        ui.updateTableSelectionHighlights(selectedNodes);
        ui.updateSelectionStatusBar(selectedIds.length, selectedIds);
        if (!this.isUpdatingFromQuery) {
            if (selectedIds.length > 0) {
                const idList = selectedIds.map(id => `'${id}'`).join(',');
                const query = `id IN (${idList})`;
                ui.updateQueryInput(query);
            } else {
                ui.updateQueryInput('');
            }
        }
    }

    handleStyleChange() {
        const styles = ui.getToolbarStyles();
        const selectedIds = this.selectionManager.getSelectedIds();
        if (selectedIds.length === 0) {
            showStatus('Select elements to apply styles.', 'info');
            return;
        }
        this.state.allNodes.forEach(node => {
            if (selectedIds.includes(node.id)) {
                if (!node.customStyle) node.customStyle = {};
                Object.assign(node.customStyle, styles);
            }
        });
        this.state.allLinks.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            if (selectedIds.includes(sourceId) || selectedIds.includes(targetId)) {
                 if (!link.customStyle) link.customStyle = {};
                 Object.assign(link.customStyle, styles);
            }
        });
        this.updateVisualization();
    }

    handleSaveStyle() {
        const query = document.getElementById('query-input')?.value;
        if (!query) {
            showStatus('A query is required to save a style.', 'error');
            return;
        }
        const styleName = prompt('Enter a name for this style:', 'New Style');
        if (!styleName) return;
        const styles = ui.getToolbarStyles();
        const styleConfig = { name: styleName, query, styles };
        const savedStyles = JSON.parse(localStorage.getItem('savedStyles') || '[]');
        const existingIndex = savedStyles.findIndex(s => s.name === styleName);
        if (existingIndex > -1) {
            if (confirm(`A style named "${styleName}" already exists. Overwrite it?`)) {
                savedStyles[existingIndex] = styleConfig;
            } else {
                return;
            }
        } else {
            savedStyles.push(styleConfig);
        }
        localStorage.setItem('savedStyles', JSON.stringify(savedStyles));
        showStatus(`Style "${styleName}" saved successfully.`, 'success');
    }

    handleLoadStyle() {
        const savedStyles = JSON.parse(localStorage.getItem('savedStyles') || '[]');
        if (savedStyles.length === 0) {
            showStatus('No saved styles found.', 'info');
            return;
        }
        const styleName = prompt(`Enter the name of the style to load.\nAvailable: ${savedStyles.map(s => s.name).join(', ')}`);
        if (!styleName) return;
        const styleConfig = savedStyles.find(s => s.name === styleName);
        if (!styleConfig) {
            showStatus(`Style "${styleName}" not found.`, 'error');
            return;
        }
        ui.setToolbarStyles(styleConfig.styles);
        ui.updateQueryInput(styleConfig.query);
        this.handleQueryChange(styleConfig.query);
        setTimeout(() => {
            this.handleStyleChange();
            showStatus(`Style "${styleName}" loaded.`, 'success');
        }, 100);
    }

    updateVisualization() {
        console.log('Updating visualization with nodes:', this.state.nodes.length, 'links:', this.state.links.length);
        if (this.state.nodes.length === 0) {
            showStatus('No data to display', 'info');
        }
        const idSet2 = new Set(this.state.nodes.map(n => n.id));
        this.state.links = this.state.links.filter(l => idSet2.has(l.source?.id ?? l.source) && idSet2.has(l.target?.id ?? l.target));
        const nodeById = new Map(this.state.nodes.map(n => [n.id, n]));
        this.state.links = this.state.links.map(l => {
            const source = (l.source && typeof l.source === 'object') ? l.source : nodeById.get(l.source);
            const target = (l.target && typeof l.target === 'object') ? l.target : nodeById.get(l.target);
            return { ...l, source, target };
        });
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
                dragStarted: (event, d) => {
                    const ids = this.selectionManager.getSelectionCount() > 0 && this.selectionManager.isSelected(d.id)
                        ? this.selectionManager.getSelectedIds()
                        : [d.id];
                    const beforePositions = new Map();
                    ids.forEach(id => {
                        const node = this.state.nodes.find(n => n.id === id);
                        if (node) beforePositions.set(id, { x: node.x, y: node.y });
                    });
                    this._pendingMove = { ids, before: beforePositions };
                    interactions.dragStarted(event, d, this.state.simulation, this.state.currentLayout, this.selectionManager, this.state.nodes);
                },
                dragged: (event, d) => {
                    interactions.dragged(event, d, this.state.simulation, this.state.currentLayout, this.state.gridSize, this.selectionManager, this.state.nodes)
                    updatePositions(this.state.g);
                },
                dragEnded: (event, d) => {
                    interactions.dragEnded(event, d, this.state.simulation, this.state.currentLayout, this.selectionManager, this.state.nodes);
                    if (this._pendingMove) {
                        const afterPositions = new Map();
                        this._pendingMove.ids.forEach(id => {
                            const node = this.state.nodes.find(n => n.id === id);
                            if (node) afterPositions.set(id, { x: node.x, y: node.y });
                        });
                        const changed = Array.from(this._pendingMove.before.entries()).some(([id, pos]) => {
                            const ap = afterPositions.get(id);
                            return !ap || ap.x !== pos.x || ap.y !== pos.y;
                        });
                        if (changed) {
                            this._pushUndo({ type: 'move', before: this._pendingMove.before, after: afterPositions });
                        }
                        this._pendingMove = null;
                    }
                },
                nodeClicked: (event, d) => {
                    event.stopPropagation();
                    ui.showNodeDetails(d);
                    interactions.handleNodeClickSelection(event, d, this.selectionManager, this.state.g);
                },
                nodeMouseOver: (event, d) => highlightNode(this.state.g, d, this.state.links),
                nodeMouseOut: () => clearHighlight(this.state.g)
            }
        );
        updatePositions(this.state.g);
        updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes || new Set());
        ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes || new Set());
    }

    _pushUndo(action) {
        this.undoStack.push(action);
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    }

    undoLastAction() {
        const action = this.undoStack.pop();
        if (!action) return;
        if (action.type === 'selection') {
            this.selectionManager.selectedNodes = new Set(action.before);
            updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes);
            ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes);
        } else if (action.type === 'move') {
            action.before.forEach((pos, id) => {
                const node = this.state.nodes.find(n => n.id === id);
                if (node) {
                    node.x = pos.x; node.y = pos.y;
                    node.fx = pos.x; node.fy = pos.y;
                }
            });
            updatePositions(this.state.g);
            if (this.state.simulation) this.state.simulation.alpha(0.15).restart();
        }
    }

    applyFiltersAndStyles() {
        const filterRules = ui.getFilterRules();
        const filterMode = ui.getFilterMode();
        const { filteredNodes, filteredLinks } = filterData(this.state.allNodes, this.state.allLinks, filterRules, filterMode);
        this.state.nodes = filteredNodes;
        this.state.links = filteredLinks;
        const stylingRules = ui.getStylingRules();
        applyStylingRules(this.state.nodes, this.state.links, stylingRules);
        this.updateVisualization();
    }

    initializeEmptyState() {
        console.log('Initializing empty workspace...');
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

    populateTablesFromCurrentState() {
        this.elements = (this.state.allNodes || []).map(n => ({
            id: n.id,
            name: n.Name || n.name || n.id,
            incomingNumber: n.incomingNumber || '',
            variable: n.variable ?? n.Variable ?? 1.0,
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
            avgCost: n.avgCost ?? n.AvgCost ?? 0,
            effectiveCost: n.effectiveCost ?? n["Effective Cost"] ?? n.costValue ?? 0,
            lastUpdate: n.lastUpdate || n.LastUpdate || '',
            nextUpdate: n.nextUpdate || n.NextUpdate || '',
            kPI: n.kPI || n.KPI || '',
            scheduleStart: n.scheduleStart || n.ScheduleStart || '',
            scheduleEnd: n.scheduleEnd || n.ScheduleEnd || '',
            frequency: n.frequency || n.Frequency || '',
            x: n.x ?? 0,
            y: n.y ?? 0
        }));
        this.connections = (this.state.allLinks || []).map(l => ({
            id: `${l.source?.id ?? l.source}->${l.target?.id ?? l.target}`,
            fromId: l.source?.id ?? l.source,
            toId: l.target?.id ?? l.target
        }));
        this.variables = this.variables || {};
        this.computeDerivedFields();
    }

    updateFromTable(type, data) {
        if (type === 'elements' || type === 'nodes') {
            this.elements = Array.isArray(data) ? [...data] : [];
        } else if (type === 'connections') {
            this.connections = Array.isArray(data) ? [...data] : [];
            this.resolveVariables();
        } else if (type === 'variables') {
            const normalized = {};
            Object.entries(data || {}).forEach(([k, v]) => {
                const num = typeof v === 'number' ? v : parseFloat(v);
                if (!Number.isNaN(num)) normalized[k] = num;
            });
            this.variables = normalized;
            this.resolveVariables();
        } else {
            return;
        }
        this.computeDerivedFields();
        this.syncTableDataToVisualization();
        this.updateVisualization();
        this.saveToLocalStorage();
    }

    resolveVariables() {
        const varKeyFromString = (s) => {
            if (typeof s !== 'string') return null;
            const trimmed = s.trim();
            const asNum = parseFloat(trimmed);
            if (!Number.isNaN(asNum)) return asNum;
            const match = trimmed.match(/^\s*(?:\$?\{)?([a-zA-Z_][\w]*)\}?\s*$/);
            if (match) {
                const key = match[1];
                return this.variables?.[key] ?? null;
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

    computeDerivedFields() {
        const mappedElements = this.elements.map(e => ({
            ...e,
            incomingVolume: e.incomingNumber || 0,
            nodeMultiplier: 1.0
        }));
        const connectionCounts = new Map();
        this.connections.forEach(c => connectionCounts.set(c.toId, (connectionCounts.get(c.toId) || 0) + 1));
        const mappedConnections = this.connections.map(c => {
            const targetElement = this.elements.find(e => e.id === c.toId);
            const incomingCount = connectionCounts.get(c.toId) || 1;
            if (incomingCount === 1) {
                return { ...c, probability: targetElement?.variable ?? 1.0 };
            } else {
                const isPrimaryFlow = c.fromId.includes('application') || c.fromId.includes('text');
                return { ...c, probability: isPrimaryFlow ? (targetElement?.variable ?? 1.0) : 1.0 };
            }
        });
        computeDerivedFieldsData(mappedElements, mappedConnections, this.variables);
        mappedElements.forEach((mapped, index) => {
            this.elements[index].incomingNumber = Math.round(mapped.computedVolumeIn || mapped.incomingVolume || 0);
        });
    }

    syncTableDataToVisualization() {
        const { nodes: vizNodes, links: vizLinks } = processData({
            nodes: this.elements,
            connections: this.connections,
            variables: this.variables
        }, this.state.costBasedSizing);
        const idSet = new Set((vizNodes || []).map(n => n.id));
        const sanitizedLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));
        const prevById = new Map((this.state.allNodes || []).map(n => [n.id, n]));
        const mergedNodes = (vizNodes || []).map(n => {
            const prev = prevById.get(n.id);
            if (prev && (typeof prev.x === 'number') && (typeof prev.y === 'number')) {
                return { ...n, x: prev.x, y: prev.y, fx: prev.fx ?? prev.x, fy: prev.fy ?? prev.y };
            }
            return n;
        });
        this.state.allNodes = mergedNodes;
        this.state.allLinks = sanitizedLinks;
        this.state.nodes = [...this.state.allNodes];
        this.state.links = [...this.state.allLinks];
    }

    refreshTables() {
        if (typeof ui.refreshEditorData === 'function') {
            ui.refreshEditorData(this);
        }
    }

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

    handleLayoutChange(layoutType) {
        this.state.currentLayout = layoutType;
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

    toggleGrid() {
        this.state.showGrid = !this.state.showGrid;
        updateGridDisplay(this.state.svg, this.state.showGrid, this.state.width, this.state.height, this.state.gridSize);
        ui.updateGridUI(this.state.showGrid);
    }

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

    updateGridSize(newSize) {
        this.state.gridSize = newSize;
        ui.updateGridSizeLabel(newSize);
        if (this.state.showGrid) {
            updateGridDisplay(this.state.svg, this.state.showGrid, this.state.width, this.state.height, this.state.gridSize);
        }
    }

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
            if (ui.populateLayoutsDropdown) {
                ui.populateLayoutsDropdown();
            }
        } else {
            showStatus(`Error saving layout "${layoutName}".`, 'error');
        }
    }

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

    rotateGraph(degrees) {
        this.state.graphRotation += degrees;
        this.applyGraphTransform();
        showStatus(`Graph rotated ${degrees > 0 ? 'right' : 'left'}`, 'info');
    }

    flipGraph(direction) {
        if (direction === 'horizontal') this.state.graphTransform.scaleX *= -1;
        if (direction === 'vertical') this.state.graphTransform.scaleY *= -1;
        this.applyGraphTransform();
        showStatus(`Graph flipped ${direction}ly`, 'info');
    }

    applyGraphTransform() {
        if (!this.state.g) return;
        const bounds = this.calculateGraphBounds();
        const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : this.state.width / 2;
        const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : this.state.height / 2;
        const transform = `translate(${centerX}, ${centerY}) rotate(${this.state.graphRotation}) scale(${this.state.graphTransform.scaleX}, ${this.state.graphTransform.scaleY}) translate(${-centerX}, ${-centerY})`;
        this.state.g.transition().duration(300).attr('transform', transform);
        updateTextRotation(this.state.g, this.state.graphRotation, this.state.graphTransform);
    }

    centerGraph() {
        if (this.state.svg && this.state.zoom) {
            this.state.svg.transition().duration(750).call(this.state.zoom.transform, d3.zoomIdentity);
            showStatus('Graph centered', 'info');
        }
    }

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

export async function initializeApp() {
    const app = new WorkflowVisualizer();
    await app.init();
    window.workflowApp = app;
    console.log('🎯 App instance available as window.workflowApp for debugging');
    return app;
}