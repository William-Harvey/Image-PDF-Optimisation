/**
 * Configuration constants for Simple Image/PDF Editor
 * Centralizes all magic numbers and configuration values
 */

export const CONFIG = {
  // Window configuration
  WINDOW: {
    WIDTH: 1100,
    HEIGHT: 800,
    TYPE: 'popup',
  },

  // File size limits
  FILE: {
    MAX_SIZE_MB: 50,
    MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
    ALLOWED_IMAGE_TYPES: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'],
    ALLOWED_PDF_TYPE: 'application/pdf',
    MAX_FILENAME_LENGTH: 255,
  },

  // UI timing and animations
  UI: {
    DEBOUNCE_DELAY_MS: 250,
    NOTIFICATION_DURATION_MS: 3000,
    LOADING_MIN_DISPLAY_MS: 200,
    SCREEN_READER_ANNOUNCE_DURATION_MS: 3000,
  },

  // Image compression settings
  COMPRESSION: {
    DEFAULT_QUALITY: 0.92,
    MIN_QUALITY: 0.01,
    MAX_QUALITY: 1.0,
    QUALITY_STEP: 0.01,
    DEFAULT_FORMAT: 'image/jpeg',
  },

  // PDF processing settings
  PDF: {
    DEFAULT_QUALITY: 0.75,
    MIN_QUALITY: 0.1,
    MAX_QUALITY: 1.0,
    QUALITY_STEP: 0.05,
    MAX_WIDTH_DEFAULT: 1920,
    MAX_SIZE_MB: 10, // Max size for compressed images
    EXTRACTION_MODE_IMAGES: 'images',
    EXTRACTION_MODE_FULLPAGES: 'fullpages',
  },

  // Crop aspect ratios
  CROP: {
    ASPECT_FREE: NaN, // Free crop (no constraint)
    ASPECT_SQUARE: 1, // 1:1
    ASPECT_4_3: 1.333, // 4:3
    ASPECT_16_9: 1.778, // 16:9
  },

  // History/Undo settings
  HISTORY: {
    MAX_STACK_SIZE: 10, // Limit undo history to prevent memory issues
  },

  // Storage keys
  STORAGE: {
    THEME_PREFERENCE: 'fabEditorThemePreference',
    USE_SYSTEM_THEME: 'fabEditorUseSystemTheme',
    DISCLAIMER_ACCEPTED: 'fabEditorDisclaimerAccepted',
    PENDING_IMAGE_URL: 'pendingImageUrl',
    SECTION_COLLAPSED_PREFIX: 'section-', // e.g., 'section-cropSection-collapsed'
  },

  // Canvas operations
  CANVAS: {
    ROTATION_90: 90,
    ROTATION_180: 180,
    ROTATION_270: 270,
    TRANSPARENCY_CHECK_SAMPLE_RATE: 40, // Check every Nth pixel for performance
    FULL_TRANSPARENCY_VALUE: 255,
  },

  // Performance optimization
  PERFORMANCE: {
    PIXEL_SAMPLE_RATE: 10, // Sample every 10th pixel for transparency check
    USE_WEB_WORKER: false, // Disabled due to CSP restrictions in extensions
  },

  // Default values
  DEFAULTS: {
    IMAGE_FILENAME: 'image.png',
    THEME: 'dark',
    ASPECT_RATIO: 1,
    ZOOM_ENABLED: true,
  },

  // Feature flags (for future use)
  FEATURES: {
    ADVANCED_COMPRESSION: true,
    WEB_WORKER_COMPRESSION: false, // Disabled due to CSP
    TELEMETRY: false,
  },
};

// Export individual sections for convenience
export const {
  WINDOW,
  FILE,
  UI,
  COMPRESSION,
  PDF,
  CROP,
  HISTORY,
  STORAGE,
  CANVAS,
  PERFORMANCE,
  DEFAULTS,
  FEATURES,
} = CONFIG;
