import * as d3 from 'd3';
import { showStatus, calculateNodeSize, snapToGrid } from '../utils.js';
import { processData, verifyConnections, computeDerivedFields as computeDerivedFieldsData, resolveValue, extractExpressionTokens } from '../data/index.js';
import { initVisualization, renderVisualizationElements, updatePositions, highlightNode, clearHighlight, updateTextRotation, updateGridDisplay, updateSelectionVisuals } from '../render/index.js';
import { applyLayout } from '../layouts/index.js';
import * as interactions from '../interactions/index.js';
import * as layoutManager from '../layouts/persistence.js';
import * as ui from '../ui/index.js';
import { exportToPDF, initExportHandler } from '../export.js';
import { initFileManager, saveToFiles } from '../fileManager.js';
import { SelectionManager } from './selection-manager.js';
import { UndoManager } from './undo-manager.js';
import { NodeSizingManager } from './node-sizing-manager.js';
import { GridManager } from './grid-manager.js';
import { VariableManager } from './variable-manager.js';
import * as dataLoader from './data-loader.js';
import * as graphTransforms from './graph-transforms.js';
import { createEventHandlers } from './event-handler-factory.js';
import { filterData, applyStylingRules } from '../filtering/index.js';

/**
 * Main class for the Workflow Visualizer application.
 * Manages the application state, data, and interactions.
 */
export class WorkflowVisualizer {
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
            nodeSizing: null,
            currentLayout: 'manual-grid',
            graphRotation: 0,
            graphTransform: { scaleX: 1, scaleY: 1 },
            currentDataFile: 'sample-data.csv'
        };

        // Initialize managers
        this.selectionManager = new SelectionManager();
        this.undoManager = new UndoManager();
        
        const defaultSizingColumn = typeof ui.getDefaultSizeColumn === 'function'
            ? ui.getDefaultSizeColumn()
            : 'incomingVolume';
        
        this.nodeSizingManager = new NodeSizingManager({
            enabled: true,
            column: defaultSizingColumn,
            minValue: null,
            maxValue: null,
            minSize: 24,
            maxSize: 90,
            baseSize: 40,
            zeroSize: 10
        });
        
        this.gridManager = new GridManager({
            gridSize: 50,
            showGrid: false
        });
        
        this.variableManager = new VariableManager();

        // For backward compatibility, keep nodeSizing in state
        this.state.nodeSizing = this.nodeSizingManager.getConfig();

    /**
     * Table-oriented state for editing/importing raw elements, connections, and variables
     * independent of the visualization's internal state. These are intentionally kept
     * outside of this.state to avoid collisions with the rendering pipeline.
     */
    this.elements = [];
    this.connections = [];
    this.variables = {};
    }

    // Backward compatibility getters for state properties managed by GridManager
    get gridSize() {
        return this.gridManager.getSize();
    }

    set gridSize(value) {
        this.gridManager.updateGridSize(value);
    }

    get showGrid() {
        return this.gridManager.isVisible();
    }

    set showGrid(value) {
        this.gridManager.setVisible(value);
    }

    // Backward compatibility getters for VariableManager
    get generatedVariables() {
        return this.variableManager.getGeneratedVariables();
    }

    get usedGeneratedVariables() {
        return this.variableManager.getUsedVariables();
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
                // Clear selection on background click and sync visuals/tables
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

        ui.bindEventListeners(this, createEventHandlers(this));

        // Set the initial state of the layout dropdown and controls
        document.getElementById('layoutSelect').value = this.state.currentLayout;
        this.handleLayoutChange(this.state.currentLayout);

        if (typeof ui.updateSizeControlUI === 'function') {
            ui.updateSizeControlUI(this.state.nodeSizing, ui.getNumericNodeColumns?.());
        }

        // Priority: 1) JSON files, 2) localStorage, 3) empty state
        const loadedData = await dataLoader.loadFromJsonFiles() || dataLoader.loadFromLocalStorage();
        if (loadedData) {
            this.elements = loadedData.elements;
            this.connections = loadedData.connections;
            this.variables = loadedData.variables;

            this.computeDerivedFields();
            const sizingConfig = this.getProcessDataSizingConfig();
            let { nodes: vizNodes, links: vizLinks } = processData({
                nodes: this.elements,
                connections: this.connections,
                variables: this.variables
            }, sizingConfig, this.variables);

            const idSet = new Set((vizNodes || []).map(n => n.id));
            vizLinks = (vizLinks || []).filter(l => idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target));

            this.state.allNodes = vizNodes;
            this.state.allLinks = vizLinks;
            this.state.nodes = [...vizNodes];
            this.state.links = [...vizLinks];
            this.refreshNodeSizing();
            this.refreshTables();
        } else {
            this.initializeEmptyState();
        }

        // Now that data is loaded, render the visualization
        this.updateVisualization();

        // After loading data, try to load the default layout
        const defaultLayout = await layoutManager.loadLayout('default');
        if (defaultLayout) {
            this.applyPositions(defaultLayout);
        }

        // Fit the graph to screen on initial load
        setTimeout(() => {
            graphTransforms.fitToScreen(this.state);
        }, 500);

        // Initialize table editors (if available)
        if (typeof ui.initEditorTables === 'function') {
            ui.initEditorTables(this);
        }

        // Initialize file manager for better persistence
        initFileManager(this);

        // Initialize export settings manager
        if (typeof ui.initExportSettings === 'function') {
            ui.initExportSettings();
        }

        // Initialize export handler to listen for export events
        initExportHandler(this.state);

        // Enable Shift-only rectangle selection on the background
        if (this.state.svg && this.state.g) {
            interactions.initShiftRectangleSelection(
                this.state.svg,
                this.state.g,
                this.selectionManager,
                () => this.state.nodes
            );
        }

        // Hook selection changes for undo tracking and visual updates
        this.selectionManager.setOnChange((beforeIds, afterIds) => {
            // Push selection change action if it actually changed
            this.undoManager.push({
                type: 'selection',
                before: beforeIds,
                after: afterIds
            });

            // Update visualization and table highlights
            updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes);
            ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes);
        });

        // Keyboard shortcuts including Undo (Cmd/Ctrl+Z).
        // Use capture to ensure it works even when focus is inside other panels/tables.
        document.addEventListener('keydown', (e) => {
            const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z');
            if (!isUndo) return;

            // If user is actively typing in an input/textarea/contentEditable, let that component handle undo.
            const ae = document.activeElement;
            const tag = (ae?.tagName || '').toLowerCase();
            const isTyping = tag === 'input' || tag === 'textarea' || (ae && ae.isContentEditable);
            if (isTyping) return; // Allow editors to own Cmd/Ctrl+Z

            // If the event target is inside a Handsontable container, let HOT handle undo
            // HOT root has class 'handsontable' on its container tree.
            const target = e.target;
            if (target && typeof target.closest === 'function' && target.closest('.handsontable')) {
                return;
            }

            // Otherwise, perform graph undo and prevent other handlers from consuming it.
            e.preventDefault();
            e.stopPropagation();
            this.undoLastAction();
        }, true);

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
        return saveToFiles(this.elements, this.connections, this.variables, this.variableManager.getGeneratedVariables());
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

    refreshGeneratedVariables() {
        this.variableManager.refreshGeneratedVariables(this.connections, this.variables, this.elements);
    }

    syncGeneratedVariableUsage() {
        this.variableManager.syncGeneratedVariableUsage(this.connections, this.variables, this.elements);
    }

    getEvaluationVariables() {
        return this.variableManager.getEvaluationVariables(this.variables);
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

    // Sync state with manager-controlled properties for compatibility
    this.state.gridSize = this.gridManager.getSize();

    // Ensure link endpoints are node object references so non-force layouts can render connectors
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
                    // Snapshot positions of selected nodes (or the single node) for undo
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
                    interactions.dragged(event, d, this.state.simulation, this.state.currentLayout, this.gridManager.getSize(), this.selectionManager, this.state.nodes)
                    updatePositions(this.state.g);
                },
                dragEnded: (event, d) => {
                    interactions.dragEnded(event, d, this.state.simulation, this.state.currentLayout, this.selectionManager, this.state.nodes);
                    // Record after positions and push undo action if any movement happened
                    if (this._pendingMove) {
                        const afterPositions = new Map();
                        this._pendingMove.ids.forEach(id => {
                            const node = this.state.nodes.find(n => n.id === id);
                            if (node) afterPositions.set(id, { x: node.x, y: node.y });
                        });
                        // Check if any changed
                        const changed = Array.from(this._pendingMove.before.entries()).some(([id, pos]) => {
                            const ap = afterPositions.get(id);
                            return !ap || ap.x !== pos.x || ap.y !== pos.y;
                        });
                        if (changed) {
                            this.undoManager.push({ type: 'move', before: this._pendingMove.before, after: afterPositions });
                        }
                        this._pendingMove = null;
                    }
                },
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

    // Always sync selection/table highlights after re-render (handles empty selection too)
        updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes || new Set());
    ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes || new Set());
    }

    // Undo last action (selection or move)
    undoLastAction() {
        const action = this.undoManager.pop();
        if (!action) return;

        if (action.type === 'selection') {
            // Restore previous selection
            this.selectionManager.selectedNodes = new Set(action.before);
            updateSelectionVisuals(this.state.g, this.selectionManager.selectedNodes);
            ui.updateTableSelectionHighlights(this.selectionManager.selectedNodes);
        } else if (action.type === 'move') {
            // Restore previous positions
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

    /**
     * Applies the current filter and styling rules to the dataset and updates the visualization.
     */
    applyFiltersAndStyles() {
        const filterRules = ui.getFilterRules();
        const filterMode = ui.getFilterMode();
        const { filteredNodes, filteredLinks } = filterData(this.state.allNodes, this.state.allLinks, filterRules, filterMode);

        this.state.nodes = filteredNodes;
        this.state.links = filteredLinks;

        const stylingRules = [
            ...ui.getDerivedStylingRules(filterRules),
            ...ui.getStylingRules()
        ];
        applyStylingRules(this.state.nodes, this.state.links, stylingRules);

        this.updateVisualization();
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
        this.refreshNodeSizing();

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
        this.elements = (this.state.allNodes || []).map(n => {
            const incomingNumber = n.incomingNumber ?? n.IncomingNumber ?? '';
            const variable = n.variable ?? n.Variable ?? '';
            const avgCost = n.avgCost ?? n.AvgCost ?? n['Ø Cost'] ?? '';
            const effectiveCost = n.effectiveCost ?? n['Effective Cost'] ?? n.costValue ?? '';
            const computedIncoming = typeof n.computedIncomingNumber === 'number'
                ? n.computedIncomingNumber
                : (typeof n.incomingNumber === 'number' ? n.incomingNumber
                    : (typeof n.IncomingNumber === 'number' ? n.IncomingNumber : null));

            return {
                id: n.id,
                name: n.Name || n.name || n.id,
                incomingNumber,
                variable,
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
                avgCost,
                effectiveCost,
                computedIncomingNumber: computedIncoming,
                lastUpdate: n.lastUpdate || n.LastUpdate || '',
                nextUpdate: n.nextUpdate || n.NextUpdate || '',
                kPI: n.kPI || n.KPI || '',
                scheduleStart: n.scheduleStart || n.ScheduleStart || '',
                scheduleEnd: n.scheduleEnd || n.ScheduleEnd || '',
                frequency: n.frequency || n.Frequency || '',
                x: typeof n.x === 'number' ? n.x : 0,
                y: typeof n.y === 'number' ? n.y : 0
            };
        });

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
            // Generate variables from connection probabilities (preserving expressions)
            this.refreshGeneratedVariables();
            this.syncGeneratedVariableUsage();
        } else if (type === 'variables') {
            // Normalize variable values but preserve expressions
            const normalized = {};
            Object.entries(data || {}).forEach(([k, v]) => {
                if (v === null || v === undefined || v === '') {
                    return;
                }

                if (typeof v === 'number') {
                    normalized[k] = v;
                    return;
                }

                const trimmed = String(v).trim();
                if (!trimmed) {
                    return;
                }

                if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
                    normalized[k] = Number(trimmed);
                } else {
                    normalized[k] = trimmed;
                }
            });
            this.variables = normalized;
            // Regenerate variables with new values
            this.refreshGeneratedVariables();
            this.syncGeneratedVariableUsage();
        } else {
            console.warn('[updateFromTable] Unknown type:', type);
            return;
        }

        // Recompute derived values and sync to visualization state
    this.computeDerivedFields();
    this.syncTableDataToVisualization();
        this.updateVisualization();
        // Auto-save after edits
    dataLoader.saveToLocalStorage({
        elements: this.elements,
        connections: this.connections,
        variables: this.variables
    });
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
    this.refreshGeneratedVariables();
    this.syncGeneratedVariableUsage();
    const evaluationVariables = this.getEvaluationVariables();

        const mappedElements = this.elements.map(e => ({
            ...e,
            incomingVolume: e.incomingNumber ?? 0,
            nodeMultiplier: 1.0
        }));

        const mappedConnections = this.connections.map(c => {
            const clone = { ...c };
            const existingProbability = clone.probability;

            const hasExplicitProbability = existingProbability !== undefined && existingProbability !== null && !(typeof existingProbability === 'string' && existingProbability.trim() === '');

            if (!hasExplicitProbability) {
                const targetElement = this.elements.find(e => e.id === c.toId);
                if (targetElement && targetElement.variable !== undefined && targetElement.variable !== null && `${targetElement.variable}`.trim() !== '') {
                    clone.probability = targetElement.variable;
                } else {
                    delete clone.probability; // fallback to default 1.0 in computeDerivedFieldsData
                }
            }

            return clone;
        });

        console.log('🔄 Computing volumes with:', {
            elements: mappedElements.length,
            connections: mappedConnections.length,
            variables: Object.keys(evaluationVariables).length
        });

        // Compute the volumes
    computeDerivedFieldsData(mappedElements, mappedConnections, evaluationVariables);

        // Map the calculated volumes back to incomingNumber for display
        mappedElements.forEach((mapped, index) => {
            const element = this.elements[index];
            const computedVolume = Number.isFinite(mapped.computedVolumeIn)
                ? mapped.computedVolumeIn
                : resolveValue(mapped.incomingVolume ?? 0, evaluationVariables);

            const safeVolume = Number.isFinite(computedVolume) ? computedVolume : 0;
            const roundedVolume = Number.isFinite(safeVolume) ? Number(safeVolume.toFixed(2)) : 0;
            element.computedIncomingNumber = roundedVolume;

            const hasManualIncoming = typeof element.incomingNumber === 'string' && element.incomingNumber.trim() !== '';
            if (!hasManualIncoming) {
                element.incomingNumber = roundedVolume;
            }

            const resolvedAvgCost = resolveValue(element.avgCost ?? 0, evaluationVariables);
            element.resolvedAvgCost = resolvedAvgCost;

            const effectiveCost = resolvedAvgCost * roundedVolume;
            element.effectiveCost = Number.isFinite(effectiveCost)
                ? Number(effectiveCost.toFixed(2))
                : '';
        });

        if (typeof ui.updateElementComputedFields === 'function') {
            ui.updateElementComputedFields(this.elements);
        }

        console.log('✅ Volume calculation completed for', this.elements.length, 'elements');
    }

    /**
     * Syncs the table data (elements, connections, variables) to the visualization state.
     * This converts table format to the format expected by the visualization.
     */
    syncTableDataToVisualization() {
    this.refreshGeneratedVariables();
    this.syncGeneratedVariableUsage();
    const evaluationVariables = this.getEvaluationVariables();

        console.log('🔄 Syncing table data to visualization...', {
            elements: this.elements.length,
            connections: this.connections.length,
            variables: Object.keys(evaluationVariables).length
        });

        // Convert table data to visualization format using processData
        const sizingConfig = this.getProcessDataSizingConfig();
        const { nodes: vizNodes, links: vizLinks } = processData({
            nodes: this.elements,
            connections: this.connections,
            variables: this.variables
        }, sizingConfig, evaluationVariables);

        // Sanitize links against resolved node ids
        const idSet = new Set((vizNodes || []).map(n => n.id));
        const sanitizedLinks = (vizLinks || []).filter(l =>
            idSet.has(l.source?.id ?? l.source) && idSet.has(l.target?.id ?? l.target)
        );

        // Preserve existing node positions (x/y/fx/fy) across data edits
        const prevById = new Map((this.state.allNodes || []).map(n => [n.id, n]));
        const mergedNodes = (vizNodes || []).map(n => {
            const prev = prevById.get(n.id);
            if (prev && (typeof prev.x === 'number') && (typeof prev.y === 'number')) {
                return { ...n, x: prev.x, y: prev.y, fx: prev.fx ?? prev.x, fy: prev.fy ?? prev.y };
            }
            return n;
        });

        // Update visualization state
        this.state.allNodes = mergedNodes;
        this.state.allLinks = sanitizedLinks;
        this.state.nodes = [...this.state.allNodes];
        this.state.links = [...this.state.allLinks];

        this.refreshNodeSizing();

        console.log('✅ Synced to visualization:', {
            nodes: this.state.nodes.length,
            links: this.state.links.length
        });
    }

    /**
     * Refreshes the table displays with current data
     */
    refreshTables() {
        this.refreshGeneratedVariables();
        // Trigger table refresh through UI module
        if (typeof ui.refreshEditorData === 'function') {
            ui.refreshEditorData(this);
        }
    }

    getProcessDataSizingConfig() {
        return this.nodeSizingManager.getProcessDataSizingConfig();
    }

    getNodeValueForSizing(node, column) {
        return this.nodeSizingManager.getNodeValueForSizing(node, column);
    }

    recomputeNodeSizingExtents() {
        this.nodeSizingManager.recomputeNodeSizingExtents(this.state.allNodes);
        // Keep state in sync for backward compatibility
        this.state.nodeSizing = this.nodeSizingManager.getConfig();
    }

    applyNodeSizingToNodes(nodes) {
        this.nodeSizingManager.applyNodeSizingToNodes(nodes);
    }

    refreshNodeSizing() {
        this.nodeSizingManager.refreshNodeSizing(this.state.allNodes);
        // Keep state in sync for backward compatibility
        this.state.nodeSizing = this.nodeSizingManager.getConfig();
        if (this.state.nodes !== this.state.allNodes) {
            this.nodeSizingManager.applyNodeSizingToNodes(this.state.nodes);
        }
    }

    getSizeColumnDisplayName(columnId) {
        if (!columnId) return 'value';
        if (typeof ui.getNumericNodeColumns === 'function') {
            const columns = ui.getNumericNodeColumns();
            return this.nodeSizingManager.getSizeColumnDisplayName(columnId, columns);
        }
        return columnId;
    }

    /**
     * Handles the toggling of node sizing.
     * @param {boolean} enabled - Whether dynamic sizing should be enabled.
     */
    handleSizeToggle(enabled) {
        this.nodeSizingManager.setEnabled(!!enabled);
        // Keep state in sync for backward compatibility
        this.state.nodeSizing = this.nodeSizingManager.getConfig();
        
        ui.updateSizeControlUI?.(this.state.nodeSizing);
        this.refreshNodeSizing();
        this.updateVisualization();

        const columnName = this.getSizeColumnDisplayName(this.nodeSizingManager.getConfig().column);
        showStatus(enabled ? `Scaling nodes by ${columnName}` : 'Uniform sizing enabled', 'info');
    }

    handleSizeColumnChange(columnId) {
        const numericColumns = typeof ui.getNumericNodeColumns === 'function'
            ? ui.getNumericNodeColumns()
            : [];

        let resolvedColumn = columnId || this.nodeSizingManager.getConfig().column;
        if (!resolvedColumn && numericColumns.length > 0) {
            resolvedColumn = numericColumns[0].id;
        }

        this.nodeSizingManager.setColumn(resolvedColumn);
        // Keep state in sync for backward compatibility
        this.state.nodeSizing = this.nodeSizingManager.getConfig();
        
        ui.updateSizeControlUI?.(this.state.nodeSizing, numericColumns);

        this.refreshNodeSizing();
        this.updateVisualization();

        if (resolvedColumn) {
            const columnName = this.getSizeColumnDisplayName(resolvedColumn);
            showStatus(`Scaling nodes by ${columnName}`, 'info');
        } else {
            showStatus('Uniform sizing enabled', 'info');
        }
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
            this.gridManager.setVisible(false);
            const gridConfig = this.gridManager.getConfig();
            updateGridDisplay(this.state.svg, gridConfig.showGrid, this.state.width, this.state.height, gridConfig.gridSize);
            ui.updateGridUI(gridConfig.showGrid);
        }
        this.updateVisualization();
        showStatus(`Layout changed to ${layoutType}`, 'info');
    }

    /**
     * Toggles the visibility of the grid overlay.
     */
    toggleGrid() {
        this.gridManager.toggleGrid();
        const gridConfig = this.gridManager.getConfig();
        updateGridDisplay(this.state.svg, gridConfig.showGrid, this.state.width, this.state.height, gridConfig.gridSize);
        ui.updateGridUI(gridConfig.showGrid);
    }

    /**
     * Snaps all nodes to the nearest grid lines.
     */
    snapAllToGrid() {
        this.gridManager.snapAllToGrid(this.state.nodes);
        updatePositions(this.state.g);
        showStatus('All nodes snapped to grid', 'info');
    }

    /**
     * Updates the size of the grid.
     * @param {number} newSize - The new size for the grid cells.
     */
    updateGridSize(newSize) {
        this.gridManager.updateGridSize(newSize);
        const gridConfig = this.gridManager.getConfig();
        ui.updateGridSizeLabel(newSize);
        if (gridConfig.showGrid) {
            updateGridDisplay(this.state.svg, gridConfig.showGrid, this.state.width, this.state.height, gridConfig.gridSize);
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
        graphTransforms.centerGraph(this.state);
        updateTextRotation(this.state.g, this.state.graphRotation, this.state.graphTransform);
        showStatus('View reset', 'success');
    }
}