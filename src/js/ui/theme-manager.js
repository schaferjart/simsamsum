/**
 * Toggles between light and dark theme.
 */
export function toggleTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    html.setAttribute('data-theme', newTheme);

    // Update button icon and tooltip
    if (themeToggle) {
        themeToggle.textContent = newTheme === 'dark' ? 'Light' : 'Dark';
        themeToggle.title = `Switch to ${newTheme === 'dark' ? 'Light' : 'Dark'} Theme`;
    }

    // Update color inputs for current theme
    updateColorInputDefaults();

    // Save theme preference
    localStorage.setItem('theme', newTheme);

    // Update any color inputs to use theme-appropriate defaults
    updateColorInputDefaults();
}

/**
 * Initializes the theme based on user preference or system preference.
 */
export function initializeTheme() {
    const html = document.documentElement;
    const themeToggle = document.getElementById('themeToggle');

    // Get saved theme or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = savedTheme || systemTheme;

    html.setAttribute('data-theme', theme);

    // Update button icon and tooltip
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? 'd' : 'l';
        themeToggle.title = `Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`;
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            if (themeToggle) {
                themeToggle.textContent = newTheme === 'dark' ? 'l' : 'd';
                themeToggle.title = `Switch to ${newTheme === 'dark' ? 'Light' : 'Dark'} Theme`;
            }
        }
    });
}

/**
 * Updates color input default values based on current theme.
 */
function updateColorInputDefaults() {
    const theme = document.documentElement.getAttribute('data-theme');
    const colorInputs = document.querySelectorAll('.color-input');

    colorInputs.forEach(input => {
        const currentColor = input.value;

        // Auto-fix problematic colors for current theme
        if (theme === 'dark' && (currentColor === '#000000' || currentColor === '' || !currentColor)) {
            input.value = '#60a5fa';
        } else if (theme === 'light' && currentColor === '#ffffff') {
            input.value = '#3b82f6';
        }
    });
}

/**
 * Gets a theme-appropriate default color for styling rules.
 */
export function getThemeAppropriateColor() {
    const theme = document.documentElement.getAttribute('data-theme');
    return theme === 'dark' ? '#60a5fa' : '#3b82f6';
}