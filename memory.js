/**
 * Memory management utilities for Simple Image/PDF Editor
 * Handles cleanup of canvases, images, and prevents memory leaks
 */

import { HISTORY } from './config.js';

/**
 * Disposes of a canvas element and frees its memory
 * @param {HTMLCanvasElement} canvas - The canvas to dispose
 */
export function disposeCanvas(canvas) {
  if (!canvas) {
    return;
  }

  try {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    canvas.width = 0;
    canvas.height = 0;
  } catch (e) {
    console.warn('Error disposing canvas:', e);
  }
}

/**
 * Revokes an object URL to free memory
 * @param {string} url - The object URL to revoke
 */
export function revokeObjectURL(url) {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Error revoking object URL:', e);
    }
  }
}

/**
 * Manages a limited-size history stack
 */
export class HistoryManager {
  constructor(maxSize = HISTORY.MAX_STACK_SIZE) {
    this.stack = [];
    this.maxSize = maxSize;
  }

  /**
   * Pushes an item onto the history stack
   * @param {any} item - The item to push
   */
  push(item) {
    // If stack is full, remove oldest item and clean up
    if (this.stack.length >= this.maxSize) {
      const oldest = this.stack.shift();
      this.cleanupHistoryItem(oldest);
    }

    this.stack.push(item);
  }

  /**
   * Pops an item from the history stack
   * @returns {any} - The popped item
   */
  pop() {
    return this.stack.pop();
  }

  /**
   * Gets the current stack size
   * @returns {number} - Stack size
   */
  size() {
    return this.stack.length;
  }

  /**
   * Checks if stack is empty
   * @returns {boolean} - True if empty
   */
  isEmpty() {
    return this.stack.length === 0;
  }

  /**
   * Clears the entire stack and cleans up resources
   */
  clear() {
    while (this.stack.length > 0) {
      const item = this.stack.pop();
      this.cleanupHistoryItem(item);
    }
  }

  /**
   * Cleans up a history item to free memory
   * @param {any} item - The item to clean up
   */
  cleanupHistoryItem(item) {
    if (!item) {
      return;
    }

    // If item is a canvas
    if (item instanceof HTMLCanvasElement) {
      disposeCanvas(item);
    }

    // If item has a canvas property
    if (item.canvas) {
      disposeCanvas(item.canvas);
    }

    // If item has a dataURL that's an object URL
    if (item.dataURL) {
      revokeObjectURL(item.dataURL);
    }
  }
}

/**
 * Cleans up an array of PDF images
 * @param {Array} pdfImages - Array of PDF image objects
 */
export function cleanupPdfImages(pdfImages) {
  if (!Array.isArray(pdfImages)) {
    return;
  }

  pdfImages.forEach((img) => {
    if (img.dataURL) {
      revokeObjectURL(img.dataURL);
    }
    if (img.optimizedDataURL) {
      revokeObjectURL(img.optimizedDataURL);
    }
    if (img.tempPreviewDataURL) {
      revokeObjectURL(img.tempPreviewDataURL);
    }
  });

  pdfImages.length = 0; // Clear array
}

/**
 * Cleans up a Cropper instance
 * @param {Cropper} cropper - The cropper instance
 */
export function disposeCropper(cropper) {
  if (cropper && typeof cropper.destroy === 'function') {
    try {
      cropper.destroy();
    } catch (e) {
      console.warn('Error disposing cropper:', e);
    }
  }
}

/**
 * Sets up cleanup on page unload
 * @param {Object} state - The state object containing resources to clean up
 */
export function setupUnloadCleanup(state) {
  window.addEventListener('beforeunload', () => {
    // Clean up master canvas
    if (state.masterCanvas) {
      disposeCanvas(state.masterCanvas);
      state.masterCanvas = null;
    }

    // Clean up cropper
    if (state.cropper) {
      disposeCropper(state.cropper);
      state.cropper = null;
    }

    // Clean up history
    if (state.historyManager) {
      state.historyManager.clear();
    }

    // Clean up PDF images
    if (state.pdfImages) {
      cleanupPdfImages(state.pdfImages);
    }

    // Clean up any object URLs
    if (state.originalImageDataURL) {
      revokeObjectURL(state.originalImageDataURL);
    }
  });
}

/**
 * Estimates memory usage of a data URL (approximate)
 * @param {string} dataURL - The data URL
 * @returns {number} - Estimated bytes
 */
export function estimateDataURLMemory(dataURL) {
  if (!dataURL || typeof dataURL !== 'string') {
    return 0;
  }

  // Base64 encoding adds ~33% overhead
  // Each character in JS string is 2 bytes (UTF-16)
  return dataURL.length * 2;
}

/**
 * Checks if memory pressure is high (heuristic)
 * @param {Array} dataURLs - Array of data URLs to check
 * @returns {boolean} - True if estimated memory usage is high
 */
export function isMemoryPressureHigh(dataURLs) {
  const MEMORY_THRESHOLD = 500 * 1024 * 1024; // 500MB threshold

  let totalMemory = 0;
  dataURLs.forEach((url) => {
    totalMemory += estimateDataURLMemory(url);
  });

  return totalMemory > MEMORY_THRESHOLD;
}
