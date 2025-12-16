/**
 * State Management System for Simple Image/PDF Editor
 * Centralized state with reactive updates and subscriptions
 */

import { DEFAULTS } from '../../config.js';

/**
 * EditorState - Centralized state management for the application
 */
export class EditorState {
  constructor() {
    this._state = {
      // Image state
      image: {
        original: {
          dataURL: null,
          width: 0,
          height: 0,
          fileSize: 0,
          filename: DEFAULTS.IMAGE_FILENAME,
        },
        current: {
          width: 0,
          height: 0,
          aspectRatio: DEFAULTS.ASPECT_RATIO,
          canvas: null,
        },
        cropper: {
          instance: null,
          isCropping: false,
          aspectRatio: NaN, // NaN = free crop
          zoomableOption: DEFAULTS.ZOOM_ENABLED,
        },
      },

      // PDF state
      pdf: {
        file: null,
        document: null,
        originalBytes: null,
        images: [],
        currentEditingIndex: null,
        currentPreviewIndex: 0,
        mode: false,
        previewBgMode: 'dark',
        isPreviewComparing: false,
      },

      // UI state
      ui: {
        loading: false,
        comparing: false,
        theme: DEFAULTS.THEME,
        useSystemTheme: false,
      },

      // Edit state
      editing: {
        format: 'image/jpeg',
        quality: 0.92,
      },
    };

    this._listeners = [];
  }

  /**
   * Get a value from state using dot notation path
   * @param {string} path - Dot notation path (e.g., 'image.original.width')
   * @returns {any} - The value at the path
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this._state);
  }

  /**
   * Set a value in state using dot notation path
   * @param {string} path - Dot notation path
   * @param {any} value - The value to set
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, key) => {
      if (!obj[key]) {
        obj[key] = {};
      }
      return obj[key];
    }, this._state);

    const oldValue = target[lastKey];
    target[lastKey] = value;

    // Notify listeners
    this._notifyListeners(path, value, oldValue);
  }

  /**
   * Update multiple values at once
   * @param {Object} updates - Object with paths as keys and values
   */
  update(updates) {
    Object.entries(updates).forEach(([path, value]) => {
      this.set(path, value);
    });
  }

  /**
   * Get the entire state (use sparingly, prefer specific paths)
   * @returns {Object} - The entire state object
   */
  getAll() {
    return this._state;
  }

  /**
   * Subscribe to state changes
   * @param {Function} listener - Callback function (path, newValue, oldValue)
   * @param {string} [watchPath] - Optional path to watch specific changes
   * @returns {Function} - Unsubscribe function
   */
  subscribe(listener, watchPath = null) {
    const subscription = { listener, watchPath };
    this._listeners.push(subscription);

    // Return unsubscribe function
    return () => {
      this._listeners = this._listeners.filter((sub) => sub !== subscription);
    };
  }

  /**
   * Notify all listeners of a change
   * @private
   */
  _notifyListeners(path, newValue, oldValue) {
    this._listeners.forEach(({ listener, watchPath }) => {
      // If watching a specific path, only notify if it matches
      if (watchPath === null || path.startsWith(watchPath)) {
        try {
          listener(path, newValue, oldValue);
        } catch (error) {
          console.error('Error in state listener:', error);
        }
      }
    });
  }

  /**
   * Reset image state to defaults
   */
  resetImageState() {
    this.update({
      'image.original.dataURL': null,
      'image.original.width': 0,
      'image.original.height': 0,
      'image.original.fileSize': 0,
      'image.original.filename': DEFAULTS.IMAGE_FILENAME,
      'image.current.width': 0,
      'image.current.height': 0,
      'image.current.aspectRatio': DEFAULTS.ASPECT_RATIO,
      'image.current.canvas': null,
      'image.cropper.instance': null,
      'image.cropper.isCropping': false,
      'image.cropper.aspectRatio': NaN,
    });
  }

  /**
   * Reset PDF state to defaults
   */
  resetPdfState() {
    this.update({
      'pdf.file': null,
      'pdf.document': null,
      'pdf.originalBytes': null,
      'pdf.images': [],
      'pdf.currentEditingIndex': null,
      'pdf.currentPreviewIndex': 0,
      'pdf.mode': false,
    });
  }

  /**
   * Reset all state to defaults
   */
  reset() {
    this.resetImageState();
    this.resetPdfState();
    this.set('ui.comparing', false);
    this.set('ui.loading', false);
  }
}

// Create and export singleton instance
export const editorState = new EditorState();

// Export class for testing
export default EditorState;
