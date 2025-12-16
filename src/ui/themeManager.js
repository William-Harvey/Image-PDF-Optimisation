/**
 * Theme Management System for Simple Image/PDF Editor
 * Handles dark/light theme switching and system preferences
 */

import { STORAGE, DEFAULTS } from '../../config.js';

/**
 * ThemeManager - Manages application theme state
 */
export class ThemeManager {
  constructor() {
    this.htmlElement = document.documentElement;
    this.prefersDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');
    this.darkModeToggle = null;
    this.systemPrefCheckbox = null;
    this.initialized = false;
  }

  /**
   * Initialize theme manager with DOM elements
   * @param {HTMLElement} darkModeToggle - Dark mode toggle checkbox
   * @param {HTMLElement} systemPrefCheckbox - System preference checkbox
   */
  init(darkModeToggle, systemPrefCheckbox) {
    this.darkModeToggle = darkModeToggle;
    this.systemPrefCheckbox = systemPrefCheckbox;
    this.initialized = true;

    // Set up event listeners
    this._setupListeners();
  }

  /**
   * Load and apply saved theme settings
   */
  async loadSettings() {
    if (!this.initialized) {
      console.warn('ThemeManager not initialized. Call init() first.');
      return;
    }

    try {
      let storedTheme = DEFAULTS.THEME;
      let useSystemTheme = false;

      // Try Chrome storage first, fall back to localStorage
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get([
          STORAGE.THEME_PREFERENCE,
          STORAGE.USE_SYSTEM_THEME,
        ]);
        storedTheme = result[STORAGE.THEME_PREFERENCE] || DEFAULTS.THEME;
        useSystemTheme = result[STORAGE.USE_SYSTEM_THEME] === true;
      } else {
        storedTheme = localStorage.getItem(STORAGE.THEME_PREFERENCE) || DEFAULTS.THEME;
        useSystemTheme = localStorage.getItem(STORAGE.USE_SYSTEM_THEME) === 'true';
      }

      this.applyTheme(storedTheme, useSystemTheme);
    } catch (error) {
      console.error('Error loading theme settings:', error);
      this.applyTheme(DEFAULTS.THEME, false);
    }
  }

  /**
   * Apply a theme
   * @param {string} theme - Theme name ('dark' or 'light')
   * @param {boolean} useSystem - Whether to use system preference
   */
  applyTheme(theme, useSystem) {
    if (!this.initialized) {
      console.warn('ThemeManager not initialized. Call init() first.');
      return;
    }

    // Determine effective theme
    let effectiveTheme = DEFAULTS.THEME;
    if (useSystem) {
      effectiveTheme = this.prefersDarkMQ.matches ? 'dark' : 'light';
      this.darkModeToggle.disabled = true;
      this.systemPrefCheckbox.checked = true;
    } else {
      effectiveTheme = theme || DEFAULTS.THEME;
      this.darkModeToggle.disabled = false;
      this.systemPrefCheckbox.checked = false;
    }

    // Apply theme class
    if (effectiveTheme === 'dark') {
      this.htmlElement.classList.add('dark');
    } else {
      this.htmlElement.classList.remove('dark');
    }

    // Update toggle to reflect current theme
    this.darkModeToggle.checked = effectiveTheme === 'dark';
  }

  /**
   * Save theme preference
   * @param {string} theme - Theme name
   */
  async saveTheme(theme) {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [STORAGE.THEME_PREFERENCE]: theme });
      } else {
        localStorage.setItem(STORAGE.THEME_PREFERENCE, theme);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }

  /**
   * Save system theme preference
   * @param {boolean} useSystem - Whether to use system preference
   */
  async saveSystemPreference(useSystem) {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ [STORAGE.USE_SYSTEM_THEME]: useSystem });
      } else {
        localStorage.setItem(STORAGE.USE_SYSTEM_THEME, useSystem.toString());
      }
    } catch (error) {
      console.error('Error saving system preference:', error);
    }
  }

  /**
   * Set up event listeners
   * @private
   */
  _setupListeners() {
    // Dark mode toggle
    if (this.darkModeToggle) {
      this.darkModeToggle.addEventListener('change', async () => {
        const newTheme = this.darkModeToggle.checked ? 'dark' : 'light';
        const useSystem = this.systemPrefCheckbox ? this.systemPrefCheckbox.checked : false;

        await this.saveTheme(newTheme);
        this.applyTheme(newTheme, useSystem);
      });
    }

    // System preference checkbox
    if (this.systemPrefCheckbox) {
      this.systemPrefCheckbox.addEventListener('change', async () => {
        const useSystem = this.systemPrefCheckbox.checked;
        await this.saveSystemPreference(useSystem);

        // Re-apply theme with new system preference
        const storedTheme = await this._getStoredTheme();
        this.applyTheme(storedTheme, useSystem);
      });
    }

    // Listen for system theme changes
    this._setupSystemThemeListener();
  }

  /**
   * Set up listener for system theme changes
   * @private
   */
  _setupSystemThemeListener() {
    const handler = async () => {
      const useSystem = await this._getUseSystemPreference();
      if (useSystem) {
        const storedTheme = await this._getStoredTheme();
        this.applyTheme(storedTheme, true);
      }
    };

    try {
      if (this.prefersDarkMQ.addEventListener) {
        this.prefersDarkMQ.addEventListener('change', handler);
      } else {
        // Fallback for older browsers
        this.prefersDarkMQ.addListener(handler);
      }
    } catch (e) {
      console.warn('Could not add system theme listener:', e);
    }
  }

  /**
   * Get stored theme from storage
   * @private
   */
  async _getStoredTheme() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get([STORAGE.THEME_PREFERENCE]);
        return result[STORAGE.THEME_PREFERENCE] || DEFAULTS.THEME;
      } else {
        return localStorage.getItem(STORAGE.THEME_PREFERENCE) || DEFAULTS.THEME;
      }
    } catch (error) {
      console.error('Error getting stored theme:', error);
      return DEFAULTS.THEME;
    }
  }

  /**
   * Get use system preference from storage
   * @private
   */
  async _getUseSystemPreference() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get([STORAGE.USE_SYSTEM_THEME]);
        return result[STORAGE.USE_SYSTEM_THEME] === true;
      } else {
        return localStorage.getItem(STORAGE.USE_SYSTEM_THEME) === 'true';
      }
    } catch (error) {
      console.error('Error getting system preference:', error);
      return false;
    }
  }
}

// Create and export singleton instance
export const themeManager = new ThemeManager();

// Export class for testing
export default ThemeManager;
