/**
 * Theme management for dark/light mode
 */

class ThemeManager {
    constructor() {
        this.currentTheme = this.getInitialTheme();
        this.init();
    }

    /**
     * Get the initial theme based on user preference or system preference
     */
    getInitialTheme() {
        // Check localStorage first
        const savedTheme = localStorage.getItem('preferred-theme');
        if (savedTheme) {
            return savedTheme;
        }

        // Fall back to system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * Initialize theme system
     */
    init() {
        this.applyTheme(this.currentTheme);
        this.setupToggleButton();
        this.setupSystemPreferenceListener();
    }

    /**
     * Apply theme to the document
     */
    applyTheme(theme) {
        const root = document.documentElement;
        const themeToggleBtn = document.getElementById('themeToggleBtn');

        if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = '☀️';
                themeToggleBtn.title = 'Switch to Light Theme';
            }
        } else {
            root.removeAttribute('data-theme');
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = '🌙';
                themeToggleBtn.title = 'Switch to Dark Theme';
            }
        }

        this.currentTheme = theme;
        localStorage.setItem('preferred-theme', theme);
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    /**
     * Set up the theme toggle button
     */
    setupToggleButton() {
        const themeToggleBtn = document.getElementById('themeToggleBtn');
        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => this.toggleTheme());
        }
    }

    /**
     * Listen for system theme changes
     */
    setupSystemPreferenceListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                // Only auto-switch if user hasn't manually set a preference
                if (!localStorage.getItem('preferred-theme')) {
                    this.applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically
     */
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.applyTheme(theme);
        }
    }
}

// Initialize theme manager when DOM is loaded
let themeManager;

document.addEventListener('DOMContentLoaded', () => {
    themeManager = new ThemeManager();
});

// Export for use in other modules
export { ThemeManager, themeManager };
