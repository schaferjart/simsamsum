# Copilot Instructions for 51m54mZ00M (SimSamSum)

You are a direct, efficient assistant. Follow these rules strictly:

1. NO EMOJIS - Never use emojis in any response under any circumstances.

2. ONLY DO WHAT IS ASKED - Do not:
   - Offer unsolicited suggestions or alternatives
   - Add extra features or functionality not requested
   - Provide additional information beyond what was asked
   - Ask follow-up questions unless clarification is genuinely needed
   - Give warnings or caveats unless directly relevant to the request

3. BE CONCISE - Give direct answers without unnecessary elaboration.

4. STAY ON TASK - If asked to write code, write the code. If asked to explain something, explain it. Don't add commentary about best practices, alternative approaches, or potential improvements unless specifically requested.

5. NO FLUFF - Skip phrases like "Great question!", "I'd be happy to help!", or "Here's what I suggest". Just provide the answer.

Execute requests as specified. Nothing more, nothing less.

## Project Overview

Interactive D3.js-based workflow visualization application for creating, analyzing, and visualizing complex business processes. Features dual-server architecture (Vite dev + Node.js API), JSON-based persistence, and advanced graph manipulation with multiple layout algorithms.

## Architecture

### Core Components

**Frontend (Vanilla JS + D3.js)**
- `src/app.js` - Entry point, initializes `WorkflowVisualizer` from `core.js`
- `src/js/core.js` - Main application class managing state, data pipeline, and UI coordination
- `src/js/render.js` - SVG rendering, zoom/pan initialization, visual updates
- `src/js/interactions.js` - Drag handlers, selection logic, keyboard shortcuts
- `src/js/layouts.js` - Six layout algorithms: force, hierarchical, hierarchical-orthogonal, circular, grid, manual-grid

**Backend (Node.js/Express)**
- `server.js` - API server on port 3001 providing `/api/save-workflow`, `/api/load-workflow`, `/api/layouts/*`, `/api/git-info`
- Vite dev server (port 5173) proxies `/api/*` requests to port 3001 (see `vite.config.js`)

**Data Layer**
- `data/elements.json` - Node definitions with properties: id, name, type, subType, execution, platform, costs, volumes
- `data/connections.json` - Edge definitions with fromId/toId
- `data/variables.json` - Global variables for calculations
- `data/workflow.json` - Combined format with timestamp
- `data/layouts/*.json` - Saved position presets for manual-grid layout

### State Management Pattern

`WorkflowVisualizer` class in `core.js` maintains **dual data models**:

1. **Rendering state** (`this.state`) - D3-compatible nodes/links with computed fields
2. **Table state** (`this.elements`, `this.connections`, `this.variables`) - Raw editable data separate from visualization

**Critical**: When editing via Handsontable integration, changes flow through `this.elements` → `computeDerivedFields()` → `this.state.nodes`. Never mutate `this.state.nodes` directly for table edits.

## Development Workflow

### Running the Application

```bash
# Terminal 1: Frontend dev server (Vite)
npm run dev

# Terminal 2: API server (required for persistence)
npm run server

# Access at http://localhost:5173
```

**Fallback behavior**: If API server unavailable, app attempts direct file loading from `./data/` directory.

### Testing Commands

```bash
npm test              # Verify data sync integrity
npm run test:data     # Simple validation check
npm run test:api      # API endpoint testing

# Browser console debugging (copy-paste script contents):
npm run debug:cache   # Clear localStorage
npm run debug:table   # Test table sync
```

See `tests/README.md` for detailed test descriptions.

## Key Patterns & Conventions

### Layout System

**Layout types determine dragging behavior**:
- `force` - Nodes rejoin physics simulation after drag (temporary pinning)
- `manual-grid` / `hierarchical-orthogonal` - Fixed positions with grid snapping
- Others - Mixed behaviors (see `src/js/layouts.js`)

**Grid snapping** only active in `manual-grid` layout. Grid size controlled via `this.state.gridSize` (default: 50).

### Selection Manager

`src/js/selection.js` - Manages multi-select state independent of D3 data binding:
- Click = single select (clears others)
- Cmd/Ctrl+Click = toggle multi-select
- Shift+Drag on background = box-select (additive)
- ESC = clear, Cmd/Ctrl+A = select all

**Visual feedback**: Selected nodes get `.selected` class in `updateSelectionVisuals()` from `render.js`.

### Data Transformation Pipeline

`src/js/data.js` functions:

1. **`processData(rawData)`** - Converts CSV/legacy formats to elements/connections
2. **`computeDerivedFields(elements, connections, variables)`** - Calculates:
   - `incomingVolume` from upstream nodes
   - `effectiveCost` = avgCost × incomingVolume
   - Node IDs via `generateIdFromName()` if missing
3. **`verifyConnections(elements, connections)`** - Validates link integrity, reports orphans

**Always run** `computeDerivedFields()` after table edits before re-rendering.

### Filter & Styling System

`src/js/filtering.js` supports two modes:

- **Exclude mode** (default) - Hides non-matching elements
- **Highlight mode** - Dims non-matching, highlights matching

**Rule structure**: `{ scope: 'node'|'connection', column: string, operator: string, value: any }`

**Connection filtering** can reference nested properties like `source.Type`, `target.Platform` (see `CONNECTION_COLUMNS` in `ui.js`).

**Handsontable integration**: Column filters in the table editors sync bidirectionally with filter rules. Applying filters in Handsontable automatically creates corresponding rules in the filter panel.

**Filter sets**: Named collections of filter+styling rules saved to localStorage. Use Save Set button to persist current configuration, Load dropdown to restore. Each set includes both filter rules and styling rules with timestamps.

### File Persistence

`src/js/fileManager.js`:
- `saveToFiles()` - Attempts API save first, falls back to browser downloads
- `loadFromFile()` - Handles combined format, individual files, and legacy formats
- Auto-save to localStorage every 10 changes (see `AUTO_SAVE_THRESHOLD`)

**Layout persistence**: Use Save/Load Layout buttons in UI to export/import positions to `data/layouts/` directory.

## Common Pitfalls

1. **Link endpoints becoming IDs after layout changes**: Links need object references for rendering. `core.js` re-linkifies in `updateVisualization()` before each render.

2. **Handsontable undo conflicts**: Keyboard shortcuts check `target.closest('.handsontable')` to prevent interference (line ~176 in `core.js`).

3. **Zoom disabled during Shift-drag**: `d3.zoom().filter()` in `render.js` prevents pan/zoom when Shift held for box-selection.

4. **Corrupted/backup files**: `interactions_corrupted.js` and `interactions_backup.js` exist in repo - use `interactions.js` for current implementation.

5. **Cost calculations**: Nodes without `avgCost` or `incomingVolume` display null effective costs - this is expected for terminal/source nodes.

## Naming Conventions

- **Node properties**: camelCase in JSON (`avgCost`, `incomingNumber`), but some legacy UPPERCASE fields exist (`AOR`, `KPI`)
- **IDs**: kebab-case generated via `generateIdFromName()` (e.g., "Video Application" → "video_application")
- **Modules**: Kebab-case filenames, named exports preferred
- **D3 selections**: `g` for graph group, `svg` for root, `zoomGroup` for zoom target

## Integration Points

- **Handsontable** - Editable data tables (license required for production)
- **jsPDF + html2canvas** - PDF export in `src/js/export.js`
- **Git metadata** - `src/js/gitInfo.js` fetches from `/api/git-info` and displays in header

## References

- Primary state: `WorkflowVisualizer` class in `src/js/core.js`
- D3 patterns: `src/js/render.js` for visualization setup
- Data flow: `src/js/data.js` for transformations
- User interactions: `src/js/interactions.js` and `src/js/selection.js`
