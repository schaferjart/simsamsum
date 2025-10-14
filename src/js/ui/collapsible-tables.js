/**
 * Collapsible tables functionality
 * Manages expand/collapse state of editor tables with localStorage persistence
 * Matches the control panel collapsible behavior
 */

const STORAGE_KEY = 'workflow-collapsible-tables-state';

/**
 * Get the saved collapse state from localStorage
 * @returns {Object} Map of table IDs to their collapsed state
 */
function getSavedState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('Failed to load collapsible tables state:', error);
        return {};
    }
}

/**
 * Save the collapse state to localStorage
 * @param {Object} state - Map of table IDs to their collapsed state
 */
function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn('Failed to save collapsible tables state:', error);
    }
}

/**
 * Toggle the collapsed state of a table container
 * @param {HTMLElement} tableContainer - The table container element
 * @param {string} tableId - Unique identifier for the table
 * @param {Object} state - Current state object
 */
function toggleTableContainer(tableContainer, tableId, state) {
    const isCollapsed = tableContainer.classList.toggle('collapsed');
    state[tableId] = isCollapsed;
    saveState(state);
    
    // Announce state change for screen readers
    const header = tableContainer.querySelector('.table-header');
    if (header) {
        header.setAttribute('aria-expanded', !isCollapsed);
    }
}

/**
 * Initialize collapsible functionality for all table containers
 * Matches the control panel collapsible groups implementation
 */
export function initializeCollapsibleTables() {
    const state = getSavedState();
    const tableContainers = document.querySelectorAll('.table-container');
    
    tableContainers.forEach((tableContainer, index) => {
        const header = tableContainer.querySelector('.table-header');
        const headerTitle = header?.querySelector('h4, h3');

        if (!header) {
            return;
        }

        // Generate a unique ID for this table based on its header text
        const tableId = headerTitle ?
            headerTitle.textContent.trim().toLowerCase().replace(/\s+/g, '-') :
            `table-${index}`;

        // Add collapsible class to table container
        tableContainer.classList.add('collapsible');

        // Check if already initialized
        if (tableContainer.querySelector('.table-content')) {
            return; // Already initialized
        }

        // Create content wrapper
        const content = document.createElement('div');
        content.className = 'table-content';

        // Get table controls from header (we'll move them)
    const tableControls = header.querySelector('.table-controls');
    const tableSearch = tableContainer.querySelector('.table-search');

        // Collect all children except the header to move into content
        const childrenToMove = Array.from(tableContainer.children).filter(child => 
            child !== header
        );

        // Compose actions row (search + controls)
        const hasActions = tableControls || tableSearch;
        let actionsWrapper = null;
        if (hasActions) {
            actionsWrapper = document.createElement('div');
            actionsWrapper.className = 'table-actions';

            if (tableSearch) {
                actionsWrapper.appendChild(tableSearch);
            }

            if (tableControls) {
                actionsWrapper.appendChild(tableControls);
            }

            content.appendChild(actionsWrapper);
        }

        // Move all other children (editor-table, column-toggle-popup, etc.)
        childrenToMove.forEach(child => {
            if (child === tableControls || child === tableSearch || child === actionsWrapper) {
                return;
            }
            content.appendChild(child);
        });

        // Append the content wrapper to the container
        tableContainer.appendChild(content);
        
        // Apply saved state
        if (state[tableId]) {
            tableContainer.classList.add('collapsed');
            if (header) {
                header.setAttribute('aria-expanded', 'false');
            }
        } else {
            header.setAttribute('aria-expanded', 'true');
        }
        
        // Set up click handler on entire header (matching control panel behavior)
        if (header) {
            // Make header accessible
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            
            // Click handler - entire header is clickable
            const handleToggle = (e) => {
                // Prevent toggling when interacting with controls that live in content
                if (e.target.closest('.table-controls') || e.target.closest('.column-toggle-popup')) {
                    return;
                }
                toggleTableContainer(tableContainer, tableId, state);
            };
            
            header.addEventListener('click', handleToggle);
            
            // Keyboard handler
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(e);
                }
            });
        }
    });
}

/**
 * Expand all table containers
 */
export function expandAllTables() {
    const state = getSavedState();
    document.querySelectorAll('.table-container').forEach((container) => {
        const tableId = container.id;
        if (!tableId) return;
        
        container.classList.remove('collapsed');
        const header = container.querySelector('.table-header');
        if (header) {
            header.setAttribute('aria-expanded', 'true');
        }
        state[tableId] = false;
    });
    saveState(state);
}

/**
 * Collapse all table containers
 */
export function collapseAllTables() {
    const state = getSavedState();
    document.querySelectorAll('.table-container').forEach((container) => {
        const tableId = container.id;
        if (!tableId) return;
        
        container.classList.add('collapsed');
        const header = container.querySelector('.table-header');
        if (header) {
            header.setAttribute('aria-expanded', 'false');
        }
        state[tableId] = true;
    });
    saveState(state);
}
