import { exportToPDF } from '../export.js';
import * as interactions from '../interactions/index.js';
import * as graphTransforms from './graph-transforms.js';

/**
 * Creates and returns an object containing all the event handler functions for the UI.
 * This factory function takes the application instance as a dependency, decoupling the
 * handler definitions from the core application class.
 * @param {object} app - The main application instance (e.g., WorkflowVisualizer).
 * @returns {Object.<string, function>} An object of handler functions.
 */
export function createEventHandlers(app) {
    return {
        applyFiltersAndStyles: () => app.applyFiltersAndStyles(),
        handleReset: () => app.resetView(),
        handleSizeToggle: (enabled) => app.handleSizeToggle(enabled),
        handleSizeColumnChange: (column) => app.handleSizeColumnChange(column),
        handleLayoutChange: (layout) => app.handleLayoutChange(layout),
        toggleGrid: () => app.toggleGrid(),
        snapAllToGrid: () => app.snapAllToGrid(),
        saveLayout: () => app.saveCurrentLayout(),
        loadLayout: (layoutName) => app.loadSavedLayout(layoutName),
        updateGridSize: (size) => app.updateGridSize(size),
        rotateGraph: (degrees) => graphTransforms.rotateGraph(app.state, degrees),
        flipGraph: (direction) => graphTransforms.flipGraph(app.state, direction),
        centerGraph: () => graphTransforms.centerGraph(app.state),
        fitToScreen: () => graphTransforms.fitToScreen(app.state),
        handleVerify: () => app.showConnectionReport(),
        handleExport: () => exportToPDF(app.state),
        handleResize: () => interactions.handleResize(app.state, app.state.svg)
    };
}