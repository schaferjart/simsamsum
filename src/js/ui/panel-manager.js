/**
 * Shows the details panel with information about the selected node.
 * This is repurposed to ensure the editor sidebar is visible, switch to the
 * correct tab, and dispatch an event to trigger highlighting in the table.
 * @param {object} node - The data object for the selected node.
 */
export function showNodeDetails(node) {
    const panel = document.getElementById('detailsPanel');
    if (panel) panel.classList.remove('hidden');

    // Simple tab handling: show Nodes section and hide others
    const nodesSection = document.getElementById('nodes-section');
    const connsSection = document.getElementById('connections-section');
    const varsSection = document.getElementById('variables-section');
    nodesSection?.removeAttribute('hidden');
    connsSection?.setAttribute('hidden', 'true');
    varsSection?.setAttribute('hidden', 'true');

    // Dispatch an event for the table manager to handle highlighting
    const event = new CustomEvent('show-node-in-table', { detail: { nodeId: node.id } });
    document.dispatchEvent(event);
}

/**
 * Hides the details panel.
 */
export function hideDetailsPanel() {
    const panel = document.getElementById('detailsPanel');
    const showBtn = document.getElementById('showEditorBtn');
    if (!panel) return;

    // Toggle the hidden state
    const isHidden = panel.classList.toggle('hidden');

    // Update close button text to indicate current state
    const closeBtn = document.getElementById('closePanelBtn');
    if (closeBtn) {
        closeBtn.innerHTML = isHidden ? '↑' : '×';
        closeBtn.title = isHidden ? 'Show Editor Panel' : 'Hide Editor Panel';
    }

    // Toggle floating show button
    if (showBtn) {
        if (isHidden) {
            showBtn.classList.remove('hidden');
        } else {
            showBtn.classList.add('hidden');
        }
    }

    // Trigger a resize event to ensure the visualization adjusts to the new space
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

/**
 * Toggles the visibility of the main controls panel.
 */
export function toggleControlsPanel() {
    const panel = document.getElementById('controlsPanel');
    if (!panel) return;
    panel.classList.toggle('collapsed');

    // Trigger a resize event to ensure the visualization adjusts to the new space
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 300); // Wait for CSS transition to complete
}