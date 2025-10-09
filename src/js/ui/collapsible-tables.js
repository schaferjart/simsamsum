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
        const headerTitle = header?.querySelector('h4');
        
        // Generate a unique ID for this table based on its header text
        const tableId = headerTitle ? 
            headerTitle.textContent.trim().toLowerCase().replace(/\s+/g, '-') : 
            `table-${index}`;
        
        // Add collapsible class to table container
        tableContainer.classList.add('collapsible');
        
        // Restructure the header to separate the title from controls
        if (header && headerTitle) {
            const tableControls = header.querySelector('.table-controls');
            
            // Create a new title-only section for the clickable header
            const headerTitleOnly = document.createElement('div');
            headerTitleOnly.className = 'table-header-title';
            headerTitleOnly.appendChild(headerTitle);
            
            // Clear the header and rebuild it
            header.innerHTML = '';
            header.appendChild(headerTitleOnly);
            
            // Table controls go into the collapsible content
            if (tableControls) {
                tableControls.className = 'table-controls-collapsible';
            }
        }
        
        // Wrap all content except header in table-content div
        let content = tableContainer.querySelector('.table-content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'table-content';
            
            // Move all children except header into content wrapper
            // This includes: editor-table, column-toggle-popup, and table-controls
            const children = Array.from(tableContainer.children);
            children.forEach(child => {
                if (!child.classList.contains('table-header')) {
                    content.appendChild(child);
                }
            });
            
            // Add table controls to the top of the content if they exist
            const tableControls = header?.querySelector('.table-controls-collapsible');
            if (tableControls) {
                content.insertBefore(tableControls, content.firstChild);
            }
            
            tableContainer.appendChild(content);
        }
        
        // Apply saved state
        if (state[tableId]) {
            tableContainer.classList.add('collapsed');
            if (header) {
                header.setAttribute('aria-expanded', 'false');
            }
        } else {
            if (header) {
                header.setAttribute('aria-expanded', 'true');
            }
        }
        
        // Set up click handler on entire header (matching control panel behavior)
        if (header) {
            // Make header accessible
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            
            // Click handler - entire header is clickable
            const handleToggle = (e) => {
                // Don't toggle if clicking on buttons or other interactive elements
                // (they're now in the content area, so this check is simpler)
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
        
        container.classList.remove('table-container--collapsed');
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
        
        container.classList.add('table-container--collapsed');
        const header = container.querySelector('.table-header');
        if (header) {
            header.setAttribute('aria-expanded', 'false');
        }
        state[tableId] = true;
    });
    saveState(state);
}
