/**
 * @module interactions/keyboard-handler
 * This module initializes and handles all keyboard shortcuts for the application.
 */
import { updateSelectionVisuals } from '../render/index.js';
import { updateTableSelectionHighlights } from '../ui/index.js';

/**
 * Initializes keyboard shortcuts for common actions.
 * @param {WorkflowVisualizer} app - The main application instance.
 */
export function initKeyboardShortcuts(app) {
    const { selectionManager, state } = app;

    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isTyping = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        if (isTyping) return;

        const isCmdOrCtrl = event.ctrlKey || event.metaKey;

        // Select all (Ctrl/Cmd + A)
        if (isCmdOrCtrl && event.key.toLowerCase() === 'a') {
            event.preventDefault();
            selectionManager.selectAll(state.allNodes.map(n => n.id));
        }

        // Copy (Ctrl/Cmd + C)
        if (isCmdOrCtrl && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            app.copySelectionToClipboard();
        }

        // Paste (Ctrl/Cmd + V)
        if (isCmdOrCtrl && event.key.toLowerCase() === 'v') {
            event.preventDefault();
            app.pasteFromClipboard();
        }

        // Clear selection (Escape)
        if (event.key === 'Escape') {
            selectionManager.clearSelection();
        }

        // Delete selected nodes (Delete key)
        if (event.key === 'Delete' && selectionManager.getSelectionCount() > 0) {
            event.preventDefault();
            const deleteEvent = new CustomEvent('delete-selected', {
                detail: { selectedIds: selectionManager.getSelectedIds() },
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(deleteEvent);
        }
    });
}