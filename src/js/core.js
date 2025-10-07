import { WorkflowVisualizer } from './core/app.js';

/**
 * Initializes the application by creating a new WorkflowVisualizer instance.
 * This is the main entry point of the application.
 */
export async function initializeApp() {
    const app = new WorkflowVisualizer();
    await app.init();
    
    // Expose for debugging
    window.workflowApp = app;
    console.log('🎯 App instance available as window.workflowApp for debugging');
    
    return app;
}