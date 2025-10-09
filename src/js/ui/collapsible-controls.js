/**
 * Collapsible control groups functionality
 * Manages expand/collapse state of control panel sections with localStorage persistence
 */

const STORAGE_KEY = 'workflow-collapsible-state';

/**
 * Get the saved collapse state from localStorage
 * @returns {Object} Map of section IDs to their collapsed state
 */
function getSavedState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (error) {
        console.warn('Failed to load collapsible state:', error);
        return {};
    }
}

/**
 * Save the collapse state to localStorage
 * @param {Object} state - Map of section IDs to their collapsed state
 */
function saveState(state) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.warn('Failed to save collapsible state:', error);
    }
}

/**
 * Toggle the collapsed state of a control group
 * @param {HTMLElement} controlGroup - The control group element
 * @param {string} sectionId - Unique identifier for the section
 * @param {Object} state - Current state object
 */
function toggleControlGroup(controlGroup, sectionId, state) {
    const isCollapsed = controlGroup.classList.toggle('control-group--collapsed');
    state[sectionId] = isCollapsed;
    saveState(state);
    
    // Announce state change for screen readers
    const header = controlGroup.querySelector('.control-group__header');
    if (header) {
        header.setAttribute('aria-expanded', !isCollapsed);
    }
}

/**
 * Initialize collapsible functionality for all control groups
 */
export function initializeCollapsibleControls() {
    const state = getSavedState();
    const controlGroups = document.querySelectorAll('.control-group');
    
    controlGroups.forEach((controlGroup, index) => {
        // Generate a unique ID for this section based on its label or index
        const label = controlGroup.querySelector('.form-label');
        const sectionId = controlGroup.id || 
                         (label ? label.textContent.trim().toLowerCase().replace(/\s+/g, '-') : `section-${index}`);
        
        // Find or create header
        let header = controlGroup.querySelector('.control-group__header');
        if (!header) {
            // Wrap existing label in header structure
            header = document.createElement('div');
            header.className = 'control-group__header';
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
            header.setAttribute('aria-expanded', 'true');
            
            const title = document.createElement('h3');
            title.className = 'control-group__title';
            
            if (label) {
                title.textContent = label.textContent;
                label.remove();
            } else {
                title.textContent = `Section ${index + 1}`;
            }
            
            const toggle = document.createElement('span');
            toggle.className = 'control-group__toggle';
            toggle.setAttribute('aria-hidden', 'true');
            
            header.appendChild(title);
            header.appendChild(toggle);
            controlGroup.insertBefore(header, controlGroup.firstChild);
        }
        
        // Wrap content if not already wrapped
        let content = controlGroup.querySelector('.control-group__content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'control-group__content';
            
            // Move all children except header into content wrapper
            const children = Array.from(controlGroup.children);
            children.forEach(child => {
                if (child !== header) {
                    content.appendChild(child);
                }
            });
            controlGroup.appendChild(content);
        }
        
        // Restore saved state
        if (state[sectionId]) {
            controlGroup.classList.add('control-group--collapsed');
            header.setAttribute('aria-expanded', 'false');
        }
        
        // Add click handler
        header.addEventListener('click', () => {
            toggleControlGroup(controlGroup, sectionId, state);
        });
        
        // Add keyboard handler
        header.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleControlGroup(controlGroup, sectionId, state);
            }
        });
    });
    
    console.log('✅ Collapsible controls initialized');
}

/**
 * Expand all control groups
 */
export function expandAll() {
    const state = getSavedState();
    document.querySelectorAll('.control-group').forEach((group, index) => {
        const label = group.querySelector('.control-group__title');
        const sectionId = group.id || 
                         (label ? label.textContent.trim().toLowerCase().replace(/\s+/g, '-') : `section-${index}`);
        
        group.classList.remove('control-group--collapsed');
        const header = group.querySelector('.control-group__header');
        if (header) {
            header.setAttribute('aria-expanded', 'true');
        }
        state[sectionId] = false;
    });
    saveState(state);
}

/**
 * Collapse all control groups
 */
export function collapseAll() {
    const state = getSavedState();
    document.querySelectorAll('.control-group').forEach((group, index) => {
        const label = group.querySelector('.control-group__title');
        const sectionId = group.id || 
                         (label ? label.textContent.trim().toLowerCase().replace(/\s+/g, '-') : `section-${index}`);
        
        group.classList.add('control-group--collapsed');
        const header = group.querySelector('.control-group__header');
        if (header) {
            header.setAttribute('aria-expanded', 'false');
        }
        state[sectionId] = true;
    });
    saveState(state);
}
