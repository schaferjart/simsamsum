/**
 * @module interactions
 * Barrel export for the user interactions module.
 * This file re-exports all public APIs from the interaction sub-modules
 * to provide a single, consistent entry point for handling user input.
 */

// Drag and Drop
export { dragStarted, dragged, dragEnded } from './drag-handler.js';

// Selection
export { handleNodeClickSelection, initShiftRectangleSelection } from './selection-handler.js';

// Keyboard
export { initKeyboardShortcuts } from './keyboard-handler.js';

// Zoom and Pan
export { handleZoom, handleResize } from './zoom-handler.js';

// Hover
export { handleMouseOver, handleMouseOut } from './hover-handler.js';