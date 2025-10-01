import { initializeApp } from './js/core.js';
import { initGitInfo } from './js/gitInfo.js';
import { ThemeManager } from './js/theme.js';

/**
 * Main entry point for the application.
 * This script waits for the DOM to be fully loaded and then
 * initializes the main application logic from `core.js`.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize theme manager first
    window.themeManager = new ThemeManager();
    
    await initializeApp();
    // Initialize Git metadata in header (non-blocking)
    initGitInfo({ refreshMs: 60000 });
});