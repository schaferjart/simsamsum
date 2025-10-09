import { showStatus, generateIdFromName } from '../utils.js';
import { highlightNodeById } from '../render/index.js';
import { initializeCollapsibleTables } from './collapsible-tables.js';

// --- Table Editors (Handsontable) ---
let _nodesHot = null;
let _connectionsHot = null;
let _variablesHot = null;
let _debounceTimers = { nodes: null, connections: null, variables: null };
// Track selection state for table highlighting (used by Handsontable cells() callbacks)
let _selectedRowIds = new Set();
// Track currently active table to route keyboard undo/redo
let _activeHot = null;
// Flag to prevent selection sync during initialization/programmatic operations
let _allowSelectionSync = false;

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
        elementsEl.innerHTML = '<div style="padding:8px;">Handsontable not installed. Run: npm i handsontable</div>';
        connsEl.innerHTML = '';
        varsEl.innerHTML = '';
        return;
    }

    const normalizeText = (value) => (value === null || value === undefined) ? '' : String(value).trim();
    const normalizeMixed = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'number') return value;
        return String(value).trim();
    };

    const baseSettings = {
        licenseKey: 'non-commercial-and-evaluation',
        rowHeaders: true,
        height: '100%', // Stretch to container
        width: '100%',
        contextMenu: true,
    undoRedo: true,
        minSpareRows: 1,
        hiddenColumns: true, // Enable plugin
        manualColumnResize: true, // Allow user resizing
        filters: true, // Enable column filters
        dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar'],
    };

    // Elements table (formerly nodes)
    const elementTypes = ['Resource', 'Action', 'State', 'Decision'];
    const executionTypes = ['Automatic', 'Manual', 'Applicant', 'Noemie', 'Gil'];
    const subTypes = ['Job Portal', 'Form Incoming', 'SMS', 'Call', 'Mail', 'Video Incoming', 'Out', 'Checkpoint', 'State'];
    _nodesHot = new Handsontable(elementsEl, {
        ...baseSettings,
        data: (core.elements || core.nodes || []).map(e => ({ ...e })),
        afterFilter: () => {
            // Temporarily disable selection sync during filter operations
            const wasAllowed = _allowSelectionSync;
            _allowSelectionSync = false;

            syncTableFiltersToRules(_nodesHot, 'node', () => core.applyFiltersAndStyles());

            // Re-enable after a short delay
            setTimeout(() => {
                _allowSelectionSync = wasAllowed;
            }, 100);
        },
        afterSelectionEnd: (row, column, row2, column2, selectionLayerLevel) => {
            // Sync table row selection to visualization
            // Only sync on user selection, not programmatic (like filter-based selections)
            if (!_allowSelectionSync) return; // Ignore during initialization
            if (!core || !core.selectionManager) return;
            if (selectionLayerLevel !== 0) return; // Ignore non-primary selections

            // Validate row indices
            if (row === undefined || row2 === undefined || row < 0 || row2 < 0) return;

            const selectedRows = new Set();

            // Only get the current selection layer, not all selections
            const minRow = Math.min(row, row2);
            const maxRow = Math.max(row, row2);

            // Get PHYSICAL (visible) row indices, not logical source indices
            for (let visualRow = minRow; visualRow <= maxRow; visualRow++) {
                const physicalRow = _nodesHot.toPhysicalRow(visualRow);
                if (physicalRow !== null && physicalRow !== undefined && physicalRow >= 0) {
                    selectedRows.add(physicalRow);
                }
            }

            // Convert physical row indices to node IDs
            const data = _nodesHot.getSourceData();
            const nodeIds = Array.from(selectedRows)
                .map(physicalIdx => data[physicalIdx]?.id)
                .filter(id => id);

            // Count visible rows to detect if this is a genuine selection or accidental "all"
            const countRows = _nodesHot.countRows();
            const selectedCount = maxRow - minRow + 1;

            // Only sync if:
            // 1. We have IDs to select
            // 2. Selection is reasonable (not all source data when table shows filtered subset)
            if (nodeIds.length > 0) {
                // Prevent sync if selecting way more than visible rows (indicates wrong index mapping)
                if (nodeIds.length > countRows * 2) {
                    console.warn('⚠️ Selection anomaly detected, skipping sync:', nodeIds.length, 'IDs from', selectedCount, 'rows');
                    return;
                }
                console.log('📋 Table selection → Visualization:', nodeIds);
                core.selectionManager.selectMultiple(nodeIds);
            } else {
                core.selectionManager.clearSelection();
            }
        },
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'name', title: 'Name' },
            { data: 'incomingNumber', title: 'Incoming Number', type: 'text' },
            { data: 'computedIncomingNumber', title: 'Incoming (calculated)', type: 'numeric', readOnly: true, numericFormat: { pattern: '0[.]00' } },
            { data: 'type', title: 'Type', type: 'dropdown', source: elementTypes },
            { data: 'subType', title: 'Sub Type', type: 'dropdown', source: subTypes },
            { data: 'aOR', title: 'AOR' },
            { data: 'execution', title: 'Execution', type: 'dropdown', source: executionTypes },
            { data: 'account', title: 'Account' },
            { data: 'platform', title: 'Platform' },
            { data: 'monitoring', title: 'Monitoring' },
            { data: 'monitoredData', title: 'Monitored Data' },
            { data: 'description', title: 'Description' },
            { data: 'avgCostTime', title: 'Avg Cost Time' },
            { data: 'avgCost', title: 'Avg Cost', type: 'text' },
            { data: 'effectiveCost', title: 'Effective Cost', type: 'numeric', readOnly: true, numericFormat: { pattern: '0[.]00' } },
            { data: 'lastUpdate', title: 'Last Update' },
            { data: 'nextUpdate', title: 'Next Update' },
            { data: 'kPI', title: 'KPI' },
            { data: 'scheduleStart', title: 'Schedule Start' },
            { data: 'scheduleEnd', title: 'Schedule End' },
            { data: 'frequency', title: 'Frequency' }
        ],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData' || source === 'compute') return;
            console.log('🔄 Elements table changed:', changes, 'source:', source);
            debounceTable('elements', () => {
                console.log('📝 Processing elements table changes...');
                const nextElements = _nodesHot.getSourceData().map((r) => {
                    const name = normalizeText(r.name || '');
                    let id = normalizeText(r.id || '');
                    if (!id && name) {
                        id = generateIdFromName(name);
                        if (id) {
                            r.id = id;
                        }
                    }

                    if (!id) return null;

                    const variableRaw = normalizeMixed(r.variable);
                    const effectiveCostValue = typeof r.effectiveCost === 'number'
                        ? r.effectiveCost
                        : (normalizeText(r.effectiveCost) === '' ? '' : parseFloat(r.effectiveCost) || '');

                    return {
                        id,
                        name,
                        incomingNumber: normalizeMixed(r.incomingNumber),
                        variable: variableRaw === '' ? 1.0 : variableRaw,
                        type: normalizeText(r.type || ''),
                        subType: normalizeText(r.subType || ''),
                        aOR: normalizeText(r.aOR || ''),
                        execution: normalizeText(r.execution || 'Manual') || 'Manual',
                        account: normalizeText(r.account || ''),
                        platform: normalizeText(r.platform || ''),
                        monitoring: normalizeText(r.monitoring || ''),
                        monitoredData: normalizeText(r.monitoredData || ''),
                        description: normalizeText(r.description || ''),
                        avgCostTime: normalizeText(r.avgCostTime || ''),
                        avgCost: normalizeMixed(r.avgCost),
                        effectiveCost: effectiveCostValue,
                        lastUpdate: normalizeText(r.lastUpdate || ''),
                        nextUpdate: normalizeText(r.nextUpdate || ''),
                        kPI: normalizeText(r.kPI || ''),
                        scheduleStart: normalizeText(r.scheduleStart || ''),
                        scheduleEnd: normalizeText(r.scheduleEnd || ''),
                        frequency: normalizeText(r.frequency || '')
                    };
                }).filter(Boolean);
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
                            { data: 'time', title: 'Time' },
                            { data: 'condition', title: 'Condition' },
                            { data: 'execution', title: 'Execution' },
                            { data: 'AOR', title: 'AOR' },
                            { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
                            { data: 'description', title: 'Description' }
                        ]
                    });
                }
            });
        }
    });

    // Connections table
    const elementIds = (core.elements || core.nodes || []).map(e => e.id);
    _connectionsHot = new Handsontable(connsEl, {
        ...baseSettings,
        data: core.connections.map(c => ({ ...c })),
        afterFilter: () => {
            syncTableFiltersToRules(_connectionsHot, 'connection', () => core.applyFiltersAndStyles());
        },
        columns: [
            { data: 'id', title: 'ID' },
            { data: 'fromId', title: 'From', type: 'dropdown', source: elementIds },
            { data: 'toId', title: 'To', type: 'dropdown', source: elementIds },
            { data: 'probability', title: 'Probability' },
            { data: 'time', title: 'Time' },
            { data: 'condition', title: 'Condition' },
            { data: 'execution', title: 'Execution' },
            { data: 'AOR', title: 'AOR' },
            { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
            { data: 'description', title: 'Description' }
        ],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            console.log('🔄 Connections table changed:', changes, 'source:', source);
            debounceTable('connections', () => {
                console.log('📝 Processing connections table changes...');
                const nextConns = _connectionsHot.getSourceData().map((r) => {
                    const fromId = String(r.fromId || '').trim();
                    const toId = String(r.toId || '').trim();
                    let id = String(r.id || '').trim();
                    if (!id && fromId && toId) {
                        id = `${fromId}->${toId}`;
                        r.id = id;
                    }
                    return {
                        id,
                        fromId,
                        toId,
                        probability: normalizeMixed(r.probability),
                        time: normalizeText(r.time || ''),
                        condition: normalizeText(r.condition || ''),
                        execution: normalizeText(r.execution || ''),
                        AOR: normalizeText(r.AOR || ''),
                        type: normalizeText(r.type || ''),
                        description: normalizeText(r.description || '')
                    };
                }).filter(c => c.id && c.fromId && c.toId);
                console.log('🚀 Calling updateFromTable with:', nextConns.length, 'connections');
                core.updateFromTable('connections', nextConns);
                if (_variablesHot) {
                    _variablesHot.loadData(toVarRows(core.variables, core.generatedVariables, core.usedGeneratedVariables));
                }
            });
        }
    });

    _connectionsHot.addHook('afterOnCellMouseDown', () => setActiveHot(_connectionsHot));

    // Variables table (object <-> rows of {key, value})
    const toVarRows = (manualVars, generatedVars, usedSet) => {
        const rows = [];

        // Always show manual variables
        Object.entries(manualVars || {}).forEach(([key, value]) => {
            rows.push({
                key,
                value,
                source: 'Manual'
            });
        });

        // Only show generated variables that are actual numeric values
        // Don't show connection references to other variables (string values)
        Object.entries(generatedVars || {}).forEach(([key, value]) => {
            // Skip if already in manual variables (manual takes precedence)
            if (Object.prototype.hasOwnProperty.call(manualVars || {}, key)) {
                return;
            }
            // Only show if it's a numeric value (actual probability)
            // Don't show string references like "pick_up_rate" - those are just pointers
            if (typeof value === 'number') {
                rows.push({
                    key,
                    value,
                    source: 'Connection'
                });
            }
        });

        return rows;
    };

    const fromVarRows = (rows) => {
        const o = {};
        (rows || []).forEach(r => {
            const source = String(r.source || '').toLowerCase();
            if (source === 'connection') return;
            const k = String(r.key || '').trim();
            if (!k) return;
            const value = r.value;
            if (value === null || value === undefined || value === '') return;
            if (typeof value === 'number') {
                o[k] = value;
                return;
            }
            const trimmed = String(value).trim();
            if (!trimmed) return;
            o[k] = trimmed;
        });
        return o;
    };

    _variablesHot = new Handsontable(varsEl, {
        ...baseSettings,
    data: toVarRows(core.variables, core.generatedVariables, core.usedGeneratedVariables),
        columns: [
            { data: 'key', title: 'Key' },
            { data: 'value', title: 'Value', type: 'text' },
            { data: 'source', title: 'Source', readOnly: true }
        ],
        afterChange: (changes, source) => {
            if (!changes || source === 'loadData') return;
            debounceTable('variables', () => {
                const kv = fromVarRows(_variablesHot.getSourceData());
                core.updateFromTable('variables', kv);
                if (_variablesHot) {
                    _variablesHot.loadData(toVarRows(core.variables, core.generatedVariables, core.usedGeneratedVariables));
                }
            });
        },
        cells(row) {
            const rowData = _variablesHot?.getSourceDataAtRow(row);
            if (rowData && String(rowData.source || '').toLowerCase() === 'connection') {
                return { readOnly: true };
            }
            return {};
        }
    });

    // Configure cell-level highlighting with custom renderers to explicitly add/remove classes
    const applyCellsHighlighting = () => {
        const TextRenderer = Handsontable.renderers.TextRenderer;
        if (_nodesHot) {
            _nodesHot.updateSettings({
                cells(row, col) {
                    return {
                        renderer(instance, td, r, c, prop, value, cellProperties) {
                            TextRenderer.apply(this, arguments);
                            const dataRow = instance.getSourceDataAtRow(r);
                            const sel = dataRow && _selectedRowIds.has(String(dataRow.id || ''));
                            td.classList.toggle('is-selected', !!sel);
                        }
                    };
                }
            }, false);
        }
        if (_connectionsHot) {
            _connectionsHot.updateSettings({
                cells(row, col) {
                    return {
                        renderer(instance, td, r, c, prop, value, cellProperties) {
                            TextRenderer.apply(this, arguments);
                            const dataRow = instance.getSourceDataAtRow(r);
                            const fromId = String(dataRow?.fromId || '');
                            const toId = String(dataRow?.toId || '');
                            const sel = (fromId && _selectedRowIds.has(fromId)) || (toId && _selectedRowIds.has(toId));
                            td.classList.toggle('is-selected', !!sel);
                        }
                    };
                }
            }, false);
        }
    };
    applyCellsHighlighting();

    // Wire Save to Server button
    const saveToServerBtn = document.getElementById('save-to-server');
    if (saveToServerBtn) {
        saveToServerBtn.onclick = async () => {
            const { saveToFiles } = await import('../fileManager.js');
            const success = await saveToFiles(core.elements || core.nodes, core.connections, core.variables, core.generatedVariables);

            const statusMsg = success
                ? '✅ Saved to server!'
                : '⚠️ Server unavailable';

            // Show status temporarily
            saveToServerBtn.textContent = statusMsg;
            saveToServerBtn.style.backgroundColor = success ? '#28a745' : '#dc3545';

            setTimeout(() => {
                saveToServerBtn.textContent = 'Save to Server';
                saveToServerBtn.style.backgroundColor = '';
            }, 2000);
        };
    }

    // Wire Export Data button (downloads JSON files for backup/sharing)
    const exportDataBtn = document.getElementById('export-data');
    if (exportDataBtn) {
        exportDataBtn.onclick = async () => {
            const { downloadJsonFile } = await import('../utils.js');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

            // Merge manual and generated variables for export
            const exportVariables = {
                ...(core.generatedVariables || {}),
                ...(core.variables || {})
            };

            // Download individual files
            downloadJsonFile(core.elements || [], `elements_${timestamp}.json`);
            downloadJsonFile(core.connections || [], `connections_${timestamp}.json`);
            downloadJsonFile(exportVariables, `variables_${timestamp}.json`);

            // Download combined file
            const combined = {
                elements: core.elements || [],
                connections: core.connections || [],
                variables: exportVariables,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            downloadJsonFile(combined, `workflow_${timestamp}.json`);

            // Show status temporarily
            exportDataBtn.textContent = '✅ Downloaded!';
            exportDataBtn.style.backgroundColor = '#28a745';

            setTimeout(() => {
                exportDataBtn.textContent = 'Export Data';
                exportDataBtn.style.backgroundColor = '';
            }, 2000);
        };
    }

    // Set active table on click and handle graph highlighting
    _nodesHot.addHook('afterOnCellMouseDown', (event, coords) => {
        setActiveHot(_nodesHot);
        const row = coords?.row;
        if (row == null || row < 0) return;
        const data = _nodesHot.getSourceDataAtRow(row);
        if (data && data.id) {
            try {
                highlightNodeById(data.id);
            } catch (_) { /* ignore */ }
        }
    });
    _connectionsHot.addHook('afterOnCellMouseDown', () => setActiveHot(_connectionsHot));
    _variablesHot.addHook('afterOnCellMouseDown', () => setActiveHot(_variablesHot));

    const setActiveHot = (hotInstance) => {
        _activeHot = hotInstance;
    };
    // Default active table
    _activeHot = _nodesHot;

    // All tables are created, now initialize interactions
    initUIInteractions();
    loadUIPrefs(); // Load saved sizes on startup

    // Enable selection sync after preferences load and all async operations complete
    // Delay must be longer than loadUIPrefs setTimeout (100ms) + render time
    setTimeout(() => {
        _allowSelectionSync = true;
        console.log('✅ Table selection sync enabled');
    }, 1000);

    // Ensure Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z work inside tables even if global listeners exist
    document.addEventListener('keydown', (e) => {
        const insideHot = e.target && typeof e.target.closest === 'function' && e.target.closest('.handsontable');
        if (!insideHot) return;
        const isZ = e.key === 'z' || e.key === 'Z';
        if (!isZ || !_activeHot) return;
        const isUndo = (e.metaKey || e.ctrlKey) && !e.shiftKey;
        const isRedo = (e.metaKey || e.ctrlKey) && e.shiftKey;
        if (isUndo) {
            e.preventDefault();
            e.stopPropagation();
            try { _activeHot.undo(); } catch (_) { /* noop */ }
        } else if (isRedo) {
            e.preventDefault();
            e.stopPropagation();
            try { _activeHot.redo(); } catch (_) { /* noop */ }
        }
    }, true);

    // Listen for custom event to highlight a node in the table
    document.addEventListener('show-node-in-table', (e) => {
        const nodeId = e.detail?.nodeId;
        if (nodeId) {
            highlightTableRowByNodeId(nodeId);
        }
    });
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
            // Select the first VISIBLE column to avoid jump issues when the first column is hidden
            const hiddenPlugin = _nodesHot.getPlugin('hiddenColumns');
            const cols = _nodesHot.getSettings()?.columns || [];
            const hidden = hiddenPlugin?.getHiddenColumns?.() || [];
            let firstVisibleCol = 0;
            for (let c = 0; c < cols.length; c++) {
                if (!hidden.includes(c)) { firstVisibleCol = c; break; }
            }
            _nodesHot.selectCell(idx, firstVisibleCol, idx, firstVisibleCol, true, true);
            // Add a temporary CSS class to visualize hover/focus without clearing multi-selection
            const trs = _nodesHot.rootElement.querySelectorAll('tbody tr');
            trs.forEach(tr => tr.classList.remove('is-hovered'));
            const tr = trs[idx];
            if (tr) {
                tr.classList.add('is-hovered');
                tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    } catch(_) { /* noop */ }
}

/**
 * Clears transient hover/focus highlight from the Elements table.
 */
export function clearTableRowHoverHighlight() {
    try {
        if (!_nodesHot) return;
        const trs = _nodesHot.rootElement.querySelectorAll('tbody tr');
        trs.forEach(tr => tr.classList.remove('is-hovered'));
    } catch (_) { /* noop */ }
}

/**
 * Updates row highlights in the Elements and Connections tables based on a Set of selected node IDs.
 * Elements whose id is in the set are marked selected; connections where either endpoint is in the set are marked selected.
 * @param {Set<string>} selectedNodeIds
 */
export function updateTableSelectionHighlights(selectedNodeIds) {
    // Replace selection set and re-render; cells() callback applies per-cell classes
    _selectedRowIds = new Set(Array.from(selectedNodeIds || []));
    if (_nodesHot) _nodesHot.render();
    if (_connectionsHot) _connectionsHot.render();
    // Ensure any transient hover is cleared if it doesn’t match selection anymore
    clearTableRowHoverHighlight();
}

export function updateElementComputedFields(elements = []) {
    if (!_nodesHot) return;
    const rows = _nodesHot.getSourceData() || [];
    const elementMap = new Map((elements || []).map(e => [String(e?.id ?? '').trim(), e]));

    rows.forEach((row, rowIndex) => {
        const id = String(row?.id || '').trim();
        if (!id) return;
        const source = elementMap.get(id);
        if (!source) return;

        const manualValue = source.incomingNumber;
        const isManualString = typeof manualValue === 'string' && manualValue.trim() !== '';
        const computedVolume = Number.isFinite(source.computedIncomingNumber) ? source.computedIncomingNumber : '';
        const displayVolume = computedVolume === '' ? '' : computedVolume;
        const effectiveCost = Number.isFinite(source.effectiveCost) ? source.effectiveCost : '';

        _nodesHot.setDataAtRowProp(rowIndex, 'incomingNumber', isManualString ? manualValue : displayVolume, 'compute');
        _nodesHot.setDataAtRowProp(rowIndex, 'computedIncomingNumber', displayVolume, 'compute');
        _nodesHot.setDataAtRowProp(rowIndex, 'effectiveCost', effectiveCost === '' ? '' : effectiveCost, 'compute');
    });

    _nodesHot.render();
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
                { data: 'time', title: 'Time' },
                { data: 'condition', title: 'Condition' },
                { data: 'execution', title: 'Execution' },
                { data: 'AOR', title: 'AOR' },
                { data: 'type', title: 'Type', type: 'dropdown', source: ['flow', 'dependency'] },
                { data: 'description', title: 'Description' }
            ]
        }, false);
        _connectionsHot.loadData(core.connections.map(c => ({ ...c })));
    }
    if (_variablesHot) {
        const toVarRows = (manualVars, generatedVars, usedSet) => {
            const rows = [];
            Object.entries(manualVars || {}).forEach(([key, value]) => {
                rows.push({ key, value, source: 'Manual' });
            });
            Object.entries(generatedVars || {}).forEach(([key, value]) => {
                if (usedSet && usedSet.size > 0 && !usedSet.has(key)) {
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(manualVars || {}, key)) {
                    return;
                }
                rows.push({ key, value, source: 'Connection' });
            });
            return rows;
        };
        _variablesHot.loadData(toVarRows(core.variables, core.generatedVariables, core.usedGeneratedVariables));
    }

    updateElementComputedFields(core.elements);

    // Simple resize handler
    window.addEventListener('resize', () => {
        setTimeout(() => {
            [_nodesHot, _connectionsHot, _variablesHot].forEach(hot => {
                if (hot) hot.render();
            });
        }, 100);
    });
}

function initUIInteractions() {
    initResizers();
    initColumnToggles();
    initMaximizeButtons();
    initAddRowButtons();
    
    // Initialize collapsible tables
    initializeCollapsibleTables();
}

// --- UI Preferences ---

/**
 * Saves the current UI preferences (panel/column states) to localStorage.
 */
function saveUIPrefs() {
    const getHiddenCols = (hotInstance) => {
        if (!hotInstance) return [];
        const plugin = hotInstance.getPlugin('hiddenColumns');
        return plugin && Array.isArray(plugin.getHiddenColumns()) ? plugin.getHiddenColumns() : [];
    };

    const prefs = {
        detailsPanelWidth: document.getElementById('detailsPanel').style.width,
        elementsTableFlexBasis: document.getElementById('elements-table-container').style.flexBasis,
        connectionsTableFlexBasis: document.getElementById('connections-table-container').style.flexBasis,
        variablesTableFlexBasis: document.getElementById('variables-table-container').style.flexBasis,
        hidden_elements: getHiddenCols(_nodesHot),
        hidden_connections: getHiddenCols(_connectionsHot),
        hidden_variables: getHiddenCols(_variablesHot),
    };
    console.log('[Prefs] Saving preferences:', prefs);
    localStorage.setItem('workflowUIPrefs', JSON.stringify(prefs));
}

/**
 * Loads and applies UI preferences from localStorage.
 */
function loadUIPrefs() {
    const prefsString = localStorage.getItem('workflowUIPrefs');
    console.log('[Prefs] Loading preferences string:', prefsString);
    if (!prefsString) {
        console.log('[Prefs] No preferences found.');
        return;
    }

    const prefs = JSON.parse(prefsString);
    console.log('[Prefs] Applying loaded preferences:', prefs);

    // Restore panel sizes
    if (prefs.detailsPanelWidth) {
        document.getElementById('detailsPanel').style.width = prefs.detailsPanelWidth;
    }
    if (prefs.elementsTableFlexBasis) {
        document.getElementById('elements-table-container').style.flexBasis = prefs.elementsTableFlexBasis;
    }
    if (prefs.connectionsTableFlexBasis) {
        document.getElementById('connections-table-container').style.flexBasis = prefs.connectionsTableFlexBasis;
    }
    if (prefs.variablesTableFlexBasis) {
        document.getElementById('variables-table-container').style.flexBasis = prefs.variablesTableFlexBasis;
    }

    // Restore hidden columns
    const setHiddenCols = (hotInstance, key) => {
        if (hotInstance && prefs[key] && Array.isArray(prefs[key])) {
            const plugin = hotInstance.getPlugin('hiddenColumns');
            if (plugin) {
                setTimeout(() => {
                    plugin.hideColumns(prefs[key]);
                    hotInstance.render();
                }, 100);
            }
        }
    };

    setHiddenCols(_nodesHot, 'hidden_elements');
    setHiddenCols(_connectionsHot, 'hidden_connections');
    setHiddenCols(_variablesHot, 'hidden_variables');
}

/**
 * Initializes the "Columns" buttons to toggle column visibility popups.
 */
function initColumnToggles() {
    const hotInstances = {
        elements: _nodesHot,
        connections: _connectionsHot,
        variables: _variablesHot,
    };

    document.querySelectorAll('[data-action="toggle-columns"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const tableName = button.dataset.table;
            const hot = hotInstances[tableName];
            const popup = document.querySelector(`.column-toggle-popup[data-table="${tableName}"]`);

            if (!hot || !popup) return;

            // Hide other popups
            document.querySelectorAll('.column-toggle-popup').forEach(p => {
                if (p !== popup) p.style.display = 'none';
            });

            // Toggle current popup's visibility
            if (popup.style.display === 'block') {
                popup.style.display = 'none';
                return;
            }

            // Populate popup with columns
            popup.innerHTML = '';
            const hiddenPlugin = hot.getPlugin('hiddenColumns');
            const allCols = hot.getSettings().columns;
            const hiddenCols = hiddenPlugin.getHiddenColumns() || [];

            if (!Array.isArray(allCols)) {
                return;
            }

            allCols.forEach((col, index) => {
                const isHidden = hiddenCols.includes(index);
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !isHidden;
                checkbox.dataset.colIndex = index;

                label.appendChild(checkbox);
                label.appendChild(document.createTextNode(` ${col.title}`));

                checkbox.addEventListener('change', () => {
                    const colIndex = parseInt(checkbox.dataset.colIndex, 10);
                    if (checkbox.checked) {
                        hiddenPlugin.showColumn(colIndex);
                    } else {
                        hiddenPlugin.hideColumn(colIndex);
                    }
                    hot.render();
                    saveUIPrefs();
                });

                popup.appendChild(label);
            });

            // Position and show popup
            const btnRect = button.getBoundingClientRect();
            popup.style.display = 'block';
            popup.style.top = `${btnRect.bottom + 2}px`;
            popup.style.right = `${window.innerWidth - btnRect.right}px`;

            // Prevent clicks inside the popup from closing it
            popup.addEventListener('click', (e) => e.stopPropagation());
        });
    });

    // Close popups when clicking elsewhere
    window.addEventListener('click', () => {
        document.querySelectorAll('.column-toggle-popup').forEach(p => p.style.display = 'none');
    });
}

/**
 * Initializes the maximize/minimize buttons for each table container.
 */
function initMaximizeButtons() {
    document.querySelectorAll('[data-action="toggle-maximize"]').forEach(button => {
        button.addEventListener('click', () => {
            const tableName = button.dataset.table;
            const targetContainer = document.getElementById(`${tableName}-table-container`);
            if (!targetContainer) return;

            const isMaximized = targetContainer.classList.contains('maximized');

            // Reset all first
            document.querySelectorAll('.table-container').forEach(c => {
                c.classList.remove('maximized', 'hidden');
            });
            document.querySelectorAll('[data-action="toggle-maximize"]').forEach(b => {
                b.textContent = '⛶'; // Restore maximize icon
            });

            if (!isMaximized) {
                // Maximize the target
                targetContainer.classList.add('maximized');
                button.textContent = '❐'; // Change to minimize icon
                // Hide others
                document.querySelectorAll('.table-container').forEach(c => {
                    if (c !== targetContainer) {
                        c.classList.add('hidden');
                    }
                });
            }
            // If it was maximized, the reset above is all that's needed.

            // Re-render all tables to adjust to new dimensions
            setTimeout(() => {
                [_nodesHot, _connectionsHot, _variablesHot].forEach(hot => {
                    if (hot) hot.render();
                });
            }, 50); // Small delay for layout to update
        });
    });
}

/**
 * Initializes the "Add Row" buttons for each table.
 */
function initAddRowButtons() {
    const hotInstances = {
        elements: _nodesHot,
        connections: _connectionsHot,
        variables: _variablesHot,
    };

    document.querySelectorAll('[data-action="add-row"]').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent header click
            const tableName = button.dataset.table;
            const hot = hotInstances[tableName];

            if (!hot) return;

            const rows = hot.countRows();
            const spareRows = hot.getSettings().minSpareRows;
            const targetRow = rows > spareRows ? rows - spareRows : rows;

            hot.alter('insert_row_below', targetRow, 1);
            hot.selectCell(targetRow + 1, 0);
            
            // Set this as the active table
            _activeHot = hot;
        });
    });
}

/**
 * Initializes all resizer elements (horizontal and vertical).
 */
function initResizers() {
    // Horizontal resizer for the main details panel
    const panel = document.getElementById('detailsPanel');
    const panelResizer = document.getElementById('panelResizer');
    if (panel && panelResizer) {
        let startX = 0;
        let startWidth = 0;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const newW = Math.max(320, startWidth - dx);
            panel.style.width = newW + 'px';
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            saveUIPrefs();
        };
        panelResizer.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            startWidth = panel.getBoundingClientRect().width;
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    }

    // Vertical resizers for tables
    document.querySelectorAll('.vertical-resizer').forEach(resizer => {
        let startY, prevElement, nextElement, prevHeight, nextHeight;

        const onMove = (e) => {
            const dy = e.clientY - startY;
            const newPrevHeight = prevHeight + dy;
            const newNextHeight = nextHeight - dy;

            if (newPrevHeight > 40 && newNextHeight > 40) { // Ensure minimum height
                prevElement.style.flexBasis = `${newPrevHeight}px`;
                nextElement.style.flexBasis = `${newNextHeight}px`;
            }
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            saveUIPrefs();
        };

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startY = e.clientY;
            prevElement = resizer.previousElementSibling;
            nextElement = resizer.nextElementSibling;

            prevHeight = prevElement.getBoundingClientRect().height;
            nextHeight = nextElement.getBoundingClientRect().height;

            // Set flex properties to make flex-basis authoritative during drag
            prevElement.style.flexGrow = '0';
            prevElement.style.flexShrink = '0';
            nextElement.style.flexGrow = '0';
            nextElement.style.flexShrink = '0';

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    });
}