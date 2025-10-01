# 51m54mZ00M

51m54mZ00M is an interactive web application for creating, analyzing, and visualizing complex business workflows and process flows. Built with D3.js, it provides a dynamic interface for turning data into insightful, interactive diagrams with multiple data sources and real-time editing capabilities.


## Architecture Overview

### Core Components

**Frontend Application**: Single-page application built with vanilla JavaScript and D3.js for visualization rendering, featuring modular architecture with clear separation of concerns.

**API Server**: Node.js/Express server providing RESTful endpoints for data persistence, file management, and workflow synchronization.

**Data Layer**: JSON-based data storage with support for elements, connections, variables, and combined workflow files, enabling version control and easy data manipulation.

**Test Suite**: Comprehensive testing infrastructure for data integrity, API functionality, and browser debugging utilities.

## Features

**Interactive Visualization**: Zoom, pan, and drag nodes with responsive design. Multiple layout algorithms including force-directed, hierarchical, circular, grid, and manual positioning with grid-snapping capabilities.

**Data Management**: JSON persistence, real-time table editing with Handsontable integration, and automatic data synchronization between frontend and backend.

**Advanced Controls**: Search and filter nodes by name, type, or execution method. Toggle between uniform and cost-based node sizing. Graph transformation tools including rotation, flipping, centering, and auto-fitting.

**Export Capabilities**: High-quality PDF export with metadata, layout preservation, and custom formatting. JSON data export for backup and sharing workflows.

**Validation Tools**: Built-in connection verification, orphaned node detection, data consistency checking, and comprehensive error reporting.

## Usage

### Selection and Dragging
- Single select: Click a node.
- Toggle select: Cmd/Ctrl + Click additional nodes.
- Multi-select (box): Hold Shift and drag on empty space to draw a rectangle and add nodes inside the box to your selection.
- Clear selection: Press Escape.
- Select all: Cmd/Ctrl + A.

### Group Drag Behavior by Layout
- Force layout:
  - Dragging a selection moves them together and temporarily pins them to the pointer; on release they rejoin the simulation.
- Manual-grid and Hierarchical-Orthogonal:
  - Dragging a selection moves them together and keeps their positions fixed where you drop them.
  - Positions snap to the configured grid size in Manual-grid.

### Grid Controls (Manual-grid and Hierarchical-Orthogonal)
- Show/Hide Grid: Toggle the grid overlay.
- Grid Size: Adjust with the slider; snapping respects this size.
- Snap All To Grid: Snap every node to the nearest grid intersection.
- Save Layout: Download a JSON with current positions.
- Load Layout: Load a previously saved positions JSON.

### Keyboard Shortcuts
- Cmd/Ctrl + A: Select all nodes
- Escape: Clear selection
- Shift + Drag (on background): Box-select (adds to selection)

### Zoom and Pan
- Mouse wheel, drag background to pan.
- While Shift is held for box-selection, zoom/pan are temporarily disabled to avoid conflicts.

## Layouts at a Glance
- Force: Organic physics-based arrangement; useful for exploration. Group drag pins during interaction then releases.
- Hierarchical: Top-down layering with collision.
- Hierarchical-Orthogonal: Clean right-angle links with fixed positions; great for presentations.
- Circular: Ring layout for overviews.
- Grid: Automatic grid placement for balanced spacing.
- Manual-grid: You control placement; nodes snap and stay where you drop them.

## Saving and Loading Positions
- Use Save Layout to export positions (and grid size) to a JSON file.
- Use Load Layout to bring positions back later—handy for sharing or restoring a curated layout.

## Troubleshooting
- Shift-drag doesn’t draw a box: Ensure you start dragging on empty space with Shift held; zoom/pan are disabled while Shift is down.
- Nodes slide back after dragging: You’re likely on Force layout; that’s expected as the simulation resumes. Switch to Manual-grid to keep positions fixed.
- API server offline: The app will attempt direct file loading from the `data/` folder if the API isn’t available.

## Quick Start

### Prerequisites
- Node.js (version 14.0.0 or higher)
- npm (comes with Node.js)

### Installation
```bash
git clone https://github.com/yourusername/workflow-visualizer.git
cd workflow-visualizer
npm install
```

### Development
```bash
# Start frontend development server
npm run dev

# Start API server (in separate terminal)
npm run server

# Run comprehensive tests
npm run test
```

The application will be available at `http://localhost:5174` with API server running on `http://localhost:3001`.

## Project Structure

### Root Files
```
workflow-visualizer/
├── index.html              # Application entry point with complete UI layout
├── package.json            # Dependencies, scripts, and project metadata
├── server.js               # Express API server for data persistence
├── LICENSE                 # MIT license
├── README.md               # This documentation
```

### Source Code Architecture
```
src/
├── app.js                  # Application bootstrap and initialization
├── style.css               # Main stylesheet importing modular CSS
├── js/                     # Core JavaScript modules
│   ├── core.js             # WorkflowVisualizer class and application state
│   ├── data.js             # Data processing, parsing, and validation
│   ├── render.js           # D3.js visualization rendering engine
│   ├── interactions.js     # User interactions and event handling
│   ├── layouts.js          # Graph layout algorithms implementation
│   ├── ui.js               # User interface components and controls
│   ├── export.js           # PDF export functionality
│   ├── fileManager.js      # File operations and API communication
│   └── utils.js            # Utility functions and helpers
└── styles/                 # Modular CSS architecture
    ├── base.css            # CSS variables and reset styles
    ├── components.css      # Reusable UI component styles
    ├── layout.css          # Application layout and structure
    ├── responsive.css      # Mobile and responsive design
    └── visualization.css   # D3.js visualization styling
```

### Data Storage
```
data/
├── elements.json           # Workflow nodes/elements definition
├── connections.json        # Node relationships and flows
├── variables.json          # Dynamic variables for calculations
└── workflow.json           # Combined workflow data with metadata
```

### Testing Infrastructure
```
tests/
├── README.md               # Testing documentation and usage guide
├── verify-sync.js          # Comprehensive system verification
├── test-data-sync.js       # Data integrity and consistency testing
├── test-api-simple.js      # API endpoint connectivity testing
├── test-api.js             # Browser-based API testing utilities
├── debug-clear-cache.js    # Browser localStorage cache clearing
├── debug-test-data.js      # Sample data for development testing
└── debug-test-table.js     # Table modification testing utilities
```

## Core Modules Description

### core.js - Application Core
The main `WorkflowVisualizer` class orchestrates the entire application lifecycle. It manages state synchronization between table data (elements, connections, variables) and visualization data (nodes, links). Key responsibilities include data loading from multiple sources (API, direct files, localStorage), layout management, and event coordination between modules.

**Key Functions**:
- `initializeApp()`: Application entry point and instance creation
- `loadFromJsonFiles()`: Data loading with API-first, file fallback strategy
- `updateVisualization()`: Central visualization update coordinator
- `syncTableDataToVisualization()`: Bidirectional data synchronization

### data.js - Data Processing Engine
Handles all data transformation, validation, and computation. Supports both legacy flat array format and modern JSON table format. Implements flow-based volume calculations for workflow analytics.

**Key Functions**:
- `processData()`: Main data transformation pipeline
- `computeDerivedFields()`: Calculate node volumes and flow metrics
- `verifyConnections()`: Data consistency validation
- Import/export functions for JSON formats

### render.js - Visualization Engine
D3.js-based rendering system for creating interactive network diagrams. Manages SVG creation, node and link rendering, and visual state updates.

**Key Functions**:
- `initVisualization()`: SVG setup and zoom/pan initialization
- `renderVisualizationElements()`: Node and link rendering with event binding
- `updatePositions()`: Animation and position updates
- `highlightNode()` / `clearHighlight()`: Interactive highlighting system

### interactions.js - User Interaction Handler
Manages all user interactions including drag-and-drop, zoom/pan, filtering, and node selection. Coordinates between user actions and application state changes.

**Key Functions**:
- Drag and drop with grid snapping support
- Filter system for nodes by multiple criteria
- Zoom and pan management with boundaries
- Event propagation and state updates

### layouts.js - Layout Algorithms
Implements multiple graph layout algorithms for different visualization needs. Each layout is self-contained and can be applied independently.

**Available Layouts**:
- Force-directed simulation for organic positioning
- Hierarchical layouts (top-down and orthogonal)
- Circular arrangement for cycle visualization
- Grid layouts for structured presentations
- Manual positioning with grid snapping

### ui.js - User Interface Management
Handles all UI components including control panels, tables, buttons, and modal dialogs. Integrates Handsontable for advanced data editing capabilities.

**Key Functions**:
- `initEditorTables()`: Handsontable initialization and configuration
- Event binding for all UI controls
- Status message system
- Panel management and responsive behavior

### fileManager.js - File Operations
Manages data persistence through API server communication. Handles downloads and synchronization with the backend storage system.

**Key Functions**:
- `saveToFiles()`: API-based data persistence
- `loadFromFile()`: JSON file parsing
- Auto-save functionality with change tracking

### export.js - Export System
PDF export functionality using jsPDF and html2canvas. Creates print-ready documents with metadata and proper formatting.

**Features**:
- High-resolution SVG to PDF conversion
- Metadata inclusion (node count, layout, timestamp)
- Element hiding for clean exports
- Error handling and user feedback

### utils.js - Utility Functions
Common utility functions used across the application including node sizing calculations, grid snapping, file downloads, and status messaging.

## Data Model

### Elements (Nodes)
```json
{
  "id": "unique_identifier",
  "name": "Display Name",
  "type": "Resource|Action|Decision|State",
  "area": "Functional Area",
  "platform": "Platform Name",
  "execution": "Manual|Automatic|Applicant",
  "cost": 0.0,
  "incomingVolume": "variable_name_or_number",
  "nodeMultiplier": "variable_name_or_number",
  "description": "Node description",
  "computedVolumeIn": 0.0
}
```

### Connections (Links)
```json
{
  "id": "from_id->to_id",
  "fromId": "source_node_id",
  "toId": "target_node_id"
}
```

### Variables
```json
{
  "variable_name": 0.0,
  "callback_rate": 0.25,
  "incoming_volume": 2000
}
```

## API Endpoints

### GET /api/health
Health check endpoint returning server status and timestamp.

### GET /api/load-workflow
Returns complete workflow data including elements, connections, and variables.

### POST /api/save-workflow
Saves workflow data to JSON files. Accepts elements, connections, and variables in request body.

## Development Scripts

```bash
npm run dev          # Start Vite development server
npm run build        # Build production bundle
npm run preview      # Preview production build
npm run server       # Start API server
npm run test         # Run comprehensive verification
npm run test:data    # Test data consistency
npm run test:api     # Test API connectivity
npm run debug:cache  # Clear browser cache instructions
npm run debug:table  # Table testing instructions
```

## Browser Compatibility

- Modern browsers with ES6+ support
- Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- Mobile browsers with touch interaction support

## Technical Dependencies

**Core Libraries**:
- D3.js v7.9.0 (visualization)
- Vite v7.1.7 (development server)
- Express v4.21.2 (API server)
- Handsontable v14.3.0 (table editing)

**Export and Processing**:
- jsPDF v3.0.3 (PDF generation)
- html2canvas v1.4.1 (SVG capture)

**Development Tools**:
- CORS v2.8.5 (cross-origin requests)
- JSDoc v4.0.4 (documentation generation)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.