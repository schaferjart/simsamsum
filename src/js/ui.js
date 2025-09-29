import { highlightNodeById } from './render.js';
/**
 * Binds all the UI event listeners to their respective DOM elements.
 * @param {object} handlers - An object containing the handler functions.
 */
export function bindEventListeners(handlers) {
    // File and data loading
    document.getElementById('csvFile').addEventListener('change', handlers.handleFileSelect);
        document.getElementById('uploadBtn').addEventListener('click', handlers.handleFileUpload);    // Search and filter
    document.getElementById('searchInput').addEventListener('input', (e) => handlers.handleSearch(e.target.value));
    document.getElementById('typeFilter').addEventListener('change', handlers.handleFilter);
    document.getElementById('executionFilter').addEventListener('change', handlers.handleFilter);

    // View and layout controls
    document.getElementById('resetBtn').addEventListener('click', handlers.handleReset);
    document.getElementById('sizeToggle').addEventListener('change', (e) => handlers.handleSizeToggle(e.target.checked));
    document.getElementById('layoutSelect').addEventListener('change', (e) => handlers.handleLayoutChange(e.target.value));

    // Grid controls
    document.getElementById('showGridBtn').addEventListener('click', handlers.toggleGrid);
    document.getElementById('snapToGridBtn').addEventListener('click', handlers.snapAllToGrid);
    document.getElementById('savePositionsBtn').addEventListener('click', handlers.saveLayout);
    document.getElementById('loadPositionsBtn').addEventListener('click', handlers.loadLayout);
    document.getElementById('gridSizeSlider').addEventListener('input', (e) => handlers.updateGridSize(parseInt(e.target.value, 10)));

    // Orientation controls
    document.getElementById('rotateLeftBtn').addEventListener('click', () => handlers.rotateGraph(-90));
    document.getElementById('rotateRightBtn').addEventListener('click', () => handlers.rotateGraph(90));
    document.getElementById('flipHorizontalBtn').addEventListener('click', () => handlers.flipGraph('horizontal'));
    document.getElementById('flipVerticalBtn').addEventListener('click', () => handlers.flipGraph('vertical'));
    document.getElementById('centerGraphBtn').addEventListener('click', handlers.centerGraph);
    document.getElementById('fitToScreenBtn').addEventListener('click', handlers.fitToScreen);

    // Other UI actions
    document.getElementById('verifyBtn').addEventListener('click', handlers.handleVerify);
    document.getElementById('exportPdfBtn').addEventListener('click', handlers.handleExport);
    document.getElementById('closePanelBtn').addEventListener('click', hideDetailsPanel);

    // Window resize
    window.addEventListener('resize', handlers.handleResize);
}

/**
 * Shows the details panel with information about the selected node.
 * @param {object} node - The data object for the selected node.
 */
export function showNodeDetails(node) {
    // Repurposed: ensure the editor sidebar is visible, switch to Nodes tab, and highlight the row.
    const panel = document.getElementById('detailsPanel');
    if (panel) panel.classList.remove('hidden');

    // Simple tab handling: show Nodes section and hide others
    const nodesSection = document.getElementById('nodes-section');
    const connsSection = document.getElementById('connections-section');
    const varsSection = document.getElementById('variables-section');
    nodesSection?.removeAttribute('hidden');
    connsSection?.setAttribute('hidden', 'true');
    varsSection?.setAttribute('hidden', 'true');

    // Try to highlight the node in the Nodes table
    try { highlightTableRowByNodeId(node.id); } catch (_) { /* noop */ }
}

/**
 * Hides the details panel.
 */
export function hideDetailsPanel() {
    const panel = document.getElementById('detailsPanel');
    if (!panel) return;
    // Toggle collapsed state to free space, not fully hidden for layout stability
    panel.classList.toggle('hidden');
}

/**
 * Toggles the visibility of the grid controls.
 * @param {boolean} visible - Whether the controls should be visible.
 */
export function toggleGridControls(visible) {
    const gridControls = document.getElementById('gridControls');
    if (gridControls) {
        gridControls.style.display = visible ? 'block' : 'none';
    }
}

/**
 * Updates the UI for the grid display.
 * @param {boolean} showGrid - Whether the grid is currently shown.
 */
export function updateGridUI(showGrid) {
    const btn = document.getElementById('showGridBtn');
    if (btn) {
        btn.textContent = showGrid ? '📐 Hide Grid' : '📐 Show Grid';
        btn.classList.toggle('btn--active', showGrid);
    }
}

/**
 * Updates the grid size label.
 * @param {number} newSize - The new grid size.
 */
export function updateGridSizeLabel(newSize) {
    const label = document.getElementById('gridSizeLabel');
    if (label) {
        label.textContent = `${newSize}px`;
    }
}

/**
 * Resets the UI filters and controls to their default state.
 */
export function resetUI() {
    document.getElementById('searchInput').value = '';
    document.getElementById('typeFilter').value = '';
    document.getElementById('executionFilter').value = '';
    document.getElementById('layoutSelect').value = 'force';
    document.getElementById('sizeToggle').checked = true;
    toggleGridControls(false);
    updateGridUI(false);
}

// --- Table Editors (Handsontable) ---
let _nodesHot = null;
let _connectionsHot = null;
let _variablesHot = null;
let _debounceTimers = { nodes: null, connections: null, variables: null };

function debounceTable(type, fn, delay = 200) {
    clearTimeout(_debounceTimers[type]);
    _debounceTimers[type] = setTimeout(() => fn(), delay);
}

/**
 * Initialize Handsontable editors for Nodes, Connections, and Variables.
 * Expects a `core` object exposing: nodes, connections, variables, and
 * methods: updateFromTable(type, data), resolveVariables(), computeDerivedFields(), updateVisualization().
 * @param {object} core
 */
export async function initEditorTables(core) {
    const elementsEl = document.getElementById('nodes-table'); // Keep same DOM ID for now
    const connsEl = document.getElementById('connections-table');
    const varsEl = document.getElementById('variables-table');
    if (!elementsEl || !connsEl || !varsEl) return;

    // Lazy import to avoid breaking if dependency not yet installed
    let Handsontable;
    try {
        Handsontable = (await import('handsontable')).default;
    } catch (e) {
        nodesEl.innerHTML = '<div style="padding:8px;">Handsontable not installed. Run: npm i handsontable</div>';
        connsEl.innerHTML = '';
        varsEl.innerHTML = '';
        return;
    }

    const baseSettings = {
        licenseKey: 'non-commercial-and-evaluation',
        rowHeaders: true,
        colHeaders: true,
        height: 350,
        width: '100%',
        contextMenu: true,
        minSpareRows: 1
    };

    // Elements table (formerly nodes)
    const elementTypes = ['Resource', 'Action', 'State', 'Decision'];
    const executionTypes = ['Automatic', 'Manual', 'Applicant', 'Noemie', 'Gil'];
    _nodesHot = new Handsontable(elementsEl, {
        ...baseSettings,
        data: (core.elements || core.nodes || []).map(e => ({ ...e })),
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'name', title: 'Name' },
            { data: 'type', title: 'Type', type: 'dropdown', source: elementTypes },
            { data: 'area', title: 'Area' },
            { data: 'platform', title: 'Platform' },
            { data: 'execution', title: 'Execution', type: 'dropdown', source: executionTypes },
            { data: 'cost', title: 'Cost', type: 'numeric', numericFormat: { pattern: '0[.]00' } },
            { data: 'incomingVolume', title: 'Incoming Volume', type: 'numeric', readOnly: true },
            { data: 'description', title: 'Description' }
        ],
        colHeaders: ['ID', 'Name', 'Type', 'Area', 'Platform', 'Execution', 'Cost', 'Volume In', 'Description'],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            console.log('🔄 Elements table changed:', changes, 'source:', source);
            debounceTable('elements', () => {
                console.log('📝 Processing elements table changes...');
                const nextElements = _nodesHot.getSourceData().map(r => ({
                    id: String(r.id || '').trim(),
                    name: String(r.name || '').trim(),
                    type: String(r.type || '').trim(),
                    area: String(r.area || '').trim(),
                    platform: String(r.platform || '').trim(),
                    execution: String(r.execution || 'Manual').trim(),
                    cost: typeof r.cost === 'number' ? r.cost : parseFloat(r.cost) || 0,
                    incomingVolume: typeof r.incomingVolume === 'number' ? r.incomingVolume : 0,
                    description: String(r.description || '').trim(),
                })).filter(e => e.id);
                console.log('🚀 Calling updateFromTable with:', nextElements.length, 'elements');
                core.updateFromTable('elements', nextElements);
                // Refresh connection dropdown sources with updated element IDs
                if (_connectionsHot) {
                    const elementIds = (core.elements || core.nodes || []).map(e => e.id);
                    _connectionsHot.updateSettings({
                        columns: [
                            { data: 'id', title: 'ID' },
                            { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
                            { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
                            { data: 'probability', title: 'Probability' },
                            { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
                            { data: 'description', title: 'Description' }
                        ]
                    });
                }
            });
        }
    });

    // Select row -> highlight in graph + scroll to cell if needed
    _nodesHot.addHook('afterOnCellMouseDown', (event, coords) => {
        const row = coords?.row;
        if (row == null || row < 0) return;
        const data = _nodesHot.getSourceDataAtRow(row);
        if (data && data.id) {
            try {
                highlightNodeById(data.id);
            } catch (_) { /* ignore */ }
        }
    });

    // Connections table
    const elementIds = (core.elements || core.nodes || []).map(e => e.id);
    _connectionsHot = new Handsontable(connsEl, {
        ...baseSettings,
        data: core.connections.map(c => ({ ...c })),
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
            { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
            { data: 'probability', title: 'Probability' },
            { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
            { data: 'description', title: 'Description' }
        ],
        colHeaders: ['ID', 'From', 'To', 'Probability', 'Type', 'Description'],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            console.log('🔄 Connections table changed:', changes, 'source:', source);
            debounceTable('connections', () => {
                console.log('📝 Processing connections table changes...');
                const nextConns = _connectionsHot.getSourceData().map(r => ({
                    id: String(r.id || `${r.fromId || ''}->${r.toId || ''}`).trim(),
                    fromId: String(r.fromId || '').trim(),
                    toId: String(r.toId || '').trim(),
                    probability: r.probability, // can be string or number
                    type: String(r.type || 'outgoing').trim(),
                    description: String(r.description || '').trim(),
                })).filter(c => c.fromId && c.toId);
                console.log('🚀 Calling updateFromTable with:', nextConns.length, 'connections');
                core.updateFromTable('connections', nextConns);
            });
        }
    });

    // Variables table (object <-> rows of {key, value})
    const toVarRows = (vars) => Object.entries(vars || {}).map(([key, value]) => ({ key, value }));
    const fromVarRows = (rows) => {
        const o = {};
        (rows || []).forEach(r => {
            const k = String(r.key || '').trim();
            if (!k) return;
            const num = typeof r.value === 'number' ? r.value : parseFloat(r.value);
            if (!Number.isNaN(num)) o[k] = num;
        });
        return o;
    };

    _variablesHot = new Handsontable(varsEl, {
        ...baseSettings,
        data: toVarRows(core.variables),
        columns: [
            { data: 'key', title: 'Key' },
            { data: 'value', title: 'Value', type: 'numeric', numericFormat: { pattern: '0[.]000' } }
        ],
        colHeaders: ['Key', 'Value'],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            debounceTable('variables', () => {
                const kv = fromVarRows(_variablesHot.getSourceData());
                core.updateFromTable('variables', kv);
            });
        }
    });

    // Wire Save to Server button
    const saveToServerBtn = document.getElementById('save-to-server');
    if (saveToServerBtn) {
        saveToServerBtn.onclick = async () => {
            const { saveToFiles } = await import('./fileManager.js');
            const success = await saveToFiles(core.elements || core.nodes, core.connections, core.variables);
            
            const statusMsg = success 
                ? '✅ Saved to server!' 
                : '⚠️ Server unavailable';
            
            // Show status temporarily
            saveToServerBtn.textContent = statusMsg;
            saveToServerBtn.style.backgroundColor = success ? '#28a745' : '#dc3545';
            
            setTimeout(() => {
                saveToServerBtn.textContent = '💾 Save to Server';
                saveToServerBtn.style.backgroundColor = '';
            }, 2000);
        };
    }

    // Wire Export Data button (downloads JSON files for backup/sharing)
    const exportDataBtn = document.getElementById('export-data');
    if (exportDataBtn) {
        exportDataBtn.onclick = async () => {
            const { downloadJsonFile } = await import('./utils.js');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            
            // Download individual files
            downloadJsonFile(core.elements || [], `elements_${timestamp}.json`);
            downloadJsonFile(core.connections || [], `connections_${timestamp}.json`);
            downloadJsonFile(core.variables || {}, `variables_${timestamp}.json`);
            
            // Download combined file
            const combined = {
                elements: core.elements || [],
                connections: core.connections || [],
                variables: core.variables || {},
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            downloadJsonFile(combined, `workflow_${timestamp}.json`);
            
            // Show status temporarily
            exportDataBtn.textContent = '✅ Downloaded!';
            exportDataBtn.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                exportDataBtn.textContent = '📤 Export Data';
                exportDataBtn.style.backgroundColor = '';
            }, 2000);
        };
    }

    // Add Row: insert into the active tab's table
    const addRowBtn = document.getElementById('add-row');
    if (addRowBtn) {
        addRowBtn.onclick = () => {
            const tabs = Array.from(document.querySelectorAll('#editor-panel .tabs li'));
            const activeIdx = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
            if (activeIdx === 0 && _nodesHot) {
                const rows = _nodesHot.countRows();
                if (rows > 0) {
                    _nodesHot.alter('insert_row_below', rows - 1, 1);
                } else {
                    _nodesHot.alter('insert_row_above', 0, 1);
                }
                _nodesHot.selectCell(_nodesHot.countRows() - 1, 0);
            } else if (activeIdx === 1 && _connectionsHot) {
                const rows = _connectionsHot.countRows();
                if (rows > 0) {
                    _connectionsHot.alter('insert_row_below', rows - 1, 1);
                } else {
                    _connectionsHot.alter('insert_row_above', 0, 1);
                }
                _connectionsHot.selectCell(_connectionsHot.countRows() - 1, 0);
            } else if (activeIdx === 2 && _variablesHot) {
                const rows = _variablesHot.countRows();
                if (rows > 0) {
                    _variablesHot.alter('insert_row_below', rows - 1, 1);
                } else {
                    _variablesHot.alter('insert_row_above', 0, 1);
                }
                _variablesHot.selectCell(_variablesHot.countRows() - 1, 0);
            }
        };
    }

    // Lightweight tab switching for the three editor sections
    const tabs = Array.from(document.querySelectorAll('#editor-panel .tabs li'));
    const sections = {
        0: document.getElementById('nodes-section'),
        1: document.getElementById('connections-section'),
        2: document.getElementById('variables-section')
    };
    tabs.forEach((tabEl, idx) => {
        tabEl.style.cursor = 'pointer';
        tabEl.onclick = () => {
            tabs.forEach((t, i) => t.setAttribute('aria-selected', i === idx ? 'true' : 'false'));
            Object.entries(sections).forEach(([i, sec]) => {
                if (!sec) return;
                if (Number(i) === idx) sec.removeAttribute('hidden'); else sec.setAttribute('hidden', 'true');
            });
            // Simple render after tab switch
            setTimeout(() => {
                try {
                    if (idx === 0 && _nodesHot) _nodesHot.render();
                    if (idx === 1 && _connectionsHot) _connectionsHot.render();  
                    if (idx === 2 && _variablesHot) _variablesHot.render();
                } catch (error) {
                    console.warn('Table render error:', error.message);
                }
            }, 50);
        };
        // Basic keyboard support: Left/Right arrows navigate tabs
        tabEl.onkeydown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const dir = e.key === 'ArrowRight' ? 1 : -1;
                const next = (idx + dir + tabs.length) % tabs.length;
                tabs[next].focus();
                tabs[next].click();
            }
        };
    });

    // Sidebar drag-to-resize
    const panel = document.getElementById('detailsPanel');
    const resizer = document.getElementById('panelResizer');
    if (panel && resizer) {
        let startX = 0;
        let startWidth = 0;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const newW = Math.max(320, startWidth - dx); // dragging handle left of panel
            panel.style.width = newW + 'px';
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        resizer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = panel.getBoundingClientRect().width;
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    }
}

/**
 * Show the Variables section (placeholder until tab interactions are added).
 */
export function showVariablesUI() {
    document.getElementById('nodes-section')?.setAttribute('hidden', 'true');
    document.getElementById('connections-section')?.setAttribute('hidden', 'true');
    const v = document.getElementById('variables-section');
    if (v) v.removeAttribute('hidden');
}

/**
 * Highlight the row in the Nodes table that matches the given nodeId and scroll it into view.
 * @param {string} nodeId
 */
export function highlightTableRowByNodeId(nodeId) {
    try {
        if (!_nodesHot) return;
        const data = _nodesHot.getSourceData();
        const idx = data.findIndex(r => String(r.id) === String(nodeId));
        if (idx >= 0) {
            _nodesHot.selectCell(idx, 0, idx, _nodesHot.countCols() - 1, true, true);
            // Add a temporary CSS class to visualize highlight
            const trs = _nodesHot.rootElement.querySelectorAll('tbody tr');
            trs.forEach(tr => tr.classList.remove('is-selected'));
            const tr = trs[idx];
            if (tr) {
                tr.classList.add('is-selected');
                tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    } catch(_) { /* noop */ }
}

/**
 * Refresh existing Handsontable instances with new data without re-initializing.
 * Keeps event handlers and DOM intact.
 */
export function refreshEditorData(core) {
    console.log('🔄 Refreshing editor data with:', {
        elements: (core.elements || core.nodes || []).length,
        connections: (core.connections || []).length,
        variables: Object.keys(core.variables || {}).length
    });

    if (_nodesHot) {
        _nodesHot.loadData((core.elements || core.nodes || []).map(e => ({ ...e })));
    }
    if (_connectionsHot) {
        const elementIds = (core.elements || core.nodes || []).map(e => e.id);
        _connectionsHot.updateSettings({
            columns: [
                { data: 'id', title: 'ID' },
                { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
                { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
                { data: 'probability', title: 'Probability' },
                { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
                { data: 'description', title: 'Description' }
            ]
        }, false);
        _connectionsHot.loadData(core.connections.map(c => ({ ...c })));
    }
    if (_variablesHot) {
        const toVarRows = (vars) => Object.entries(vars || {}).map(([key, value]) => ({ key, value }));
        _variablesHot.loadData(toVarRows(core.variables));
    }

    // Simple resize handler
    window.addEventListener('resize', () => {
        setTimeout(() => {
            [_nodesHot, _connectionsHot, _variablesHot].forEach(hot => {
                if (hot) hot.render();
            });
        }, 100);
    });
}