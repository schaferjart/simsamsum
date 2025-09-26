import * as d3 from 'd3';
import { showStatus, calculateNodeSize, downloadJsonFile, snapToGrid } from './utils.js';
import { sampleData, processData, parseCSV, verifyConnections } from './data.js';
import { initVisualization, renderVisualizationElements, updatePositions, highlightNode, clearHighlight, updateTextRotation, updateGridDisplay } from './render.js';
import { applyLayout } from './layouts.js';
import * as interactions from './interactions.js';
import * as ui from './ui.js';
import { exportToPDF } from './export.js';

class WorkflowVisualizer {
    constructor() {
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
            currentLayout: 'force',
            graphRotation: 0,
            graphTransform: { scaleX: 1, scaleY: 1 },
            gridSize: 50,
            showGrid: false,
            currentDataFile: 'sample-data.csv'
        };

        this.init();
    }

    init() {
        const container = document.getElementById('networkGraph');
        if (!container) return;

        const { svg, zoomGroup, g, zoom, width, height } = initVisualization(
            container,
            (event) => interactions.handleZoom(event, this.state.zoomGroup),
            () => ui.hideDetailsPanel()
        );

        this.state.svg = svg;
        this.state.zoomGroup = zoomGroup;
        this.state.g = g;
        this.state.zoom = zoom;
        this.state.width = width;
        this.state.height = height;

        ui.bindEventListeners(this.getEventHandlers());
        ui.hideDetailsPanel();
        this.loadSampleData();
    }

    getEventHandlers() {
        return {
            handleFileSelect: (e) => {
                const fileName = e.target.files[0]?.name || 'No file selected';
                showStatus(`Selected: ${fileName}`, 'info');
            },
            handleFileUpload: () => this.handleFileUpload(),
            handleSampleData: () => this.loadSampleData(),
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

    updateVisualization() {
        console.log('Updating visualization with nodes:', this.state.nodes.length, 'links:', this.state.links.length);
        if (this.state.nodes.length === 0) {
            showStatus('No data to display', 'info');
        }

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
                dragStarted: (event, d) => interactions.dragStarted(event, d, this.state.simulation, this.state.currentLayout),
                dragged: (event, d) => {
                    interactions.dragged(event, d, this.state.currentLayout, this.state.gridSize)
                    updatePositions(this.state.g);
                },
                dragEnded: (event, d) => interactions.dragEnded(event, d, this.state.simulation, this.state.currentLayout),
                nodeClicked: (event, d) => {
                    event.stopPropagation();
                    ui.showNodeDetails(d);
                },
                nodeMouseOver: (event, d) => highlightNode(this.state.g, d, this.state.links),
                nodeMouseOut: () => clearHighlight(this.state.g)
            }
        );
        updatePositions(this.state.g);
    }

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

    loadSampleData() {
        showStatus('Loading sample data...', 'loading');
        this.state.currentDataFile = 'sample-data.csv';
        const { nodes, links } = processData(sampleData, this.state.costBasedSizing);
        this.state.allNodes = nodes;
        this.state.allLinks = links;
        this.state.nodes = [...this.state.allNodes];
        this.state.links = [...this.state.allLinks];
        this.updateVisualization();
        showStatus('Sample data loaded!', 'success');
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
        ui.toggleGridControls(layoutType === 'manual-grid');
        if (layoutType !== 'manual-grid') {
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

    saveCurrentLayout() {
        const layoutData = {
            timestamp: new Date().toISOString(),
            gridSize: this.state.gridSize,
            dataFile: this.state.currentDataFile,
            nodeCount: this.state.nodes.length,
            positions: {}
        };
        this.state.nodes.forEach(node => {
            layoutData.positions[node.id] = { x: node.x, y: node.y, name: node.Name || node.id };
        });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const baseFileName = this.state.currentDataFile ? this.state.currentDataFile.replace('.csv', '') : 'workflow';
        const fileName = `${baseFileName}_layout_${timestamp}.json`;
        downloadJsonFile(layoutData, fileName);
        showStatus(`Layout saved as "${fileName}"`, 'success');
    }

    loadSavedLayout() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const layoutData = JSON.parse(e.target.result);
                    if (layoutData && layoutData.positions) {
                        let loadedCount = 0;
                        if (layoutData.gridSize) {
                            this.updateGridSize(layoutData.gridSize);
                            document.getElementById('gridSizeSlider').value = layoutData.gridSize;
                        }
                        this.state.nodes.forEach(node => {
                            if (layoutData.positions[node.id]) {
                                const pos = layoutData.positions[node.id];
                                node.x = pos.x;
                                node.y = pos.y;
                                node.fx = pos.x;
                                node.fy = pos.y;
                                loadedCount++;
                            }
                        });
                        updatePositions(this.state.g);
                        showStatus(`Loaded layout from "${file.name}" (${loadedCount}/${this.state.nodes.length} nodes positioned)`, 'success');
                    } else {
                        showStatus('Invalid layout file format', 'error');
                    }
                } catch (error) {
                    showStatus('Error loading layout file', 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
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

export function initializeApp() {
    new WorkflowVisualizer();
}