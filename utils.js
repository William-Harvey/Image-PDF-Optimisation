/**
 * Utility functions for Simple Image/PDF Editor
 * Includes validation, sanitization, and helper functions
 */

import { FILE } from './config.js';

/**
 * Sanitizes a filename to prevent security issues
 * @param {string} filename - The filename to sanitize
 * @returns {string} - Sanitized filename
 */
export function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'untitled';
  }

  return (
    filename
      // Remove path traversal attempts
      .replace(/\.\./g, '')
      // Remove invalid filename characters
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
      // Remove leading/trailing dots and spaces
      .replace(/^[\s.]+|[\s.]+$/g, '')
      // Collapse multiple dots
      .replace(/\.{2,}/g, '.')
      // Limit length
      .substring(0, FILE.MAX_FILENAME_LENGTH) || 'untitled'
  );
}

/**
 * Validates an image file
 * @param {File|Blob} file - The file to validate
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (!file.type || !file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Please select a valid image file (PNG, JPEG, GIF, WEBP, or BMP).',
    };
  }

  if (!FILE.ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported image format: ${file.type}. Allowed formats: ${FILE.ALLOWED_IMAGE_TYPES.join(', ')}`,
    };
  }

  if (file.size > FILE.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${formatBytes(file.size)}) exceeds the maximum limit of ${formatBytes(FILE.MAX_SIZE_BYTES)}. Please choose a smaller image.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file appears to be empty.' };
  }

  return { valid: true, error: null };
}

/**
 * Validates a PDF file
 * @param {File|Blob} file - The file to validate
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validatePdfFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.type !== FILE.ALLOWED_PDF_TYPE) {
    return { valid: false, error: 'Please select a valid PDF file.' };
  }

  if (file.size > FILE.MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${formatBytes(file.size)}) exceeds the maximum limit of ${formatBytes(FILE.MAX_SIZE_BYTES)}.`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected file appears to be empty.' };
  }

  return { valid: true, error: null };
}

/**
 * Validates a URL for image loading
 * @param {string} url - The URL to validate
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL.' };
  }

  try {
    const urlObj = new URL(url);
    // Only allow http/https protocols
    if (!['http:', 'https:', 'data:'].includes(urlObj.protocol)) {
      return {
        valid: false,
        error: 'Invalid URL protocol. Only HTTP, HTTPS, and data URLs are allowed.',
      };
    }
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: 'Malformed URL.' };
  }
}

/**
 * Formats bytes to human-readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted string (e.g., "1.5 MB")
 */
export function formatBytes(bytes, decimals = 2) {
  if (!+bytes) {
    return '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'kB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Sanitizes user input to prevent XSS
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Validates quality value (0-1 range)
 * @param {number} quality - Quality value
 * @returns {number} - Clamped quality value
 */
export function validateQuality(quality) {
  const q = parseFloat(quality);
  if (isNaN(q)) {
    return 0.92;
  }
  return Math.max(0.01, Math.min(1.0, q));
}

/**
 * Validates dimension values
 * @param {number} width - Width value
 * @param {number} height - Height value
 * @returns {{valid: boolean, error: string|null}} - Validation result
 */
export function validateDimensions(width, height) {
  const w = parseInt(width, 10);
  const h = parseInt(height, 10);

  if (isNaN(w) || isNaN(h)) {
    return { valid: false, error: 'Invalid dimensions. Please enter numbers.' };
  }

  if (w <= 0 || h <= 0) {
    return { valid: false, error: 'Dimensions must be greater than zero.' };
  }

  if (w > 10000 || h > 10000) {
    return {
      valid: false,
      error: 'Dimensions too large. Maximum size is 10000x10000 pixels.',
    };
  }

  return { valid: true, error: null };
}
