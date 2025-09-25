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
        
        if (this.nodes.length > 0) {
            this.applyLayout(layoutType);
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

    calculateNodeLevels() {
        const levels = {};
        const visited = new Set();
        
        // Find root nodes (nodes with no incoming links)
        const rootNodes = this.nodes.filter(node => 
            !this.links.some(link => 
                (link.target.id || link.target) === node.id
            )
        );
        
        // If no clear roots, use first node
        if (rootNodes.length === 0 && this.nodes.length > 0) {
            rootNodes.push(this.nodes[0]);
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
        
        return levels;
    }

    updatePositions() {
        this.g.selectAll('.node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        this.g.selectAll('.link')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
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

        // Create links
        const link = this.g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(this.links)
            .enter().append('line')
            .attr('class', 'link');

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
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragEnded(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
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