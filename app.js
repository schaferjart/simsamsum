class WorkflowVisualizer {
    constructor() {
        this.width = 0;
        this.height = 0;
        this.svg = null;
        this.zoomGroup = null; // Group for zoom transforms
        this.g = null; // Group for rotation/flip transforms
        this.simulation = null;
        this.nodes = [];
        this.links = [];
        this.allNodes = [];
        this.allLinks = [];
        this.zoom = null;
        this.costBasedSizing = true; // Toggle for cost-based sizing
        this.currentLayout = 'force'; // Current layout type
        this.graphRotation = 0; // Current rotation angle
        this.graphTransform = { scaleX: 1, scaleY: 1 }; // Flip transforms
        this.gridSize = 50; // Grid snap size
        this.showGrid = false; // Show grid overlay
        this.savedPositions = {}; // Saved node positions

        this.init();
        this.bindEvents();
    }

    init() {
        // Sample data from the provided JSON with special column names
        this.sampleData = [
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

        this.initVisualization();
        this.initUI();
    }

    initUI() {
        // Ensure details panel starts hidden
        this.hideDetailsPanel();
    }

    bindEvents() {
        // File input change event
        document.getElementById('csvFile').addEventListener('change', (e) => {
            const fileName = e.target.files[0]?.name || 'No file selected';
            this.showStatus(`Selected: ${fileName}`, 'info');
        });

        // Upload button click
        document.getElementById('uploadBtn').addEventListener('click', () => this.handleFileUpload());
        
        // Sample data button click
        document.getElementById('sampleBtn').addEventListener('click', () => this.loadSampleData());
        
        // Search input
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // Filter dropdowns
        document.getElementById('typeFilter').addEventListener('change', () => this.applyFilters());
        document.getElementById('executionFilter').addEventListener('change', () => this.applyFilters());
        
        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => this.resetView());
        
        // Verify connections button
        document.getElementById('verifyBtn').addEventListener('click', () => this.showConnectionReport());
        
        // Export PDF button
        document.getElementById('exportPdfBtn').addEventListener('click', () => this.exportToPDF());
        
        // Size toggle
        document.getElementById('sizeToggle').addEventListener('change', (e) => this.handleSizeToggle(e.target.checked));
        
        // Layout selection
        document.getElementById('layoutSelect').addEventListener('change', (e) => this.handleLayoutChange(e.target.value));
        
        // Grid controls
        document.getElementById('showGridBtn').addEventListener('click', () => this.toggleGrid());
        document.getElementById('snapToGridBtn').addEventListener('click', () => this.snapAllToGrid());
        document.getElementById('savePositionsBtn').addEventListener('click', () => this.saveCurrentLayout());
        document.getElementById('loadPositionsBtn').addEventListener('click', () => this.loadSavedLayout());
        document.getElementById('gridSizeSlider').addEventListener('input', (e) => this.updateGridSize(parseInt(e.target.value)));
        
        // Orientation controls
        document.getElementById('rotateLeftBtn').addEventListener('click', () => this.rotateGraph(-90));
        document.getElementById('rotateRightBtn').addEventListener('click', () => this.rotateGraph(90));
        document.getElementById('flipHorizontalBtn').addEventListener('click', () => this.flipGraph('horizontal'));
        document.getElementById('flipVerticalBtn').addEventListener('click', () => this.flipGraph('vertical'));
        document.getElementById('centerGraphBtn').addEventListener('click', () => this.centerGraph());
        document.getElementById('fitToScreenBtn').addEventListener('click', () => this.fitToScreen());
        
        // Close panel button
        document.getElementById('closePanelBtn').addEventListener('click', () => this.hideDetailsPanel());

        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    initVisualization() {
        const container = document.getElementById('networkGraph');
        this.width = container.clientWidth;
        this.height = container.clientHeight;

        // Clear any existing SVG
        d3.select('#networkGraph').select('svg').remove();

        this.svg = d3.select('#networkGraph')
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height);

        // Define arrow markers
        this.svg.append('defs').selectAll('marker')
            .data(['arrowhead'])
            .enter().append('marker')
            .attr('id', d => d)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#626c7c');

        // Setup zoom
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.zoomGroup.attr('transform', event.transform);
            });

        this.svg.call(this.zoom);
        
        // Add background click handler to close details panel
        this.svg.on('click', (event) => {
            // Only close if clicking on background (not on nodes)
            if (event.target === event.currentTarget) {
                this.hideDetailsPanel();
            }
        });
        
        // Create nested group structure: zoom group -> transform group -> content
        this.zoomGroup = this.svg.append('g');
        this.g = this.zoomGroup.append('g'); // This will handle rotations and flips

        // Add zoom controls
        this.addZoomControls();
    }

    addZoomControls() {
        // Remove existing zoom controls
        d3.select('#networkGraph').select('.zoom-controls').remove();

        const controls = d3.select('#networkGraph')
            .append('div')
            .attr('class', 'zoom-controls');

        controls.append('button')
            .attr('class', 'zoom-btn')
            .text('+')
            .on('click', () => {
                this.svg.transition().duration(300).call(this.zoom.scaleBy, 1.5);
            });

        controls.append('button')
            .attr('class', 'zoom-btn')
            .text('−')
            .on('click', () => {
                this.svg.transition().duration(300).call(this.zoom.scaleBy, 1 / 1.5);
            });

        controls.append('button')
            .attr('class', 'zoom-btn')
            .text('⌂')
            .on('click', () => {
                this.svg.transition().duration(500).call(this.zoom.transform, d3.zoomIdentity);
            });
    }

    handleResize() {
        const container = document.getElementById('networkGraph');
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        
        this.svg.attr('width', this.width).attr('height', this.height);
        
        if (this.simulation) {
            this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
            this.simulation.alpha(0.3).restart();
        }
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('statusMessage');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }, 4000);
        }
    }

    handleSizeToggle(enabled) {
        this.costBasedSizing = enabled;
        
        // Recalculate sizes for all nodes
        this.allNodes.forEach(node => {
            node.size = this.calculateNodeSize(node.costValue);
        });
        
        // Update current filtered nodes
        this.nodes.forEach(node => {
            node.size = this.calculateNodeSize(node.costValue);
        });
        
        // Re-render the visualization if there are nodes
        if (this.nodes.length > 0) {
            this.updateVisualization();
        }
        
        this.showStatus(enabled ? 'Cost-based sizing enabled' : 'Uniform sizing enabled', 'info');
    }

    handleLayoutChange(layoutType) {
        this.currentLayout = layoutType;
        
        // Show/hide grid controls
        const gridControls = document.getElementById('gridControls');
        if (layoutType === 'manual-grid') {
            gridControls.style.display = 'block';
        } else {
            gridControls.style.display = 'none';
            // Hide grid when switching away from manual mode
            this.showGrid = false;
            this.updateGridDisplay();
        }
        
        if (this.nodes.length > 0) {
            // Stop any existing simulation first
            if (this.simulation) {
                this.simulation.stop();
            }
            
            // Clear existing visualization and apply new layout
            this.g.selectAll("*").remove();
            this.applyLayout(layoutType);
            
            // Re-render the visualization elements
            this.renderVisualizationElements();
        }
        
        this.showStatus(`Layout changed to ${layoutType}`, 'info');
    }

    verifyConnections() {
        const report = {
            totalNodes: this.allNodes.length,
            totalLinks: this.allLinks.length,
            brokenConnections: [],
            orphanedNodes: [],
            deadEndNodes: [],
            connectionSummary: {},
            validationErrors: []
        };

        console.log('🔍 Starting connection verification...');

        // Create lookup maps for efficient searching
        const nodeMap = new Map();
        this.allNodes.forEach(node => {
            nodeMap.set(node.Name, node);
        });

        // Verify each node's connections
        this.allNodes.forEach(node => {
            const nodeConnections = {
                name: node.Name,
                incoming: [],
                outgoing: [],
                incomingCount: 0,
                outgoingCount: 0,
                brokenIncoming: [],
                brokenOutgoing: []
            };

            // Check incoming connections
            if (node.Incoming && node.Incoming.trim()) {
                const incomingNodes = node.Incoming.split(',').map(s => s.trim()).filter(s => s);
                incomingNodes.forEach(incomingName => {
                    if (nodeMap.has(incomingName)) {
                        nodeConnections.incoming.push(incomingName);
                        nodeConnections.incomingCount++;
                    } else {
                        nodeConnections.brokenIncoming.push(incomingName);
                        report.brokenConnections.push({
                            from: incomingName,
                            to: node.Name,
                            error: `Incoming connection references non-existent node: "${incomingName}"`
                        });
                    }
                });
            }

            // Check multiple outgoing connections (new format)
            for (let i = 1; i <= 5; i++) {
                const outgoingKey = `Outgoing${i}`;
                const varKey = `VarO${i}`;
                
                if (node[outgoingKey] && node[outgoingKey].trim()) {
                    const outgoingName = node[outgoingKey].trim();
                    const probability = node[varKey] || 'N/A';
                    
                    if (nodeMap.has(outgoingName)) {
                        nodeConnections.outgoing.push({
                            name: outgoingName,
                            probability: probability
                        });
                        nodeConnections.outgoingCount++;
                    } else {
                        nodeConnections.brokenOutgoing.push({
                            name: outgoingName,
                            probability: probability
                        });
                        report.brokenConnections.push({
                            from: node.Name,
                            to: outgoingName,
                            error: `Outgoing connection references non-existent node: "${outgoingName}"`
                        });
                    }
                }
            }

            // Check for orphaned nodes (no incoming connections)
            if (nodeConnections.incomingCount === 0 && node.Name !== 'Indeed') { // Indeed is likely a starting point
                report.orphanedNodes.push({
                    name: node.Name,
                    type: node.Type,
                    issue: 'No incoming connections'
                });
            }

            // Check for dead-end nodes (no outgoing connections)
            if (nodeConnections.outgoingCount === 0) {
                report.deadEndNodes.push({
                    name: node.Name,
                    type: node.Type,
                    issue: 'No outgoing connections'
                });
            }

            report.connectionSummary[node.Name] = nodeConnections;
        });

        // Verify bidirectional consistency
        this.verifyBidirectionalConnections(report, nodeMap);

        // Generate summary statistics
        this.generateConnectionStats(report);

        console.log('✅ Connection verification completed');
        console.log('📊 Verification Report:', report);

        return report;
    }

    verifyBidirectionalConnections(report, nodeMap) {
        console.log('🔗 Verifying bidirectional consistency...');
        
        Object.values(report.connectionSummary).forEach(nodeConn => {
            // For each outgoing connection, verify the target has this node as incoming
            nodeConn.outgoing.forEach(outgoing => {
                const targetNode = nodeMap.get(outgoing.name);
                if (targetNode) {
                    const targetIncoming = targetNode.Incoming ? 
                        targetNode.Incoming.split(',').map(s => s.trim()) : [];
                    
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

    generateConnectionStats(report) {
        const stats = {
            nodesWithIncoming: 0,
            nodesWithOutgoing: 0,
            nodesWithBoth: 0,
            averageIncoming: 0,
            averageOutgoing: 0,
            maxIncoming: 0,
            maxOutgoing: 0
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

        stats.averageIncoming = totalIncoming / report.totalNodes;
        stats.averageOutgoing = totalOutgoing / report.totalNodes;

        report.statistics = stats;
    }

    showConnectionReport() {
        const report = this.verifyConnections();
        
        // Create a detailed status message
        let message = `📊 Connection Report:\n`;
        message += `• Total Nodes: ${report.totalNodes}\n`;
        message += `• Total Links: ${report.totalLinks}\n`;
        message += `• Broken Connections: ${report.brokenConnections.length}\n`;
        message += `• Orphaned Nodes: ${report.orphanedNodes.length}\n`;
        message += `• Dead-end Nodes: ${report.deadEndNodes.length}\n`;
        message += `• Validation Errors: ${report.validationErrors.length}`;

        if (report.brokenConnections.length > 0 || report.validationErrors.length > 0) {
            this.showStatus('Connection issues found - check console for details', 'error');
            console.warn('❌ Connection Issues Found:');
            report.brokenConnections.forEach(issue => console.warn('  -', issue.error));
            report.validationErrors.forEach(issue => console.warn('  -', issue.error));
        } else {
            this.showStatus('All connections verified successfully!', 'success');
        }

        return report;
    }

    async exportToPDF() {
        try {
            this.showStatus('Preparing PDF export...', 'loading');
            
            // Get the network graph container
            const networkGraph = document.getElementById('networkGraph');
            if (!networkGraph || this.nodes.length === 0) {
                this.showStatus('No visualization to export', 'error');
                return;
            }

            // Temporarily hide UI elements that shouldn't be in the PDF
            const elementsToHide = [
                '.zoom-controls',
                '.legend',
                '.controls-panel',
                '#detailsPanel'
            ];
            
            const hiddenElements = [];
            elementsToHide.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el.style.display !== 'none') {
                        hiddenElements.push({ element: el, originalDisplay: el.style.display });
                        el.style.display = 'none';
                    }
                });
            });

            // Create a clone of the visualization for PDF export
            await this.createPDFExport(networkGraph);

            // Restore hidden elements
            hiddenElements.forEach(({ element, originalDisplay }) => {
                element.style.display = originalDisplay;
            });

            this.showStatus('PDF exported successfully!', 'success');
            
        } catch (error) {
            console.error('PDF export error:', error);
            this.showStatus('Error exporting PDF', 'error');
        }
    }

    async createPDFExport(networkGraph) {
        // Create a temporary container for the PDF export
        const exportContainer = document.createElement('div');
        exportContainer.style.cssText = `
            position: fixed;
            top: -10000px;
            left: -10000px;
            width: 1600px;
            height: 1200px;
            background: white;
            padding: 20px;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(exportContainer);

        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            text-align: center;
            margin-bottom: 20px;
            font-size: 24px;
            font-weight: bold;
            color: #333;
        `;
        header.textContent = 'Workflow Visualization';
        exportContainer.appendChild(header);

        // Create metadata section
        const metadata = document.createElement('div');
        metadata.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 12px;
            color: #666;
        `;
        
        const leftMeta = document.createElement('div');
        leftMeta.innerHTML = `
            <div>Total Nodes: ${this.nodes.length}</div>
            <div>Total Links: ${this.links.length}</div>
            <div>Layout: ${this.currentLayout}</div>
        `;
        
        const rightMeta = document.createElement('div');
        rightMeta.innerHTML = `
            <div>Export Date: ${new Date().toLocaleDateString()}</div>
            <div>Export Time: ${new Date().toLocaleTimeString()}</div>
        `;
        
        metadata.appendChild(leftMeta);
        metadata.appendChild(rightMeta);
        exportContainer.appendChild(metadata);

        // Clone and prepare the SVG for export
        const svgElement = networkGraph.querySelector('svg');
        if (svgElement) {
            const svgClone = svgElement.cloneNode(true);
            
            // Get the actual viewBox or calculate dimensions to fit all content
            const bbox = svgElement.getBBox();
            const margin = 50;
            const width = Math.max(1160, bbox.width + margin * 2);
            const height = Math.max(700, bbox.height + margin * 2);
            
            // Set dimensions to capture full content
            svgClone.setAttribute('width', width);
            svgClone.setAttribute('height', height);
            svgClone.setAttribute('viewBox', `${bbox.x - margin} ${bbox.y - margin} ${width} ${height}`);
            svgClone.style.border = '1px solid #ddd';
            svgClone.style.backgroundColor = 'white';
            
            // Ensure all text is visible and properly styled
            const textElements = svgClone.querySelectorAll('text');
            textElements.forEach(text => {
                text.style.fill = '#333';
                text.style.fontSize = text.style.fontSize || '12px';
            });

            exportContainer.appendChild(svgClone);
        }

        // Convert to canvas using html2canvas
        const canvas = await html2canvas(exportContainer, {
            width: 1200,
            height: 800,
            scale: 2, // Higher resolution
            backgroundColor: 'white',
            logging: false,
            useCORS: true
        });

        // Create PDF using jsPDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Calculate dimensions to fit A4 landscape (297x210 mm)
        const pageWidth = 297;
        const pageHeight = 210;
        const aspectRatio = canvas.width / canvas.height;
        
        let imgWidth, imgHeight;
        
        if (aspectRatio > pageWidth / pageHeight) {
            // Image is wider, fit to width
            imgWidth = pageWidth;
            imgHeight = pageWidth / aspectRatio;
        } else {
            // Image is taller, fit to height
            imgHeight = pageHeight;
            imgWidth = pageHeight * aspectRatio;
        }
        
        // Center the image on the page
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        
        // Add the canvas image to PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const filename = `workflow-visualization-${timestamp}.pdf`;
        
        // Save the PDF
        pdf.save(filename);

        // Clean up
        document.body.removeChild(exportContainer);
    }

    applyLayout(layoutType) {
        console.log(`🎨 Applying layout: ${layoutType}`);
        console.log('Available nodes:', this.nodes ? this.nodes.length : 'undefined');
        
        this.currentLayout = layoutType; // Set the current layout
        
        // Hide grid controls by default
        const gridControls = document.getElementById('gridControls');
        if (gridControls) {
            gridControls.style.display = 'none';
        }
        
        if (this.simulation) {
            this.simulation.stop();
        }

        switch (layoutType) {
            case 'force':
                this.applyForceLayout();
                break;
            case 'hierarchical':
                this.applyHierarchicalLayout();
                break;
            case 'hierarchical-orthogonal':
                this.applyHierarchicalOrthogonalLayout();
                break;
            case 'manual-grid':
                try {
                    console.log('Calling applyManualGridLayout...');
                    this.applyManualGridLayout();
                } catch (error) {
                    console.error('Error in manual grid layout:', error);
                }
                break;
            case 'circular':
                this.applyCircularLayout();
                break;
            case 'grid':
                this.applyGridLayout();
                break;
        }
    }

    applyForceLayout() {
        // Reset to original force-directed layout
        this.simulation = d3.forceSimulation(this.nodes)
            .force('link', d3.forceLink(this.links).id(d => d.id).distance(150).strength(0.8))
            .force('charge', d3.forceManyBody().strength(-600))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 10));

        this.simulation.on('tick', () => this.updatePositions());
        this.simulation.alpha(1).restart();
    }

    applyHierarchicalLayout() {
        // Create a hierarchical layout based on incoming/outgoing relationships
        const levels = this.calculateNodeLevels();
        const maxLevel = Math.max(...Object.values(levels));
        
        // SPACING CONTROLS - Square grid layout with increased padding
        const gridPadding = 150;            // Uniform padding around entire graph
        const gridCellSize = 200;           // Square cell size for grid spacing
        const collisionPadding = 40;        // Extra space around nodes for collision detection
        
        // Calculate grid dimensions for square spacing
        const availableWidth = this.width - (gridPadding * 2);
        const availableHeight = this.height - (gridPadding * 2);
        
        // Ensure square grid cells by using the minimum available space
        const effectiveGridSize = Math.min(
            availableWidth / Math.max(...Object.values(levels).map(level => 
                Object.values(levels).filter(l => l === level).length
            )),
            availableHeight / (maxLevel + 1)
        );
        
        // Use the larger of our minimum grid size or calculated size
        const finalGridSize = Math.max(gridCellSize, effectiveGridSize);
        
        const levelCounts = {};
        
        // Count nodes per level
        Object.values(levels).forEach(level => {
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        });

        // Position nodes in square grid
        const levelPositions = {};
        this.nodes.forEach(node => {
            const level = levels[node.id] || 0;
            levelPositions[level] = (levelPositions[level] || 0) + 1;
            
            // Calculate square grid positions
            const levelWidth = levelCounts[level] * finalGridSize;
            const levelStartX = (this.width - levelWidth) / 2; // Center the level horizontally
            
            node.fx = levelStartX + (levelPositions[level] - 0.5) * finalGridSize;
            node.fy = gridPadding + level * finalGridSize;
        });

        // Create a simple simulation to handle collisions with square grid spacing
        this.simulation = d3.forceSimulation(this.nodes)
            .force('collision', d3.forceCollide().radius(d => d.size + collisionPadding))
            .alpha(0.3);

        this.simulation.on('tick', () => this.updatePositions());
    }

    applyHierarchicalOrthogonalLayout() {
        // Advanced hierarchical layout using Sugiyama algorithm principles
        console.log('🎯 Starting advanced hierarchical orthogonal layout...');
        
        // Step 1: Build proper hierarchy with branching support
        const hierarchy = this.buildAdvancedHierarchy();
        console.log('📊 Hierarchy built:', hierarchy);
        
        // Step 2: Apply intelligent positioning
        this.positionNodesInHierarchy(hierarchy);
        
        // Step 3: Minimize edge crossings (basic implementation)
        this.minimizeEdgeCrossings(hierarchy);
        
        // Step 4: Apply final positions
        this.applyHierarchicalPositions(hierarchy);
        
        // No simulation needed - positions are set directly
        console.log('✅ Hierarchical orthogonal layout complete - no further updates needed');
    }

    buildAdvancedHierarchy() {
        const hierarchy = {
            levels: {},
            nodesByLevel: {},
            maxLevel: 0,
            connections: new Map()
        };
        
        // Build connection map
        this.links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            
            if (!hierarchy.connections.has(sourceId)) {
                hierarchy.connections.set(sourceId, []);
            }
            hierarchy.connections.get(sourceId).push({
                target: targetId,
                probability: link.probability || 1.0
            });
        });
        
        // Find true root nodes (no incoming connections)
        const rootNodes = this.nodes.filter(node => 
            !this.links.some(link => (link.target.id || link.target) === node.id)
        );
        
        console.log('🌳 Root nodes found:', rootNodes.map(n => n.Name));
        
        // BFS with branching awareness
        const queue = rootNodes.map(node => ({ node, level: 0, branch: 0 }));
        const processed = new Set();
        
        while (queue.length > 0) {
            const { node, level, branch } = queue.shift();
            
            if (processed.has(node.id)) continue;
            processed.add(node.id);
            
            // Assign to level
            hierarchy.levels[node.id] = level;
            if (!hierarchy.nodesByLevel[level]) hierarchy.nodesByLevel[level] = [];
            hierarchy.nodesByLevel[level].push({ node, branch });
            
            hierarchy.maxLevel = Math.max(hierarchy.maxLevel, level);
            
            // Process children
            const connections = hierarchy.connections.get(node.id) || [];
            connections.forEach((conn, index) => {
                const targetNode = this.nodes.find(n => n.id === conn.target);
                if (targetNode && !processed.has(conn.target)) {
                    queue.push({ 
                        node: targetNode, 
                        level: level + 1, 
                        branch: index // Track which branch this is
                    });
                }
            });
        }
        
        return hierarchy;
    }

    positionNodesInHierarchy(hierarchy) {
        const spacing = {
            vertical: 200,    // Between levels
            horizontal: 300,  // Between nodes at same level
            branchOffset: 100 // Extra space for branches
        };
        
        const topPadding = 80;
        
        // Position each level
        Object.keys(hierarchy.nodesByLevel).forEach(levelStr => {
            const level = parseInt(levelStr);
            const levelNodes = hierarchy.nodesByLevel[level];
            const y = topPadding + level * spacing.vertical;
            
            if (levelNodes.length === 1) {
                // Single node - center it
                const { node } = levelNodes[0];
                node.fx = this.width / 2;
                node.fy = y;
                node.x = node.fx;
                node.y = node.fy;
            } else {
                // Multiple nodes - distribute intelligently
                this.distributeNodesAtLevel(levelNodes, y, spacing, hierarchy, level);
            }
        });
    }

    distributeNodesAtLevel(levelNodes, y, spacing, hierarchy, level) {
        // Sort nodes by their parent's position to minimize crossings
        if (level > 0) {
            levelNodes.sort((a, b) => {
                const aParentX = this.getParentAverageX(a.node, hierarchy);
                const bParentX = this.getParentAverageX(b.node, hierarchy);
                return aParentX - bParentX;
            });
        }
        
        // Adaptive spacing that fits the viewport better
        const maxNodes = Math.max(...Object.values(hierarchy.nodesByLevel).map(nodes => nodes.length));
        const adaptiveSpacing = Math.min(spacing.horizontal, (this.width - 200) / maxNodes);
        const minSpacing = 150; // Minimum spacing to keep readable
        const finalSpacing = Math.max(minSpacing, adaptiveSpacing);
        
        // Calculate total width needed
        const totalWidth = (levelNodes.length - 1) * finalSpacing;
        
        // Center the level within viewport
        const startX = Math.max(100, (this.width - totalWidth) / 2);
        
        levelNodes.forEach(({ node, branch }, index) => {
            node.fx = startX + (index * finalSpacing);
            node.fy = y;
            node.x = node.fx;
            node.y = node.fy;
            
            // Position set successfully
        });
    }

    getParentAverageX(node, hierarchy) {
        const parents = this.links
            .filter(link => (link.target.id || link.target) === node.id)
            .map(link => this.nodes.find(n => n.id === (link.source.id || link.source)))
            .filter(parent => parent && parent.x !== undefined);
        
        if (parents.length === 0) return this.width / 2;
        
        const avgX = parents.reduce((sum, parent) => sum + parent.x, 0) / parents.length;
        return avgX;
    }

    calculateBranchAdjustments(levelNodes) {
        let adjustments = 0;
        for (let i = 0; i < levelNodes.length - 1; i++) {
            if (levelNodes[i].branch !== levelNodes[i + 1].branch) {
                adjustments += 100; // Extra space between different branches
            }
        }
        return adjustments;
    }

    minimizeEdgeCrossings(hierarchy) {
        // Simple crossing reduction using barycenter method
        for (let level = 1; level <= hierarchy.maxLevel; level++) {
            const levelNodes = hierarchy.nodesByLevel[level];
            if (!levelNodes || levelNodes.length <= 1) continue;
            
            // Calculate barycenter for each node
            levelNodes.forEach(({ node }) => {
                const parents = this.links
                    .filter(link => (link.target.id || link.target) === node.id)
                    .map(link => this.nodes.find(n => n.id === (link.source.id || link.source)))
                    .filter(parent => parent);
                
                if (parents.length > 0) {
                    node.barycenter = parents.reduce((sum, parent) => sum + parent.x, 0) / parents.length;
                } else {
                    node.barycenter = node.x;
                }
            });
            
            // Sort by barycenter and reposition
            levelNodes.sort((a, b) => a.node.barycenter - b.node.barycenter);
            
            // Reposition with maintained spacing
            const spacing = 300;
            const totalWidth = (levelNodes.length - 1) * spacing;
            const startX = Math.max(100, (this.width - totalWidth) / 2);
            
            levelNodes.forEach(({ node }, index) => {
                node.fx = startX + (index * spacing);
                node.x = node.fx;
            });
        }
    }

    applyHierarchicalPositions(hierarchy) {
        // Final position application with automatic viewport fitting
        this.nodes.forEach(node => {
            node.fx = node.x;
            node.fy = node.y;
        });
        
        // Auto-fit to screen for orthogonal layout
        if (this.currentLayout === 'hierarchical-orthogonal') {
            setTimeout(() => {
                this.fitToScreen();
            }, 100);
        }
        
        console.log('✅ Hierarchical positioning complete');
    }

    buildConnectionMatrix() {
        const matrix = {};
        this.links.forEach(link => {
            const sourceId = link.source.id || link.source;
            const targetId = link.target.id || link.target;
            if (!matrix[sourceId]) matrix[sourceId] = [];
            matrix[sourceId].push(targetId);
        });
        return matrix;
    }

    getConnectionWeights(node, previousLevelNodes) {
        let weight = 0;
        const connections = this.links.filter(link => 
            (link.target.id || link.target) === node.id
        );
        
        connections.forEach(conn => {
            const sourceId = conn.source.id || conn.source;
            const sourceIndex = previousLevelNodes.findIndex(n => n.id === sourceId);
            if (sourceIndex >= 0) {
                weight += sourceIndex;
            }
        });
        
        return weight;
    }

    calculateMaxConnectionSpread(nodesInLevel, levelNum) {
        let maxSpread = 0;
        
        nodesInLevel.forEach(node => {
            const connections = this.links.filter(link => 
                (link.source.id || link.source) === node.id ||
                (link.target.id || link.target) === node.id
            );
            
            if (connections.length > maxSpread) {
                maxSpread = connections.length;
            }
        });
        
        return maxSpread;
    }

    applyCircularLayout() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) / 3;
        
        this.nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / this.nodes.length;
            node.fx = centerX + radius * Math.cos(angle);
            node.fy = centerY + radius * Math.sin(angle);
        });

        // Simple simulation for collision handling
        this.simulation = d3.forceSimulation(this.nodes)
            .force('collision', d3.forceCollide().radius(d => d.size + 10))
            .alpha(0.3);

        this.simulation.on('tick', () => this.updatePositions());
    }

    applyGridLayout() {
        const cols = Math.ceil(Math.sqrt(this.nodes.length));
        const rows = Math.ceil(this.nodes.length / cols);
        
        const cellWidth = (this.width - 100) / cols;
        const cellHeight = (this.height - 100) / rows;
        
        this.nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            node.fx = 50 + cellWidth * (col + 0.5);
            node.fy = 50 + cellHeight * (row + 0.5);
        });

        // Simple simulation for fine positioning
        this.simulation = d3.forceSimulation(this.nodes)
            .force('collision', d3.forceCollide().radius(d => d.size + 10))
            .alpha(0.3);

        this.simulation.on('tick', () => this.updatePositions());
    }

    applyManualGridLayout() {
        // Manual layout with grid snapping
        console.log('🎯 Applying manual grid layout...');
        console.log('Current nodes:', this.nodes.length);
        console.log('Current gridSize:', this.gridSize);
        
        // Check if we have saved positions for these nodes
        const hasSavedPositions = this.loadSavedLayout(false); // Don't show status
        console.log('Has saved positions:', hasSavedPositions);
        
        // Always initialize layout to prevent stacking, even if we have saved positions
        // This ensures nodes are spread out if saved positions are invalid
        console.log('Checking node positions for stacking...');
        let needsInitialization = !hasSavedPositions;
        
        if (hasSavedPositions) {
            // Check if nodes are stacked (all at same position)
            const firstNode = this.nodes[0];
            const allSamePosition = this.nodes.every(node => 
                Math.abs(node.x - firstNode.x) < 10 && Math.abs(node.y - firstNode.y) < 10
            );
            
            if (allSamePosition) {
                console.log('Detected stacked nodes, forcing initialization...');
                needsInitialization = true;
            }
        }
        
        if (needsInitialization) {
            console.log('Initializing manual layout...');
            this.initializeManualLayout();
        }
        
        // Debug: Check final node positions
        console.log('Final node positions after initialization:');
        this.nodes.slice(0, 3).forEach(node => {
            console.log(`Node ${node.id}: x=${node.x}, y=${node.y}, fx=${node.fx}, fy=${node.fy}`);
        });
        
        // Enable grid snapping for all nodes
        console.log('Enabling grid snapping...');
        this.enableGridSnapping();
        
        // Ensure all nodes have fixed positions for dragging
        this.nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
                node.fx = node.x;
                node.fy = node.y;
            }
        });
        console.log('Fixed positions set for all nodes');
        
        // Add draggable class to all nodes in manual mode
        this.g.selectAll('.node').classed('draggable', true);
        console.log('Added draggable class to nodes');
        
        // Show grid controls
        const gridControls = document.getElementById('gridControls');
        console.log('Grid controls element:', gridControls);
        if (gridControls) {
            gridControls.style.display = 'block';
            console.log('Grid controls displayed');
        } else {
            console.error('Grid controls element not found!');
        }
        
        // No simulation - manual positioning only
        if (this.simulation) {
            this.simulation.stop();
            console.log('Simulation stopped');
        }
        
        // Force a redraw
        this.updatePositions();
        
        console.log('✅ Manual grid layout ready - drag nodes to position them');
    }

    initializeManualLayout() {
        // Place nodes in a loose grid formation as starting point
        const cols = Math.ceil(Math.sqrt(this.nodes.length));
        const spacing = this.gridSize * 4; // Wider initial spacing
        const startX = 100;
        const startY = 100;
        
        this.nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            node.x = startX + col * spacing;
            node.y = startY + row * spacing;
            node.fx = node.x;
            node.fy = node.y;
        });
    }

    enableGridSnapping() {
        // Enhance drag behavior to include grid snapping
        this.nodes.forEach(node => {
            node.gridSnap = true;
        });
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.updateGridDisplay();
        
        const btn = document.getElementById('showGridBtn');
        btn.textContent = this.showGrid ? '📐 Hide Grid' : '📐 Show Grid';
        btn.classList.toggle('btn--active', this.showGrid);
    }

    updateGridDisplay() {
        // Remove existing grid
        this.svg.selectAll('.grid-line').remove();
        
        if (!this.showGrid) return;
        
        // Draw grid lines
        const gridGroup = this.svg.append('g').attr('class', 'grid-overlay');
        
        // Vertical lines
        for (let x = 0; x <= this.width; x += this.gridSize) {
            gridGroup.append('line')
                .attr('class', 'grid-line')
                .attr('x1', x)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', this.height)
                .attr('stroke', '#e0e0e0')
                .attr('stroke-width', x % (this.gridSize * 4) === 0 ? 1 : 0.5)
                .attr('opacity', 0.5);
        }
        
        // Horizontal lines
        for (let y = 0; y <= this.height; y += this.gridSize) {
            gridGroup.append('line')
                .attr('class', 'grid-line')
                .attr('x1', 0)
                .attr('y1', y)
                .attr('x2', this.width)
                .attr('y2', y)
                .attr('stroke', '#e0e0e0')
                .attr('stroke-width', y % (this.gridSize * 4) === 0 ? 1 : 0.5)
                .attr('opacity', 0.5);
        }
    }

    updateGridSize(newSize) {
        this.gridSize = newSize;
        document.getElementById('gridSizeLabel').textContent = `${newSize}px`;
        
        if (this.showGrid) {
            this.updateGridDisplay();
        }
    }

    snapToGrid(x, y) {
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    snapAllToGrid() {
        this.nodes.forEach(node => {
            const snapped = this.snapToGrid(node.x, node.y);
            node.x = snapped.x;
            node.y = snapped.y;
            node.fx = snapped.x;
            node.fy = snapped.y;
        });
        
        this.updatePositions();
        this.showStatus('All nodes snapped to grid', 'info');
    }

    saveCurrentLayout() {
        const layoutData = {
            timestamp: new Date().toISOString(),
            gridSize: this.gridSize,
            dataFile: this.currentDataFile || 'unknown',
            nodeCount: this.nodes.length,
            positions: {}
        };
        
        this.nodes.forEach(node => {
            layoutData.positions[node.id] = {
                x: node.x,
                y: node.y,
                name: node.Name || node.id
            };
        });
        
        // Generate filename based on current data file and timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const baseFileName = this.currentDataFile ? this.currentDataFile.replace('.csv', '') : 'workflow';
        const fileName = `${baseFileName}_layout_${timestamp}.json`;
        
        // Download as file
        this.downloadJsonFile(layoutData, fileName);
        
        this.showStatus(`Layout saved as "${fileName}"`, 'success');
    }

    downloadJsonFile(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    loadSavedLayout(showMessage = true) {
        // Create file input element for loading layout files
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
                        
                        // Restore grid size if saved
                        if (layoutData.gridSize) {
                            this.gridSize = layoutData.gridSize;
                            document.getElementById('gridSizeSlider').value = this.gridSize;
                            document.getElementById('gridSizeLabel').textContent = `${this.gridSize}px`;
                        }
                        
                        this.nodes.forEach(node => {
                            if (layoutData.positions[node.id]) {
                                const pos = layoutData.positions[node.id];
                                node.x = pos.x;
                                node.y = pos.y;
                                node.fx = pos.x;
                                node.fy = pos.y;
                                loadedCount++;
                            }
                        });
                        
                        this.updatePositions();
                        
                        if (showMessage) {
                            this.showStatus(`Loaded layout from "${file.name}" (${loadedCount}/${this.nodes.length} nodes positioned)`, 'success');
                        }
                        
                        return true;
                    } else {
                        this.showStatus('Invalid layout file format', 'error');
                        return false;
                    }
                } catch (error) {
                    console.error('Error loading layout:', error);
                    this.showStatus('Error loading layout file', 'error');
                    return false;
                }
            };
            
            reader.readAsText(file);
        };
        
        // Trigger file selection dialog
        if (showMessage) {
            input.click();
        }
        
        return false; // Will be updated by the file reader callback
    }

    // File-based layouts - no longer need getSavedLayouts method
    // Layouts are now saved as downloadable JSON files

    calculateNodeLevels() {
        const levels = {};
        const visited = new Set();
        
        // Find root nodes (nodes with no incoming links)
        const rootNodes = this.nodes.filter(node => 
            !this.links.some(link => 
                (link.target.id || link.target) === node.id
            )
        );
        
        console.log(`Found ${rootNodes.length} root nodes:`, rootNodes.map(n => n.Name));
        
        // If no clear roots, use first node
        if (rootNodes.length === 0 && this.nodes.length > 0) {
            rootNodes.push(this.nodes[0]);
            console.log('No root nodes found, using first node:', this.nodes[0].Name);
        }
        
        // BFS to assign levels
        const queue = rootNodes.map(node => ({ node, level: 0 }));
        
        while (queue.length > 0) {
            const { node, level } = queue.shift();
            
            if (visited.has(node.id)) continue;
            
            visited.add(node.id);
            levels[node.id] = level;
            
            // Find outgoing connections
            this.links.forEach(link => {
                const sourceId = link.source.id || link.source;
                const targetId = link.target.id || link.target;
                
                if (sourceId === node.id && !visited.has(targetId)) {
                    const targetNode = this.nodes.find(n => n.id === targetId);
                    if (targetNode) {
                        queue.push({ node: targetNode, level: level + 1 });
                    }
                }
            });
        }
        
        // Debug: Show level assignment
        console.log('Level assignments:', levels);
        const levelCounts = {};
        Object.values(levels).forEach(level => {
            levelCounts[level] = (levelCounts[level] || 0) + 1;
        });
        console.log('Nodes per level:', levelCounts);
        
        return levels;
    }

    updatePositions() {
        this.g.selectAll('.node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Update straight line links
        this.g.selectAll('line.link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
            
        // Update orthogonal path links
        this.g.selectAll('path.link')
            .attr('d', d => this.createOrthogonalPath(d));
    }

    updateOrthogonalPositions() {
        // Update node positions
        this.g.selectAll('.node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Update orthogonal path links
        this.g.selectAll('path.link')
            .attr('d', d => this.createOrthogonalPath(d));
            
        // Update any remaining straight line links
        this.g.selectAll('line.link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
    }

    createOrthogonalPath(d) {
        const source = d.source;
        const target = d.target;
        
        // Calculate node sizes for proper connection points
        const sourceSize = source.size || 30;
        const targetSize = target.size || 30;
        
        // Connection points with better spacing
        const sourceY = source.y + sourceSize/2 + 5;
        const targetY = target.y - targetSize/2 - 5;
        const sourceX = source.x;
        const targetX = target.x;
        
        // Calculate distances
        const horizontalDistance = Math.abs(targetX - sourceX);
        const verticalDistance = Math.abs(targetY - sourceY);
        
        if (horizontalDistance < 20) {
            // Vertical alignment - straight line
            return `M${sourceX},${sourceY} L${targetX},${targetY}`;
        }
        
        // Create professional orthogonal routing
        if (verticalDistance > 100) {
            // Standard L-shape for good vertical separation
            const bendY = sourceY + (targetY - sourceY) * 0.55;
            return `M${sourceX},${sourceY} L${sourceX},${bendY} L${targetX},${bendY} L${targetX},${targetY}`;
        } else {
            // Close vertical spacing - create wider routing to avoid overlaps
            const routingOffset = Math.max(40, verticalDistance * 0.7);
            const bendY = sourceY + routingOffset;
            return `M${sourceX},${sourceY} L${sourceX},${bendY} L${targetX},${bendY} L${targetX},${targetY}`;
        }
    }

    handleFileUpload() {
        const fileInput = document.getElementById('csvFile');
        const file = fileInput.files[0];

        if (!file) {
            this.showStatus('Please select a CSV file first', 'error');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showStatus('Please select a valid CSV file', 'error');
            return;
        }

        this.showStatus('Processing CSV file...', 'loading');
        
        // Store current data file name for layout saving
        this.currentDataFile = file.name;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    console.error('CSV parsing errors:', results.errors);
                    this.showStatus('Error parsing CSV file', 'error');
                    return;
                }

                if (results.data.length === 0) {
                    this.showStatus('CSV file appears to be empty', 'error');
                    return;
                }

                this.processData(results.data);
                this.showStatus('CSV loaded successfully!', 'success');
            },
            error: (error) => {
                console.error('CSV parsing error:', error);
                this.showStatus('Error reading CSV file', 'error');
            }
        });
    }

    loadSampleData() {
        this.showStatus('Loading sample data...', 'loading');
        this.currentDataFile = 'sample-data.csv'; // Set default name for sample data
        this.processData(this.sampleData);
        this.showStatus('Sample data loaded!', 'success');
    }

    // Calculate node size based on cost with logarithmic scaling
    calculateNodeSize(cost) {
        // If cost-based sizing is disabled, return uniform size
        if (!this.costBasedSizing) {
            return 40; // Uniform size for all nodes
        }
        
        if (cost === null || cost === undefined || isNaN(cost) || cost <= 0) {
            return 30; // Default size
        }
        
        // Logarithmic scaling: size = 20 + (log(cost + 1) / log(maxCost + 1)) * 60
        // This gives us a range of 20-80px
        const minSize = 20;
        const maxSize = 80;
        const maxCost = 120; // Based on sample data max
        
        const logScale = Math.log(cost + 1) / Math.log(maxCost + 1);
        return minSize + (logScale * (maxSize - minSize));
    }

    // Get border style based on execution type
    getBorderStyle(execution) {
        if (!execution) return "none";
        
        switch (execution.toLowerCase()) {
            case "automatic":
                return "none"; // Solid
            case "applicant":
                return "2,3"; // Dotted
            default:
                return "5,5"; // Dashed (for Noemie, Gil, Manual, etc.)
        }
    }

    processData(data) {
        console.log('Processing data:', data);

        // Clean and validate data, handling special column names
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
                
                // Handle special cost column names
                const effectiveCost = cleaned["Effective Cost"] || cleaned["EffectiveCost"];
                const oCost = cleaned["Ø Cost"] || cleaned["Cost"];
                cleaned.costValue = effectiveCost !== null && effectiveCost !== undefined ? effectiveCost : oCost;
                
                return cleaned;
            });

        console.log('Cleaned data:', cleanData);

        if (cleanData.length === 0) {
            this.showStatus('No valid data found', 'error');
            return;
        }

        // Create nodes with cost-based sizing
        this.allNodes = cleanData.map((row) => ({
            id: row.Name,
            size: this.calculateNodeSize(row.costValue),
            borderStyle: this.getBorderStyle(row.Execution),
            ...row
        }));

        // Create links from Incoming and multiple Outgoing relationships
        this.allLinks = [];
        cleanData.forEach(row => {
            // Handle incoming connections
            if (row.Incoming) {
                const incomingNodes = row.Incoming.split(',').map(s => s.trim()).filter(s => s);
                incomingNodes.forEach(source => {
                    if (cleanData.find(n => n.Name === source)) {
                        this.allLinks.push({
                            source: source,
                            target: row.Name,
                            type: 'incoming'
                        });
                    }
                });
            }

            // Handle multiple outgoing connections (new format)
            for (let i = 1; i <= 5; i++) {
                const outgoingKey = `Outgoing${i}`;
                const varKey = `VarO${i}`;
                
                if (row[outgoingKey] && row[outgoingKey].trim()) {
                    const targetName = row[outgoingKey].trim();
                    const probability = row[varKey] || 1.0;
                    
                    if (cleanData.find(n => n.Name === targetName)) {
                        this.allLinks.push({
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

        console.log('Nodes:', this.allNodes);
        console.log('Links:', this.allLinks);

        this.nodes = [...this.allNodes];
        this.links = [...this.allLinks];

        // Automatically verify connections when data is loaded
        setTimeout(() => {
            this.verifyConnections();
        }, 100);

        this.updateVisualization();
    }

    updateVisualization() {
        console.log('Updating visualization with nodes:', this.nodes.length, 'links:', this.links.length);

        // Clear existing elements
        this.g.selectAll('*').remove();

        if (this.nodes.length === 0) {
            this.showStatus('No data to display', 'error');
            return;
        }

        // Stop existing simulation
        if (this.simulation) {
            this.simulation.stop();
        }

        // Apply the selected layout
        this.applyLayout(this.currentLayout);

        // Render the visual elements
        this.renderVisualizationElements();
    }

    renderVisualizationElements() {
        // Create links based on layout type
        const linkGroup = this.g.append('g').attr('class', 'links');
        
        if (this.currentLayout === 'hierarchical-orthogonal') {
            // Create orthogonal path links
            const link = linkGroup
                .selectAll('path')
                .data(this.links)
                .enter().append('path')
                .attr('class', 'link orthogonal-link')
                .attr('fill', 'none')
                .attr('stroke', '#999')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#arrowhead)');
        } else {
            // Create straight line links
            const link = linkGroup
                .selectAll('line')
                .data(this.links)
                .enter().append('line')
                .attr('class', 'link')
                .attr('stroke', '#999')
                .attr('stroke-width', 2)
                .attr('marker-end', 'url(#arrowhead)');
        }

        // Create node groups
        const node = this.g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(this.nodes)
            .enter().append('g')
            .attr('class', 'node')
            .call(d3.drag()
                .on('start', (event, d) => this.dragStarted(event, d))
                .on('drag', (event, d) => this.dragged(event, d))
                .on('end', (event, d) => this.dragEnded(event, d)));

        // Add click event to nodes
        node.on('click', (event, d) => {
            event.stopPropagation();
            this.showNodeDetails(d);
        });

        // Add hover events
        node.on('mouseover', (event, d) => this.highlightNode(d))
            .on('mouseout', () => this.clearHighlight());

        // Add shapes based on type with cost-based sizing and execution-based borders
        const self = this;
        node.each(function(d) {
            const nodeGroup = d3.select(this);
            // Ensure size is valid and positive
            const size = Math.max(10, d.size || 30); // Minimum size of 10, default 30
            const borderStyle = d.borderStyle;
            
            switch (d.Type) {
                case 'Resource':
                    nodeGroup.append('rect')
                        .attr('width', size * 1.2)
                        .attr('height', size * 0.8)
                        .attr('x', -size * 0.6)
                        .attr('y', -size * 0.4)
                        .attr('fill', 'rgba(255, 255, 255, 0.8)')
                        .attr('stroke', '#000000')
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', borderStyle);
                    break;
                case 'Action':
                    // Triangle pointing upward
                    const triangleSize = size * 0.8;
                    nodeGroup.append('path')
                        .attr('d', `M0,${-triangleSize} L${triangleSize * 0.866},${triangleSize * 0.5} L${-triangleSize * 0.866},${triangleSize * 0.5} Z`)
                        .attr('fill', 'rgba(255, 255, 255, 0.8)')
                        .attr('stroke', '#000000')
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', borderStyle);
                    break;
                case 'State':
                    nodeGroup.append('circle')
                        .attr('r', Math.max(5, size * 0.6)) // Ensure positive radius
                        .attr('fill', 'rgba(255, 255, 255, 0.8)')
                        .attr('stroke', '#000000')
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', borderStyle);
                    break;
                case 'Decision':
                    // Rhombus (diamond)
                    const diamondSize = size * 0.7;
                    nodeGroup.append('path')
                        .attr('d', `M0,${-diamondSize} L${diamondSize},0 L0,${diamondSize} L${-diamondSize},0 Z`)
                        .attr('fill', 'rgba(255, 255, 255, 0.8)')
                        .attr('stroke', '#000000')
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', borderStyle);
                    break;
                default:
                    nodeGroup.append('circle')
                        .attr('r', Math.max(5, size * 0.6)) // Ensure positive radius
                        .attr('fill', 'rgba(255, 255, 255, 0.8)')
                        .attr('stroke', '#000000')
                        .attr('stroke-width', 2)
                        .attr('stroke-dasharray', borderStyle);
            }
        });

        // Add labels
        node.append('text')
            .attr('class', 'node-label')
            .attr('dy', d => d.size + 20)
            .attr('text-anchor', 'middle')
            .text(d => d.Name.length > 15 ? d.Name.substring(0, 15) + '...' : d.Name);

        // Add supplementary info (cost)
        node.append('text')
            .attr('class', 'supplementary-info')
            .attr('dy', d => d.size + 35)
            .attr('text-anchor', 'middle')
            .text(d => {
                const cost = d["Effective Cost"] || d["Ø Cost"];
                return cost ? `€${cost}` : '';
            });

        // Update positions on simulation tick - this will be set by the layout method

        // Ensure text remains readable if graph is rotated/flipped
        this.updateTextRotation();

        console.log('Visualization updated successfully');
    }

    rotateGraph(degrees) {
        this.graphRotation += degrees;
        this.applyGraphTransform();
        this.showStatus(`Graph rotated ${degrees > 0 ? 'right' : 'left'}`, 'info');
    }

    flipGraph(direction) {
        if (direction === 'horizontal') {
            this.graphTransform.scaleX *= -1;
        } else if (direction === 'vertical') {
            this.graphTransform.scaleY *= -1;
        }
        this.applyGraphTransform();
        this.showStatus(`Graph flipped ${direction}ly`, 'info');
    }

    centerGraph() {
        if (this.svg && this.zoom) {
            // Reset zoom to center
            const centerTransform = d3.zoomIdentity;
            
            this.svg.transition()
                .duration(750)
                .call(this.zoom.transform, centerTransform);
                
            this.showStatus('Graph centered', 'info');
        }
    }

    fitToScreen() {
        if (!this.g || this.nodes.length === 0) return;

        // Calculate bounds of all nodes
        const bounds = this.calculateGraphBounds();
        
        if (!bounds) return;

        const graphWidth = bounds.maxX - bounds.minX;
        const graphHeight = bounds.maxY - bounds.minY;
        
        // Calculate scale to fit with padding
        const padding = 50;
        const scaleX = (this.width - padding * 2) / graphWidth;
        const scaleY = (this.height - padding * 2) / graphHeight;
        const scale = Math.min(scaleX, scaleY, 2); // Cap at 2x zoom
        
        // Calculate center translation
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        
        const transform = d3.zoomIdentity
            .translate(this.width / 2, this.height / 2)
            .scale(scale)
            .translate(-centerX, -centerY);
            
        this.svg.transition()
            .duration(750)
            .call(this.zoom.transform, transform);
            
        this.showStatus('Graph fitted to screen', 'info');
    }

    calculateGraphBounds() {
        if (this.nodes.length === 0) return null;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
                minX = Math.min(minX, node.x - node.size);
                maxX = Math.max(maxX, node.x + node.size);
                minY = Math.min(minY, node.y - node.size);
                maxY = Math.max(maxY, node.y + node.size);
            }
        });

        if (minX === Infinity) return null;

        return { minX, maxX, minY, maxY };
    }

    applyGraphTransform() {
        if (!this.g) return;

        // Calculate center point for rotation
        const bounds = this.calculateGraphBounds();
        const centerX = bounds ? (bounds.minX + bounds.maxX) / 2 : this.width / 2;
        const centerY = bounds ? (bounds.minY + bounds.maxY) / 2 : this.height / 2;

        // Apply rotation and scaling around the graph center
        const transform = `translate(${centerX}, ${centerY}) 
                          rotate(${this.graphRotation}) 
                          scale(${this.graphTransform.scaleX}, ${this.graphTransform.scaleY}) 
                          translate(${-centerX}, ${-centerY})`;
        
        this.g.transition()
            .duration(300)
            .attr('transform', transform);
            
        // Counter-rotate text elements to keep them readable
        this.updateTextRotation();
    }

    updateTextRotation() {
        if (!this.g) return;

        // Apply counter-rotation to all text elements to keep them readable
        const counterRotation = -this.graphRotation;
        const textScaleX = this.graphTransform.scaleX < 0 ? -1 : 1;
        const textScaleY = this.graphTransform.scaleY < 0 ? -1 : 1;

        this.g.selectAll('.node-label, .supplementary-info')
            .transition()
            .duration(300)
            .attr('transform', `rotate(${counterRotation}) scale(${textScaleX}, ${textScaleY})`);
    }

    dragStarted(event, d) {
        console.log(`🔥 Drag started for node: ${d.id}, layout: ${this.currentLayout}`);
        if (this.currentLayout !== 'manual-grid') {
            if (!event.active) this.simulation.alphaTarget(0.3).restart();
        }
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        console.log(`🚀 Dragging node: ${d.id}, event.x: ${event.x}, event.y: ${event.y}, gridSnap: ${d.gridSnap}`);
        if (this.currentLayout === 'manual-grid' && d.gridSnap) {
            // Snap to grid during drag
            const snapped = this.snapToGrid(event.x, event.y);
            console.log(`⚡ Snapped to: ${snapped.x}, ${snapped.y}`);
            d.fx = snapped.x;
            d.fy = snapped.y;
            d.x = snapped.x;
            d.y = snapped.y;
        } else {
            d.fx = event.x;
            d.fy = event.y;
        }
        this.updatePositions();
    }

    dragEnded(event, d) {
        if (this.currentLayout === 'manual-grid') {
            // Keep position fixed in manual mode
            if (d.gridSnap) {
                const snapped = this.snapToGrid(d.x, d.y);
                d.fx = snapped.x;
                d.fy = snapped.y;
                d.x = snapped.x;
                d.y = snapped.y;
            } else {
                d.fx = d.x;
                d.fy = d.y;
            }
        } else {
            if (!event.active) this.simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }

    highlightNode(selectedNode) {
        // Get connected nodes
        const connectedNodes = new Set([selectedNode.id]);
        this.links.forEach(link => {
            if (link.source.id === selectedNode.id || link.source === selectedNode.id) {
                connectedNodes.add(link.target.id || link.target);
            }
            if (link.target.id === selectedNode.id || link.target === selectedNode.id) {
                connectedNodes.add(link.source.id || link.source);
            }
        });

        // Highlight connected elements
        this.g.selectAll('.node')
            .classed('highlighted', d => d.id === selectedNode.id)
            .classed('dimmed', d => !connectedNodes.has(d.id));

        this.g.selectAll('.link')
            .classed('highlighted', d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return sourceId === selectedNode.id || targetId === selectedNode.id;
            })
            .classed('dimmed', d => {
                const sourceId = d.source.id || d.source;
                const targetId = d.target.id || d.target;
                return !(sourceId === selectedNode.id || targetId === selectedNode.id);
            });

        this.g.selectAll('.node-label, .supplementary-info')
            .classed('dimmed', d => !connectedNodes.has(d.id));
    }

    clearHighlight() {
        this.g.selectAll('.node, .link, .node-label, .supplementary-info')
            .classed('highlighted', false)
            .classed('dimmed', false);
    }

    showNodeDetails(node) {
        console.log('Showing details for node:', node);
        
        const panel = document.getElementById('detailsPanel');
        const content = document.getElementById('nodeDetails');

        // Build details HTML with proper cost display
        const details = [
            { label: 'Name', value: node.Name || 'N/A' },
            { label: 'Type', value: node.Type || 'N/A' },
            { label: 'Execution', value: node.Execution || 'N/A' },
            { label: 'Platform', value: node.Platform || 'N/A' },
            { label: 'Monitoring', value: node.Monitoring || 'N/A' },
            { label: 'Ø Cost', value: (node["Ø Cost"] !== null && node["Ø Cost"] !== undefined) ? `€${node["Ø Cost"]}` : 'N/A' },
            { label: 'Effective Cost', value: (node["Effective Cost"] !== null && node["Effective Cost"] !== undefined) ? `€${node["Effective Cost"]}` : 'N/A' },
            { label: 'Node Size', value: `${Math.round(node.size)}px` },
            { label: 'Border Style', value: node.Execution || 'N/A' },
            { label: 'Incoming', value: node.Incoming || 'None' },
            { label: 'Outgoing', value: node.Outgoing || 'None' }
        ];

        content.innerHTML = details.map(detail => `
            <div class="detail-row">
                <div class="detail-label">${detail.label}</div>
                <div class="detail-value">${detail.value}</div>
            </div>
        `).join('');

        panel.classList.remove('hidden');
    }

    hideDetailsPanel() {
        document.getElementById('detailsPanel').classList.add('hidden');
    }

    handleSearch(query) {
        this.applyFilters();
    }

    handleFilter() {
        this.applyFilters();
    }

    applyFilters() {
        const typeFilter = document.getElementById('typeFilter').value;
        const executionFilter = document.getElementById('executionFilter').value;
        const searchQuery = document.getElementById('searchInput').value.trim();

        let filteredNodes = [...this.allNodes];

        // Apply search filter
        if (searchQuery) {
            filteredNodes = filteredNodes.filter(node => 
                node.Name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply type filter
        if (typeFilter) {
            filteredNodes = filteredNodes.filter(node => node.Type === typeFilter);
        }

        // Apply execution filter
        if (executionFilter) {
            filteredNodes = filteredNodes.filter(node => node.Execution === executionFilter);
        }

        const filteredIds = new Set(filteredNodes.map(n => n.id));
        const filteredLinks = this.allLinks.filter(link => 
            filteredIds.has(link.source.id || link.source) && 
            filteredIds.has(link.target.id || link.target)
        );

        this.nodes = filteredNodes;
        this.links = filteredLinks;

        this.updateVisualization();
    }

    resetView() {
        // Clear filters
        document.getElementById('searchInput').value = '';
        document.getElementById('typeFilter').value = '';
        document.getElementById('executionFilter').value = '';
        document.getElementById('layoutSelect').value = 'force';

        // Reset orientation
        this.currentLayout = 'force';
        this.graphRotation = 0;
        this.graphTransform = { scaleX: 1, scaleY: 1 };

        // Reset data
        this.nodes = [...this.allNodes];
        this.links = [...this.allLinks];

        this.updateVisualization();
        
        // Reset zoom
        if (this.svg) {
            this.svg.transition().duration(500).call(this.zoom.transform, d3.zoomIdentity);
        }
        
        // Reset text rotation
        this.updateTextRotation();
        
        // Hide details panel
        this.hideDetailsPanel();
        
        // Clear status
        this.showStatus('View reset', 'success');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WorkflowVisualizer();
});