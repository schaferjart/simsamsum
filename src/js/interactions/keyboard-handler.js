/**
 * @module interactions/keyboard-handler
 * This module initializes and handles all keyboard shortcuts for the application.
 */
import { updateSelectionVisuals } from '../render/index.js';
import { updateTableSelectionHighlights } from '../ui/index.js';

/**
 * Initializes keyboard shortcuts for common actions like select all and clear selection.
 * @param {object} selectionManager - The selection manager instance.
 * @param {d3.Selection} g - The main D3 group element for visual updates.
 * @param {Array<object>} allNodes - The array of all nodes.
 */
export function initKeyboardShortcuts(selectionManager, g, allNodes) {
    document.addEventListener('keydown', (event) => {
        // Ignore shortcuts if the user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)) {
            return;
        }

        // Select all (Ctrl/Cmd + A)
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            selectionManager.selectAll(allNodes.map(n => n.id));
            // Visual updates are handled by the selectionManager's onChange handler
        }

        // Clear selection (Escape)
        if (event.key === 'Escape') {
            selectionManager.clearSelection();
            // Visual updates are handled by the selectionManager's onChange handler
        }

        // Delete selected nodes (Delete key)
        if (event.key === 'Delete' && selectionManager.getSelectionCount() > 0) {
            event.preventDefault();
            // Dispatch an event that the main application can listen to for handling deletion
            const deleteEvent = new CustomEvent('delete-selected', {
                detail: { selectedIds: selectionManager.getSelectedIds() },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(deleteEvent);
        }
    });
}