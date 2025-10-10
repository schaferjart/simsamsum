/**
 * Table Search Functionality
 * Provides search/filter capabilities for Handsontable instances
 */

let _searchInstances = new Map(); // Map of tableId -> { hot, searchInput }

/**
 * Initialize search functionality for a Handsontable instance
 * @param {string} tableId - Identifier for the table (e.g., 'elements', 'connections', 'variables')
 * @param {Handsontable} hotInstance - The Handsontable instance
 * @param {string} inputId - The ID of the search input element
 */
export function initTableSearch(tableId, hotInstance, inputId) {
    const searchInput = document.getElementById(inputId);
    if (!searchInput || !hotInstance) {
        console.warn(`Cannot initialize search for ${tableId}: missing input or table instance`);
        return;
    }

    // Store the instance reference
    _searchInstances.set(tableId, { hot: hotInstance, searchInput });

    // Add input event listener with debouncing
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            performSearch(tableId, e.target.value);
        }, 200); // 200ms debounce
    });

    // Clear search on Escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            performSearch(tableId, '');
        }
    });
}

/**
 * Perform search on a table
 * @param {string} tableId - The table identifier
 * @param {string} searchTerm - The search term
 */
function performSearch(tableId, searchTerm) {
    const instance = _searchInstances.get(tableId);
    if (!instance) return;

    const { hot } = instance;
    const term = searchTerm.toLowerCase().trim();

    if (!term) {
        // Clear all filters if search is empty
        const filtersPlugin = hot.getPlugin('filters');
        filtersPlugin.clearConditions();
        filtersPlugin.filter();
        hot.render();
        return;
    }

    // Get all data
    const data = hot.getData();
    const columns = hot.getColHeader();
    
    // Create an array to track which rows match
    const matchingRows = new Set();

    // Search through all cells
    data.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
            if (cell !== null && cell !== undefined) {
                const cellValue = String(cell).toLowerCase();
                if (cellValue.includes(term)) {
                    matchingRows.add(rowIndex);
                }
            }
        });
    });

    // Use Handsontable's filters plugin to show only matching rows
    const filtersPlugin = hot.getPlugin('filters');
    filtersPlugin.clearConditions();

    if (matchingRows.size > 0) {
        // Add a custom filter that shows only matching rows
        const conditionsMeta = {
            conditions: [{
                name: 'by_value',
                args: [Array.from(matchingRows)]
            }],
            column: 0, // Apply to first column (but check all in the condition)
            operation: 'conjunction'
        };

        // Instead of using the filters plugin's conditions (which are column-specific),
        // we'll hide non-matching rows manually
        const allRowIndexes = Array.from({ length: data.length }, (_, i) => i);
        const rowsToHide = allRowIndexes.filter(i => !matchingRows.has(i));
        
        // Use the hiddenRows plugin instead
        const hiddenRowsPlugin = hot.getPlugin('hiddenRows');
        if (hiddenRowsPlugin) {
            hiddenRowsPlugin.showRows(allRowIndexes); // Show all first
            hiddenRowsPlugin.hideRows(rowsToHide); // Then hide non-matching
            hot.render();
        }
    } else {
        // No matches - hide all rows
        const allRowIndexes = Array.from({ length: data.length }, (_, i) => i);
        const hiddenRowsPlugin = hot.getPlugin('hiddenRows');
        if (hiddenRowsPlugin) {
            hiddenRowsPlugin.hideRows(allRowIndexes);
            hot.render();
        }
    }
}

/**
 * Clear search for a specific table
 * @param {string} tableId - The table identifier
 */
export function clearTableSearch(tableId) {
    const instance = _searchInstances.get(tableId);
    if (!instance) return;

    instance.searchInput.value = '';
    performSearch(tableId, '');
}

/**
 * Clear all table searches
 */
export function clearAllTableSearches() {
    _searchInstances.forEach((instance, tableId) => {
        clearTableSearch(tableId);
    });
}

/**
 * Get current search term for a table
 * @param {string} tableId - The table identifier
 * @returns {string} - The current search term
 */
export function getSearchTerm(tableId) {
    const instance = _searchInstances.get(tableId);
    return instance ? instance.searchInput.value : '';
}
