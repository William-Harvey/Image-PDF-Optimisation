// editor.js
import {
  CONFIG,
  FILE,
  UI,
  COMPRESSION,
  PDF,
  CROP,
  HISTORY,
  STORAGE,
  CANVAS,
  DEFAULTS,
} from './config.js';
import {
  sanitizeFilename,
  validateImageFile,
  validatePdfFile,
  validateImageUrl,
  formatBytes,
  sanitizeInput,
  validateQuality,
  validateDimensions,
} from './utils.js';
import {
  disposeCanvas,
  disposeCropper,
  cleanupPdfImages,
  HistoryManager,
  setupUnloadCleanup,
} from './memory.js';
import { notificationService } from './src/ui/notifications.js';
import { themeManager } from './src/ui/themeManager.js';
import { editorState } from './src/core/state.js';
import {
  rotateCanvas,
  flipCanvas,
  resizeCanvas,
  cropCanvas,
  hasTransparency as checkTransparency,
  createCanvasFromDataURL,
  loadImageElement,
  getBlobSizeFromDataURL as getBlobSize,
} from './src/image/imageProcessor.js';
import { extractPdfImages, extractPdfText, getPdfMetadata } from './src/pdf/pdfProcessor.js';

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  const disclaimerOverlay = document.getElementById('disclaimerOverlay');
  const acceptDisclaimerBtn = document.getElementById('acceptDisclaimerBtn');
  const appContainer = document.querySelector('.app-container');
  const imageUpload = document.getElementById('imageUpload');
  const fileNameDisplay = document.getElementById('fileName');
  const imageContainer = document.getElementById('imageContainer');
  const imageWrapper = document.getElementById('imageWrapper');
  const editableImage = document.getElementById('editableImage');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const placeholderText = imageContainer.querySelector('.placeholder-text');
  const imageInfoSection = document.getElementById('imageInfoSection');
  const originalDimensionsEl = document.getElementById('originalDimensions');
  const originalFileSizeEl = document.getElementById('originalFileSize');
  const currentDimensionsEl = document.getElementById('currentDimensions');
  const clearSection = document.getElementById('clearSection');
  const cropSection = document.getElementById('cropSection');
  const resizeSection = document.getElementById('resizeSection');
  const formatSection = document.getElementById('formatSection');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const startCropBtn = document.getElementById('startCropBtn');
  const applyCropBtn = document.getElementById('applyCropBtn');
  const cancelCropBtn = document.getElementById('cancelCropBtn');
  const resizeWidthInput = document.getElementById('resizeWidth');
  const resizeHeightInput = document.getElementById('resizeHeight');
  const aspectLockCheckbox = document.getElementById('aspectLock');
  const applyResizeBtn = document.getElementById('applyResizeBtn');
  const formatRadios = document.querySelectorAll('input[name="format"]');
  const qualityControl = document.getElementById('qualityControl');
  const qualitySlider = document.getElementById('qualitySlider');
  const qualityValueDisplay = document.getElementById('qualityValue');
  const optimizedFileSizeEl = document.getElementById('optimizedFileSize');
  const saveBtn = document.getElementById('saveBtn');
  const undoBtn = document.getElementById('undoBtn');
  const cropSizeDisplay = document.getElementById('cropSizeDisplay');
  const undoMessageEl = document.getElementById('undoMessage');
  const compareBtn = document.getElementById('compareBtn');
  const comparisonContainer = document.getElementById('comparisonContainer');
  const originalImagePreview = document.getElementById('originalImagePreview');
  const dropOverlay = document.getElementById('dropOverlay');

  // New rotation/flip buttons
  const rotateSection = document.getElementById('rotateSection');
  const rotateLeftBtn = document.getElementById('rotateLeftBtn');
  const rotateRightBtn = document.getElementById('rotateRightBtn');
  const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
  const flipVerticalBtn = document.getElementById('flipVerticalBtn');

  // New filter controls

  // Quick actions toolbar
  const quickActions = document.getElementById('quickActions');
  const quickRotateLeft = document.getElementById('quickRotateLeft');
  const quickRotateRight = document.getElementById('quickRotateRight');
  const quickFlipH = document.getElementById('quickFlipH');
  const quickFlipV = document.getElementById('quickFlipV');
  const currentDimsDisplay = document.getElementById('currentDimsDisplay');

  // Aspect ratio buttons
  const aspectButtons = document.querySelectorAll('.aspect-btn');

  // Comparison for main editor
  const editedImagePreview = document.getElementById('editedImagePreview');
  const comparisonDivider = document.querySelector('.comparison-divider');

  // Success notification
  const successNotification = document.getElementById('successNotification');
  const successMessage = document.getElementById('successMessage');

  // PDF elements
  const pdfUpload = document.getElementById('pdfUpload');
  const pdfExtractionMode = document.getElementById('pdfExtractionMode');
  const pdfInfoSection = document.getElementById('pdfInfoSection');
  const pdfBulkSection = document.getElementById('pdfBulkSection');
  const pdfPages = document.getElementById('pdfPages');
  const pdfImageCount = document.getElementById('pdfImageCount');
  const pdfOriginalSize = document.getElementById('pdfOriginalSize');
  const pdfOptimizedSize = document.getElementById('pdfOptimizedSize');
  const pdfQualitySlider = document.getElementById('pdfQualitySlider');
  const pdfQualityValue = document.getElementById('pdfQualityValue');
  const pdfMaxWidth = document.getElementById('pdfMaxWidth');
  const pdfFormatRadios = document.querySelectorAll('input[name="pdfFormat"]');
  const applyBulkOptimization = document.getElementById('applyBulkOptimization');
  const pdfGallery = document.getElementById('pdfGallery');
  const pdfImageGrid = document.getElementById('pdfImageGrid');
  const galleryImageCount = document.getElementById('galleryImageCount');
  const savePdfBtn = document.getElementById('savePdfBtn');
  const backToGalleryBtn = document.getElementById('backToGalleryBtn');

  // PDF Preview Modal
  const previewAllBtn = document.getElementById('previewAllBtn');
  const pdfPreviewModal = document.getElementById('pdfPreviewModal');
  const closePreviewBtn = document.getElementById('closePreviewBtn');
  const previewImage = document.getElementById('previewImage');
  const previewImageOriginal = document.getElementById('previewImageOriginal');
  const previewImageNumber = document.getElementById('previewImageNumber');
  const previewImageSize = document.getElementById('previewImageSize');
  const prevImageBtn = document.getElementById('prevImageBtn');
  const nextImageBtn = document.getElementById('nextImageBtn');
  const editFromPreviewBtn = document.getElementById('editFromPreviewBtn');
  const previewQualitySlider = document.getElementById('previewQualitySlider');
  const previewQualityValue = document.getElementById('previewQualityValue');
  const previewCompareBtn = document.getElementById('previewCompareBtn');
  const previewApplyBtn = document.getElementById('previewApplyBtn');
  const previewImageWrapper = document.getElementById('previewImageWrapper');
  const previewBgToggle = document.getElementById('previewBgToggle');
  const applyWarning = document.getElementById('applyWarning');

  // --- Theme toggles ---
  const darkModeToggle = document.getElementById('darkModeToggle');
  const systemPrefCheckbox = document.getElementById('systemPrefCheckbox');

  // --- State Management ---
  // All state is now managed through editorState (src/core/state.js)
  // Using an adapter pattern for clean access to state properties

  // Undo stack - using HistoryManager for bounded memory
  const historyManager = new HistoryManager();

  // State accessor object - provides clean get/set access to editorState
  const state = {
    // Image original properties
    get originalImageDataURL() {
      return editorState.get('image.original.dataURL');
    },
    set originalImageDataURL(value) {
      editorState.set('image.original.dataURL', value);
    },
    get currentImageFilename() {
      return editorState.get('image.original.filename');
    },
    set currentImageFilename(value) {
      editorState.set('image.original.filename', value);
    },
    get originalWidth() {
      return editorState.get('image.original.width');
    },
    set originalWidth(value) {
      editorState.set('image.original.width', value);
    },
    get originalHeight() {
      return editorState.get('image.original.height');
    },
    set originalHeight(value) {
      editorState.set('image.original.height', value);
    },
    get originalFileSize() {
      return editorState.get('image.original.fileSize');
    },
    set originalFileSize(value) {
      editorState.set('image.original.fileSize', value);
    },

    // Image current properties
    get currentWidth() {
      return editorState.get('image.current.width');
    },
    set currentWidth(value) {
      editorState.set('image.current.width', value);
    },
    get currentHeight() {
      return editorState.get('image.current.height');
    },
    set currentHeight(value) {
      editorState.set('image.current.height', value);
    },
    get currentAspectRatio() {
      return editorState.get('image.current.aspectRatio');
    },
    set currentAspectRatio(value) {
      editorState.set('image.current.aspectRatio', value);
    },
    get masterCanvas() {
      return editorState.get('image.current.canvas');
    },
    set masterCanvas(value) {
      editorState.set('image.current.canvas', value);
    },

    // Cropper properties
    get cropper() {
      return editorState.get('image.cropper.instance');
    },
    set cropper(value) {
      editorState.set('image.cropper.instance', value);
    },
    get isCropping() {
      return editorState.get('image.cropper.isCropping');
    },
    set isCropping(value) {
      editorState.set('image.cropper.isCropping', value);
    },
    get currentAspectRatio_crop() {
      return editorState.get('image.cropper.aspectRatio');
    },
    set currentAspectRatio_crop(value) {
      editorState.set('image.cropper.aspectRatio', value);
    },
    get originalZoomableOption() {
      return editorState.get('image.cropper.zoomableOption');
    },
    set originalZoomableOption(value) {
      editorState.set('image.cropper.zoomableOption', value);
    },

    // PDF properties
    get currentPdfFile() {
      return editorState.get('pdf.file');
    },
    set currentPdfFile(value) {
      editorState.set('pdf.file', value);
    },
    get pdfDocument() {
      return editorState.get('pdf.document');
    },
    set pdfDocument(value) {
      editorState.set('pdf.document', value);
    },
    get pdfOriginalBytes() {
      return editorState.get('pdf.originalBytes');
    },
    set pdfOriginalBytes(value) {
      editorState.set('pdf.originalBytes', value);
    },
    get pdfImages() {
      return editorState.get('pdf.images');
    },
    set pdfImages(value) {
      editorState.set('pdf.images', value);
    },
    get currentEditingImageIndex() {
      return editorState.get('pdf.currentEditingIndex');
    },
    set currentEditingImageIndex(value) {
      editorState.set('pdf.currentEditingIndex', value);
    },
    get currentPreviewIndex() {
      return editorState.get('pdf.currentPreviewIndex');
    },
    set currentPreviewIndex(value) {
      editorState.set('pdf.currentPreviewIndex', value);
    },
    get isPdfMode() {
      return editorState.get('pdf.mode');
    },
    set isPdfMode(value) {
      editorState.set('pdf.mode', value);
    },
    get previewBgMode() {
      return editorState.get('pdf.previewBgMode');
    },
    set previewBgMode(value) {
      editorState.set('pdf.previewBgMode', value);
    },
    get isPreviewComparing() {
      return editorState.get('pdf.isPreviewComparing');
    },
    set isPreviewComparing(value) {
      editorState.set('pdf.isPreviewComparing', value);
    },

    // UI properties
    get isComparingImages() {
      return editorState.get('ui.comparing');
    },
    set isComparingImages(value) {
      editorState.set('ui.comparing', value);
    },
  };

  // Initialize collapsible sections
  function initCollapsibleSections() {
    const sections = document.querySelectorAll('.control-section');

    sections.forEach((section) => {
      const heading = section.querySelector('h3');
      if (!heading) return;

      // Check if wrapper already exists, if not create one
      let wrapper = section.querySelector('.section-content');

      if (!wrapper) {
        // Wrap content in a collapsible div (skip the h3)
        const content = Array.from(section.children).filter((child) => child !== heading);
        if (content.length === 0) return;

        wrapper = document.createElement('div');
        wrapper.className = 'section-content';
        content.forEach((child) => wrapper.appendChild(child));
        section.appendChild(wrapper);
      }

      // Set initial max-height for smooth animation
      wrapper.style.maxHeight = wrapper.scrollHeight + 'px';

      // Load collapsed state from localStorage
      const sectionId = section.id;
      const isCollapsed = localStorage.getItem(`section-${sectionId}-collapsed`) === 'true';
      if (isCollapsed) {
        section.classList.add('collapsed');
        wrapper.style.maxHeight = '0';
      }

      // Toggle on click
      heading.addEventListener('click', () => {
        const isCurrentlyCollapsed = section.classList.contains('collapsed');

        if (isCurrentlyCollapsed) {
          section.classList.remove('collapsed');
          wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
          localStorage.setItem(`section-${sectionId}-collapsed`, 'false');
        } else {
          section.classList.add('collapsed');
          wrapper.style.maxHeight = '0';
          localStorage.setItem(`section-${sectionId}-collapsed`, 'true');
        }
      });

      // Update max-height when window resizes
      const observer = new ResizeObserver(() => {
        if (!section.classList.contains('collapsed')) {
          wrapper.style.maxHeight = wrapper.scrollHeight + 'px';
        }
      });
      observer.observe(wrapper);
    });
  }

  // Call after DOM is ready
  initCollapsibleSections();

  // File size limit - imported from config
  const MAX_FILE_SIZE = FILE.MAX_SIZE_BYTES;

  // Theming keys - imported from config
  const THEME_PREFERENCE_KEY = STORAGE.THEME_PREFERENCE;
  const USE_SYSTEM_THEME_KEY = STORAGE.USE_SYSTEM_THEME;
  const DISCLAIMER_ACCEPTED_KEY = STORAGE.DISCLAIMER_ACCEPTED;
  const htmlElement = document.documentElement;
  let prefersDarkMQ = window.matchMedia('(prefers-color-scheme: dark)');

  // --------------------------------------------------------------------------------------------
  // THEME HANDLING (Using ThemeManager)
  // --------------------------------------------------------------------------------------------
  // Initialize theme manager with DOM elements
  themeManager.init(darkModeToggle, systemPrefCheckbox);

  // Load theme settings function (called in INIT section)
  async function loadThemeSettings() {
    await themeManager.loadSettings();
  }

  // --------------------------------------------------------------------------------------------
  // HELPER FUNCTIONS
  // --------------------------------------------------------------------------------------------
  function debounce(func, delay = UI.DEBOUNCE_DELAY_MS) {
    let timeoutId = null;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  function announceToScreenReader(message) {
    const srEl = document.getElementById('srAnnouncements');
    if (srEl) {
      srEl.textContent = message;
      setTimeout(() => {
        srEl.textContent = '';
      }, UI.SCREEN_READER_ANNOUNCE_DURATION_MS);
    }
  }

  function showSuccess(message) {
    if (successNotification && successMessage) {
      successMessage.textContent = `✓ ${message}`;
      successNotification.style.display = 'block';
      setTimeout(() => {
        successNotification.style.display = 'none';
      }, UI.NOTIFICATION_DURATION_MS);
    }
  }

  function updateCurrentDimsDisplay() {
    if (currentDimsDisplay && state.currentWidth > 0 && state.currentHeight > 0) {
      currentDimsDisplay.textContent = `${Math.round(state.currentWidth)} × ${Math.round(state.currentHeight)}px`;
    }
  }

  // formatBytes is now imported from utils.js

  async function getBlobSizeFromDataURL(dataURL) {
    if (!dataURL || !dataURL.startsWith('data:image')) return 0;
    try {
      const response = await fetch(dataURL);
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Error getting blob size:', error);
      return 0;
    }
  }

  function createImageBitmapFromURL(dataURL) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        try {
          if (typeof createImageBitmap === 'function') {
            resolve(await createImageBitmap(img));
          } else {
            resolve(img);
          }
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => {
        reject(new Error('Image failed to load into offscreen element.'));
      };
      img.src = dataURL;
    });
  }

  function showLoading(show) {
    loadingIndicator.style.display = show ? 'block' : 'none';
  }

  function showError(message) {
    notificationService.error(message);
  }

  function validateImageFileAndShow(file) {
    const result = validateImageFile(file);
    if (!result.valid) {
      showError(result.error);
      return false;
    }
    return true;
  }

  async function loadImageFromURL(url) {
    try {
      showLoading(true);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      const blob = await response.blob();
      if (!validateImageFileAndShow(blob)) {
        showLoading(false);
        return;
      }
      const rawFilename = url.split('/').pop() || DEFAULTS.IMAGE_FILENAME;
      state.currentImageFilename = sanitizeFilename(rawFilename);
      fileNameDisplay.textContent = state.currentImageFilename;

      const reader = new FileReader();
      reader.onload = async (e) => {
        await handleImageLoad(e.target.result, blob.size);
      };
      reader.onerror = () => {
        showError('Error reading image from URL.');
        clearAll();
        showLoading(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error loading image from URL:', err);
      showError(
        'Failed to load image from URL. The image may be blocked by CORS policy or unavailable.'
      );
      showLoading(false);
    }
  }

  async function handleImageLoad(dataURL, fileSize) {
    state.originalImageDataURL = dataURL;
    state.originalFileSize = fileSize;
    originalFileSizeEl.textContent = formatBytes(state.originalFileSize);

    try {
      await loadImageOntoEditableImage(state.originalImageDataURL, true);
      state.masterCanvas = await createFullCanvasFromImage(state.originalImageDataURL);
      resetQualitySliderToMax();
      resetUIState();
      updateEstimatedSize();
      toggleComparison(false); // Start with comparison disabled so editing works
      updateCompareButton();
      showLoading(false);
      announceToScreenReader(
        `Image loaded: ${state.currentImageFilename}, ${state.originalWidth} by ${state.originalHeight} pixels`
      );
    } catch (err) {
      console.error('Error loading image:', err);
      showError('Failed to load image. The file may be corrupted or in an unsupported format.');
      clearAll();
      showLoading(false);
    }
  }

  // --------------------------------------------------------------------------------------------
  // DISCLAIMER HANDLING
  // --------------------------------------------------------------------------------------------
  async function checkDisclaimer() {
    try {
      let isAccepted = false;

      // Try chrome.storage first (for extension)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const result = await chrome.storage.local.get([DISCLAIMER_ACCEPTED_KEY]);
          isAccepted = result[DISCLAIMER_ACCEPTED_KEY] === true;
        } catch (err) {
          console.log('Chrome storage not available, using localStorage');
        }
      }

      // Fallback to localStorage (for local HTML file or if chrome.storage failed)
      if (!isAccepted) {
        isAccepted = localStorage.getItem(DISCLAIMER_ACCEPTED_KEY) === 'true';
      }

      if (isAccepted) {
        disclaimerOverlay.style.display = 'none';
        appContainer.style.display = 'flex';
      }
    } catch (error) {
      console.error('Error checking disclaimer:', error);
    }
  }

  acceptDisclaimerBtn.addEventListener('click', async () => {
    try {
      // Always save to localStorage for persistence
      localStorage.setItem(DISCLAIMER_ACCEPTED_KEY, 'true');

      // Also save to chrome.storage if available (for extension)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          await chrome.storage.local.set({ [DISCLAIMER_ACCEPTED_KEY]: true });
        } catch (err) {
          console.log('Chrome storage not available');
        }
      }
    } catch (error) {
      console.error('Error saving disclaimer acceptance:', error);
    }
    disclaimerOverlay.style.display = 'none';
    appContainer.style.display = 'flex';

    // Ensure loading indicator is hidden
    showLoading(false);
  });

  // Check for pending image from context menu
  async function checkPendingImage() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        const result = await chrome.storage.local.get(['pendingImageUrl']);
        if (result.pendingImageUrl) {
          await loadImageFromURL(result.pendingImageUrl);
          await chrome.storage.local.remove(['pendingImageUrl']);
        } else {
          // No pending image, ensure loading is hidden
          showLoading(false);
        }
      } else {
        // No chrome storage, ensure loading is hidden
        showLoading(false);
      }
    } catch (error) {
      console.error('Error checking pending image:', error);
      showLoading(false);
    }
  }

  // --------------------------------------------------------------------------------------------
  // IMAGE LOADING + CROPPER INITIALISATION
  // --------------------------------------------------------------------------------------------
  imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!validateImageFileAndShow(file)) {
      imageUpload.value = null;
      return;
    }

    state.currentImageFilename = sanitizeFilename(file.name);
    fileNameDisplay.textContent = state.currentImageFilename;
    showLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      await handleImageLoad(e.target.result, file.size);
    };
    reader.onerror = () => {
      showError('Error reading file. The file may be corrupted.');
      clearAll();
      showLoading(false);
    };
    reader.readAsDataURL(file);
    imageUpload.value = null;
  });

  // --------------------------------------------------------------------------------------------
  // DRAG AND DROP SUPPORT
  // --------------------------------------------------------------------------------------------
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach((eventName) => {
    document.body.addEventListener(
      eventName,
      () => {
        dropOverlay.style.display = 'flex';
      },
      false
    );
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    document.body.addEventListener(
      eventName,
      () => {
        dropOverlay.style.display = 'none';
      },
      false
    );
  });

  document.body.addEventListener(
    'drop',
    async (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files.length > 0) {
        const file = files[0];
        if (!validateImageFileAndShow(file)) return;

        state.currentImageFilename = sanitizeFilename(file.name);
        fileNameDisplay.textContent = state.currentImageFilename;
        showLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
          await handleImageLoad(e.target.result, file.size);
        };
        reader.onerror = () => {
          showError('Error reading dropped file.');
          showLoading(false);
        };
        reader.readAsDataURL(file);
      }
    },
    false
  );

  // --------------------------------------------------------------------------------------------
  // CLIPBOARD PASTE SUPPORT
  // --------------------------------------------------------------------------------------------
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!validateImageFileAndShow(blob)) return;

        state.currentImageFilename = sanitizeFilename(`pasted-image-${Date.now()}.png`);
        fileNameDisplay.textContent = state.currentImageFilename;
        showLoading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
          await handleImageLoad(e.target.result, blob.size);
        };
        reader.onerror = () => {
          showError('Error reading pasted image.');
          showLoading(false);
        };
        reader.readAsDataURL(blob);
        break;
      }
    }
  });

  // --------------------------------------------------------------------------------------------
  // PDF HANDLING
  // --------------------------------------------------------------------------------------------
  pdfUpload?.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      pdfUpload.value = null;
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError(
        `PDF size (${formatBytes(file.size)}) exceeds ${formatBytes(MAX_FILE_SIZE)} limit.`
      );
      pdfUpload.value = null;
      return;
    }

    state.currentPdfFile = file;
    fileNameDisplay.textContent = file.name;

    // Get extraction mode
    const extractionMode =
      document.querySelector('input[name="extractionMode"]:checked')?.value || 'images';
    console.log(`PDF extraction mode: ${extractionMode}`);

    showLoading(true);

    try {
      await extractImagesFromPDF(file, extractionMode);
      showPdfGallery();
      showLoading(false);
    } catch (err) {
      console.error('Error processing PDF:', err);
      showError('Failed to process PDF. The file may be corrupted or password-protected.');
      showLoading(false);
    }
    pdfUpload.value = null;
  });

  async function extractImagesFromPDF(file, mode = 'images') {
    console.log(`Starting PDF extraction with unpdf (mode: ${mode})...`);

    // Store original PDF bytes for rebuilding
    const arrayBuffer = await file.arrayBuffer();
    state.pdfOriginalBytes = new Uint8Array(arrayBuffer).slice();
    console.log(`Stored original PDF: ${state.pdfOriginalBytes.length} bytes`);

    // Get PDF metadata
    const metadata = await getPdfMetadata(file);
    pdfPages.textContent = metadata.numPages;
    pdfOriginalSize.textContent = formatBytes(file.size);

    // Show progress
    const loadingProgress = document.getElementById('loadingProgress');
    const loadingText = document.querySelector('.loading-text');
    if (loadingProgress) {
      loadingProgress.style.display = 'flex';
      loadingText.textContent =
        mode === 'fullpages' ? 'Rendering PDF pages...' : 'Extracting images from PDF...';
    }

    // Extract images using unpdf
    state.pdfImages = await extractPdfImages(file, mode);

    if (state.pdfImages.length === 0) {
      throw new Error(
        mode === 'fullpages'
          ? 'Failed to render PDF pages.'
          : 'No embedded images found. Switch to "Full Pages" mode to render the PDF pages as images.'
      );
    }

    console.log(
      `Extracted ${state.pdfImages.length} ${mode === 'fullpages' ? 'pages' : 'images'} using unpdf`
    );
    pdfImageCount.textContent = state.pdfImages.length;
    galleryImageCount.textContent = state.pdfImages.length;
    renderPdfGallery();

    // Show preview button after extraction
    if (previewAllBtn && state.pdfImages.length > 0) {
      previewAllBtn.style.display = 'block';
    }

    console.log('Smart extraction complete!');
  }

  function renderPdfGallery() {
    console.log('renderPdfGallery called. Number of images:', state.pdfImages.length);
    pdfImageGrid.innerHTML = '';

    state.pdfImages.forEach((img, idx) => {
      const imageSrc = img.optimizedDataURL || img.dataURL;
      console.log(`Image ${idx}:`, {
        isOptimized: img.isOptimized,
        hasOptimizedDataURL: !!img.optimizedDataURL,
        optimizedSize: img.optimizedSize,
        originalSize: img.originalSize,
        dataURLLength: img.dataURL?.length,
        optimizedDataURLLength: img.optimizedDataURL?.length,
        areURLsSame: img.optimizedDataURL === img.dataURL,
        srcPrefix: imageSrc.substring(0, 50),
      });

      const card = document.createElement('div');
      card.className = 'pdf-image-card' + (img.isOptimized ? ' optimized' : '');

      // Create img element separately to force browser refresh
      const imgElement = document.createElement('img');
      imgElement.alt = img.imageName;
      imgElement.className = 'pdf-image-preview';

      const infoDiv = document.createElement('div');
      infoDiv.className = 'pdf-image-info';
      infoDiv.innerHTML = `
                <span class="image-number">Image #${idx + 1} (Page ${img.pageNum})</span>
                <span class="image-size">${Math.round(img.width)} × ${Math.round(img.height)}px</span>
                <span class="image-size">${formatBytes(img.optimizedSize || img.originalSize)}</span>
                ${img.isOptimized ? `<span class="size-reduction">↓${Math.round((1 - img.optimizedSize / img.originalSize) * 100)}%</span>` : ''}
            `;

      card.appendChild(imgElement);
      card.appendChild(infoDiv);
      card.addEventListener('click', () => showPreviewModal(idx));
      pdfImageGrid.appendChild(card);

      // Set src after appending to DOM to force fresh decode
      setTimeout(() => {
        imgElement.src = imageSrc;
      }, 0);
    });

    updatePdfOptimizedSize();
  }

  function updatePdfOptimizedSize() {
    let totalOptimized = 0;
    state.pdfImages.forEach((img) => {
      totalOptimized += img.optimizedSize || img.originalSize;
    });
    pdfOptimizedSize.textContent = formatBytes(totalOptimized);

    const optimizedCount = state.pdfImages.filter((img) => img.isOptimized).length;
    const allOptimized = state.pdfImages.every((img) => img.isOptimized);

    // Always enable save button, but update text to show progress
    savePdfBtn.disabled = false;
    if (allOptimized) {
      savePdfBtn.textContent = `Save Optimized PDF (${state.pdfImages.length}/${state.pdfImages.length})`;
    } else {
      savePdfBtn.textContent = `Save PDF (${optimizedCount}/${state.pdfImages.length} optimized)`;
    }
  }

  function showPdfGallery() {
    state.isPdfMode = true;
    placeholderText.style.display = 'none';
    pdfGallery.style.display = 'block';
    imageWrapper.style.display = 'none';
    pdfInfoSection.style.display = 'block';
    pdfBulkSection.style.display = 'block';
    savePdfBtn.style.display = 'inline-flex';
    saveBtn.style.display = 'none';
    clearSection.style.display = 'block';

    // Hide image editing sections
    cropSection.style.display = 'none';
    rotateSection.style.display = 'none';
    resizeSection.style.display = 'none';
    formatSection.style.display = 'none';
    imageInfoSection.style.display = 'none';
    quickActions.style.display = 'none';
    undoBtn.style.display = 'none';
  }

  async function editPdfImage(index) {
    state.currentEditingImageIndex = index;
    const img = state.pdfImages[index];

    showLoading(true);
    try {
      state.currentImageFilename = `page-${img.pageNum}.png`;
      fileNameDisplay.textContent = `Editing: ${state.currentImageFilename}`;

      await handleImageLoad(img.dataURL, img.originalSize);

      // Hide PDF gallery and show image editor with full UI
      pdfGallery.style.display = 'none';
      // imageWrapper is hidden by comparison mode, comparisonContainer is shown instead
      placeholderText.style.display = 'none';
      pdfInfoSection.style.display = 'none';
      pdfBulkSection.style.display = 'none';
      backToGalleryBtn.style.display = 'inline-flex';
      savePdfBtn.style.display = 'none';
      saveBtn.style.display = 'none';

      // Show editing tools (same as regular image editing)
      cropSection.style.display = 'block';
      rotateSection.style.display = 'block';
      resizeSection.style.display = 'block';
      formatSection.style.display = 'block';
      imageInfoSection.style.display = 'block';
      quickActions.style.display = 'flex';
      clearSection.style.display = 'block';
      undoBtn.style.display = 'inline-flex';
      compareBtn.style.display = 'none'; // Hide compare for PDF image editing

      showLoading(false);
    } catch (err) {
      console.error('Error loading PDF image:', err);
      showError('Could not load image for editing.');
      showLoading(false);
    }
  }

  backToGalleryBtn?.addEventListener('click', async () => {
    console.log(
      'Back to Gallery clicked. state.currentEditingImageIndex:',
      state.currentEditingImageIndex,
      'state.masterCanvas exists:',
      !!state.masterCanvas
    );

    if (state.currentEditingImageIndex !== null && state.masterCanvas) {
      showLoading(true);
      try {
        const format = getCurrentFormat();
        const quality = getCurrentQuality();
        const optimizedDataURL = state.masterCanvas.toDataURL(format, quality);
        const optimizedSize = await getBlobSizeFromDataURL(optimizedDataURL);

        console.log(
          'Saving image at index',
          state.currentEditingImageIndex,
          'Size:',
          optimizedSize,
          'isOptimized: true'
        );

        state.pdfImages[state.currentEditingImageIndex].optimizedDataURL = optimizedDataURL;
        state.pdfImages[state.currentEditingImageIndex].optimizedSize = optimizedSize;
        state.pdfImages[state.currentEditingImageIndex].isOptimized = true;
        state.pdfImages[state.currentEditingImageIndex].previewQuality = quality;
        state.pdfImages[state.currentEditingImageIndex].width = state.masterCanvas.width;
        state.pdfImages[state.currentEditingImageIndex].height = state.masterCanvas.height;

        console.log('Saved state.pdfImages[' + state.currentEditingImageIndex + ']:', {
          isOptimized: state.pdfImages[state.currentEditingImageIndex].isOptimized,
          optimizedSize: state.pdfImages[state.currentEditingImageIndex].optimizedSize,
          hasOptimizedDataURL: !!state.pdfImages[state.currentEditingImageIndex].optimizedDataURL,
        });

        renderPdfGallery();
        showSuccess('Image updated');
      } catch (err) {
        console.error('Error saving edited image:', err);
      }
      showLoading(false);
    } else {
      console.log('Skipping save - no edits detected or state.masterCanvas is null');
    }

    state.currentEditingImageIndex = null;
    clearAll();
    showPdfGallery();
    fileNameDisplay.textContent = state.currentPdfFile.name;
  });

  // Check if an image has transparency (alpha channel)
  async function hasTransparency(dataURL) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Check if any pixel has alpha < 255
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            resolve(true);
            return;
          }
        }
        resolve(false);
      };
      img.onerror = () => resolve(false);
      img.src = dataURL;
    });
  }

  // Advanced image compression using browser-image-compression library
  async function compressImageAdvanced(dataURL, quality, format = 'image/jpeg') {
    try {
      // Check if library is available
      if (typeof imageCompression === 'undefined') {
        console.warn('browser-image-compression not available, using fallback');
        return null;
      }

      // Convert data URL to Blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Convert to File object (required by library)
      const file = new File([blob], 'image.jpg', { type: blob.type });

      // Compression options
      const options = {
        maxSizeMB: 10, // Max file size
        useWebWorker: false, // Disabled due to CSP restrictions in extensions
        initialQuality: quality, // Use the quality slider value
        fileType: format,
      };

      console.log(`Compressing with browser-image-compression (quality: ${quality})...`);

      // Compress the image
      const compressedBlob = await imageCompression(file, options);

      // Convert back to data URL
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(compressedBlob);
      });
    } catch (err) {
      console.error('Advanced compression failed:', err);
      return null; // Return null to fallback to standard compression
    }
  }

  // Bulk optimization
  pdfQualitySlider?.addEventListener('input', () => {
    pdfQualityValue.textContent = pdfQualitySlider.value;
  });

  applyBulkOptimization?.addEventListener('click', async () => {
    showLoading(true);
    const quality = parseFloat(pdfQualitySlider.value);

    try {
      // Always re-optimize all images with current settings (allow quality adjustments)
      for (let i = 0; i < state.pdfImages.length; i++) {
        const img = state.pdfImages[i];

        // Check for transparency and choose format accordingly
        const hasAlpha = await hasTransparency(img.dataURL);
        const selectedFormat = hasAlpha ? 'image/png' : 'image/jpeg';
        console.log(
          `Image ${i}: ${hasAlpha ? 'has transparency, using PNG' : 'opaque, using JPEG'}`
        );

        let optimizedDataURL;
        let imgWidth = img.width;
        let imgHeight = img.height;

        if (hasAlpha) {
          // For transparent images, use canvas method to preserve transparency
          console.log(`Using canvas compression for transparent image ${i}`);
          const canvas = await createFullCanvasFromImage(img.dataURL);
          optimizedDataURL = canvas.toDataURL(selectedFormat, quality);
          imgWidth = canvas.width;
          imgHeight = canvas.height;
        } else {
          // For opaque images, try advanced compression first
          optimizedDataURL = await compressImageAdvanced(img.dataURL, quality, selectedFormat);

          if (!optimizedDataURL) {
            // Fallback to standard canvas compression
            console.log(`Using fallback compression for image ${i}`);
            const canvas = await createFullCanvasFromImage(img.dataURL);
            optimizedDataURL = canvas.toDataURL(selectedFormat, quality);
            imgWidth = canvas.width;
            imgHeight = canvas.height;
          }
        }

        const optimizedSize = await getBlobSizeFromDataURL(optimizedDataURL);

        console.log(`Bulk optimizing image ${i}:`, {
          format: selectedFormat,
          quality: quality,
          originalDataURLLength: img.dataURL.length,
          optimizedDataURLLength: optimizedDataURL.length,
          originalSize: img.originalSize,
          optimizedSize: optimizedSize,
          reduction: Math.round((1 - optimizedSize / img.originalSize) * 100) + '%',
          areURLsSame: optimizedDataURL === img.dataURL,
        });

        state.pdfImages[i].optimizedDataURL = optimizedDataURL;
        state.pdfImages[i].optimizedSize = optimizedSize;
        state.pdfImages[i].isOptimized = true;
        state.pdfImages[i].previewQuality = quality;
        state.pdfImages[i].width = imgWidth;
        state.pdfImages[i].height = imgHeight;
      }

      renderPdfGallery();
      const avgReduction = Math.round(
        (1 -
          state.pdfImages.reduce((sum, img) => sum + img.optimizedSize, 0) /
            state.pdfImages.reduce((sum, img) => sum + img.originalSize, 0)) *
          100
      );
      showSuccess(`All ${state.pdfImages.length} images optimized (${avgReduction}% reduction)`);

      // Show preview button after optimization
      if (previewAllBtn) {
        previewAllBtn.style.display = 'block';
      }
    } catch (err) {
      console.error('Error in bulk optimization:', err);
      showError('Bulk optimization failed.');
    } finally {
      showLoading(false);
    }
  });

  // PDF Preview Modal Functions
  async function showPreviewModal(index) {
    state.currentPreviewIndex = index;
    await updatePreviewDisplay();

    // Set initial background
    if (previewImageWrapper) {
      previewImageWrapper.className = 'preview-image-wrapper bg-' + state.previewBgMode;
    }

    if (pdfPreviewModal) {
      pdfPreviewModal.style.display = 'flex';
    }
  }

  function hidePreviewModal() {
    if (pdfPreviewModal) {
      pdfPreviewModal.style.display = 'none';
    }
  }

  async function updatePreviewDisplay() {
    if (!state.pdfImages[state.currentPreviewIndex]) return;

    const img = state.pdfImages[state.currentPreviewIndex];

    // If image hasn't been optimized yet, create an initial preview at default quality
    if (!img.optimizedDataURL) {
      const defaultQuality = 0.8;
      try {
        // Check for transparency and choose format accordingly
        const hasAlpha = await hasTransparency(img.dataURL);
        const selectedFormat = hasAlpha ? 'image/png' : 'image/jpeg';
        console.log(
          `Preview ${state.currentPreviewIndex}: ${hasAlpha ? 'has transparency, using PNG' : 'opaque, using JPEG'}`
        );

        const canvas = await createFullCanvasFromImage(img.dataURL);
        const initialOptimizedDataURL = canvas.toDataURL(selectedFormat, defaultQuality);

        // Store as temporary preview (not saved until Apply is clicked)
        img.tempPreviewDataURL = initialOptimizedDataURL;

        console.log('Created initial preview at quality', defaultQuality);
      } catch (err) {
        console.error('Error creating initial preview:', err);
      }
    }

    const imageSrc = img.optimizedDataURL || img.tempPreviewDataURL || img.dataURL;

    console.log('Preview image', state.currentPreviewIndex, {
      isOptimized: img.isOptimized,
      hasOptimizedDataURL: !!img.optimizedDataURL,
      hasTempPreview: !!img.tempPreviewDataURL,
      optimizedSize: img.optimizedSize,
      originalSize: img.originalSize,
      usingOptimizedURL: !!img.optimizedDataURL,
      srcPrefix: imageSrc.substring(0, 50) + '...',
    });

    // Update original image for comparison
    if (previewImageOriginal) {
      previewImageOriginal.src = img.dataURL;
    }

    // Force image refresh by clearing and resetting src
    if (previewImage) {
      previewImage.src = '';
      // Force reflow
      void previewImage.offsetHeight;
      previewImage.src = imageSrc;
    }

    // Reset comparison slider to middle when switching images
    if (previewImage) {
      previewImage.style.clipPath = 'inset(0 50% 0 0)';
    }
    const slider = previewImageWrapper?.querySelector('.preview-comparison-slider');
    if (slider) {
      slider.style.left = '50%';
    }

    // Update quality slider to current quality (default 0.8)
    const currentQuality = img.previewQuality || 0.8;
    if (previewQualitySlider) previewQualitySlider.value = currentQuality;
    if (previewQualityValue) previewQualityValue.textContent = currentQuality.toFixed(2);

    // Update info
    if (previewImageNumber) {
      previewImageNumber.textContent = `Image ${state.currentPreviewIndex + 1} of ${state.pdfImages.length}`;
    }

    if (previewImageSize) {
      const originalSizeMB = (img.originalSize / (1024 * 1024)).toFixed(2);
      const optimizedSizeMB = ((img.optimizedSize || img.originalSize) / (1024 * 1024)).toFixed(2);
      const reduction = img.isOptimized
        ? Math.round((1 - img.optimizedSize / img.originalSize) * 100)
        : 0;

      previewImageSize.textContent = img.isOptimized
        ? `${Math.round(img.width)}×${Math.round(img.height)} • ${originalSizeMB} MB → ${optimizedSizeMB} MB (${reduction}% reduction)`
        : `${Math.round(img.width)}×${Math.round(img.height)} • ${originalSizeMB} MB (not optimized)`;
    }

    // Update navigation buttons
    if (prevImageBtn) {
      prevImageBtn.disabled = state.currentPreviewIndex === 0;
    }
    if (nextImageBtn) {
      nextImageBtn.disabled = state.currentPreviewIndex === state.pdfImages.length - 1;
    }
  }

  async function navigatePreview(direction) {
    const newIndex = state.currentPreviewIndex + direction;
    if (newIndex >= 0 && newIndex < state.pdfImages.length) {
      state.currentPreviewIndex = newIndex;
      await updatePreviewDisplay();
    }
  }

  // Preview Modal Event Listeners
  previewAllBtn?.addEventListener('click', () => {
    showPreviewModal(0);
  });

  closePreviewBtn?.addEventListener('click', hidePreviewModal);

  prevImageBtn?.addEventListener('click', () => navigatePreview(-1));
  nextImageBtn?.addEventListener('click', () => navigatePreview(1));

  editFromPreviewBtn?.addEventListener('click', () => {
    hidePreviewModal();
    editPdfImage(state.currentPreviewIndex);
  });

  // Preview quality slider - live preview
  let previewDebounceTimer = null;
  previewQualitySlider?.addEventListener('input', async () => {
    const quality = parseFloat(previewQualitySlider.value);
    if (previewQualityValue) {
      previewQualityValue.textContent = quality.toFixed(2);
    }

    // Show warning to click Apply
    if (applyWarning) {
      applyWarning.style.display = 'inline';
    }

    // Debounce the live preview to avoid too many re-renders
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer = setTimeout(async () => {
      const img = state.pdfImages[state.currentPreviewIndex];
      if (!img) return;

      try {
        // Check for transparency and choose format accordingly
        const hasAlpha = await hasTransparency(img.dataURL);
        const selectedFormat = hasAlpha ? 'image/png' : 'image/jpeg';

        // Create live preview at new quality
        const canvas = await createFullCanvasFromImage(img.dataURL);
        const livePreviewDataURL = canvas.toDataURL(selectedFormat, quality);

        // Update preview image with live preview (works even in compare mode)
        if (previewImage) {
          previewImage.src = livePreviewDataURL;
        }

        // Update size estimate
        const estimatedSize = await getBlobSizeFromDataURL(livePreviewDataURL);
        const reduction = Math.round((1 - estimatedSize / img.originalSize) * 100);
        if (previewImageSize) {
          const originalSizeMB = (img.originalSize / (1024 * 1024)).toFixed(2);
          const estimatedSizeMB = (estimatedSize / (1024 * 1024)).toFixed(2);
          previewImageSize.textContent = `${Math.round(img.width)}×${Math.round(img.height)} • ${originalSizeMB} MB → ${estimatedSizeMB} MB (${reduction}% reduction) - Preview`;
        }
      } catch (err) {
        console.error('Error in live preview:', err);
      }
    }, 300); // 300ms debounce
  });

  // Preview background toggle
  previewBgToggle?.addEventListener('click', () => {
    // Cycle through backgrounds: dark -> light -> checkerboard -> dark
    if (state.previewBgMode === 'dark') {
      state.previewBgMode = 'light';
    } else if (state.previewBgMode === 'light') {
      state.previewBgMode = 'checkerboard';
    } else {
      state.previewBgMode = 'dark';
    }

    // Update the wrapper classes
    if (previewImageWrapper) {
      previewImageWrapper.className = 'preview-image-wrapper bg-' + state.previewBgMode;
    }

    console.log('Preview background changed to:', state.previewBgMode);
  });

  // Preview compare button - resets slider to center and quality to default
  previewCompareBtn?.addEventListener('click', () => {
    console.log('Reset slider clicked');

    // Reset comparison slider position
    if (previewImage) {
      previewImage.style.clipPath = 'inset(0 50% 0 0)';
      console.log('Reset clip-path to 50%');
    }
    const slider = previewImageWrapper?.querySelector('.preview-comparison-slider');
    if (slider) {
      slider.style.left = '50%';
      console.log('Reset slider position to 50%');
    } else {
      console.log('Slider element not found');
    }

    // Reset quality to 0.80
    if (previewQualitySlider) {
      previewQualitySlider.value = 0.8;
    }
    if (previewQualityValue) {
      previewQualityValue.textContent = '0.80';
    }

    // Hide warning since quality is reset
    if (applyWarning) {
      applyWarning.style.display = 'none';
    }

    // Trigger live preview at default quality
    previewQualitySlider?.dispatchEvent(new Event('input'));
  });

  // Preview apply button
  previewApplyBtn?.addEventListener('click', async () => {
    const img = state.pdfImages[state.currentPreviewIndex];
    if (!img) return;

    const quality = parseFloat(previewQualitySlider.value);

    // Hide warning and show saving message
    if (applyWarning) {
      applyWarning.style.display = 'none';
    }
    if (previewApplyBtn) {
      previewApplyBtn.disabled = true;
      previewApplyBtn.textContent = 'Saving...';
    }

    showLoading(true);
    try {
      // Check for transparency and choose format accordingly
      const hasAlpha = await hasTransparency(img.dataURL);
      const selectedFormat = hasAlpha ? 'image/png' : 'image/jpeg';
      console.log(
        `Apply: Image ${state.currentPreviewIndex} - ${hasAlpha ? 'has transparency, using PNG' : 'opaque, using JPEG'}`
      );

      let optimizedDataURL;
      let imgWidth = img.width;
      let imgHeight = img.height;

      if (hasAlpha) {
        // For transparent images, use canvas method to preserve transparency
        console.log(`Using canvas compression for transparent preview`);
        const canvas = await createFullCanvasFromImage(img.dataURL);
        optimizedDataURL = canvas.toDataURL(selectedFormat, quality);
        imgWidth = canvas.width;
        imgHeight = canvas.height;
      } else {
        // For opaque images, try advanced compression first
        optimizedDataURL = await compressImageAdvanced(img.dataURL, quality, selectedFormat);

        if (!optimizedDataURL) {
          // Fallback to standard canvas compression
          console.log(`Using fallback compression for preview`);
          const canvas = await createFullCanvasFromImage(img.dataURL);
          optimizedDataURL = canvas.toDataURL(selectedFormat, quality);
          imgWidth = canvas.width;
          imgHeight = canvas.height;
        }
      }

      const optimizedSize = await getBlobSizeFromDataURL(optimizedDataURL);

      console.log(`Preview: Applied quality ${quality} to image ${state.currentPreviewIndex}`, {
        format: selectedFormat,
        originalSize: img.originalSize,
        newOptimizedSize: optimizedSize,
        reduction: Math.round((1 - optimizedSize / img.originalSize) * 100) + '%',
      });

      // Update the state.pdfImages array
      state.pdfImages[state.currentPreviewIndex].optimizedDataURL = optimizedDataURL;
      state.pdfImages[state.currentPreviewIndex].optimizedSize = optimizedSize;
      state.pdfImages[state.currentPreviewIndex].isOptimized = true;
      state.pdfImages[state.currentPreviewIndex].previewQuality = quality;
      state.pdfImages[state.currentPreviewIndex].width = imgWidth;
      state.pdfImages[state.currentPreviewIndex].height = imgHeight;

      // Refresh the gallery and preview display
      renderPdfGallery();
      updatePreviewDisplay();

      showSuccess(
        `Quality updated (${Math.round((1 - optimizedSize / img.originalSize) * 100)}% reduction)`
      );
    } catch (err) {
      console.error('Error applying quality in preview:', err);
      showError('Failed to apply quality');
    } finally {
      showLoading(false);
      // Restore button text
      if (previewApplyBtn) {
        previewApplyBtn.disabled = false;
        previewApplyBtn.textContent = 'Apply';
      }
    }
  });

  // Comparison slider drag functionality
  let isDraggingPreviewSlider = false;

  function updatePreviewSliderPosition(clientX) {
    if (!previewImageWrapper || !previewImage || !previewImageOriginal) return;

    // Get the actual image bounds (not the wrapper)
    const imageRect = previewImageOriginal.getBoundingClientRect();
    const wrapperRect = previewImageWrapper.getBoundingClientRect();

    // Calculate position relative to the image
    const x = Math.max(imageRect.left, Math.min(imageRect.right, clientX));
    const relativeX = x - imageRect.left;
    const imagePercentage = (relativeX / imageRect.width) * 100;

    // Calculate position relative to wrapper for slider positioning
    const wrapperX = x - wrapperRect.left;
    const wrapperPercentage = (wrapperX / wrapperRect.width) * 100;

    // Update clip-path on the optimized image (based on image percentage)
    previewImage.style.clipPath = `inset(0 ${100 - imagePercentage}% 0 0)`;

    // Move the slider (based on wrapper percentage)
    const slider = previewImageWrapper.querySelector('.preview-comparison-slider');
    if (slider) {
      slider.style.left = wrapperPercentage + '%';
    }
  }

  // Mouse events
  if (previewImageWrapper) {
    const slider = previewImageWrapper.querySelector('.preview-comparison-slider');

    slider?.addEventListener('mousedown', (e) => {
      isDraggingPreviewSlider = true;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDraggingPreviewSlider) {
        updatePreviewSliderPosition(e.clientX);
      }
    });

    document.addEventListener('mouseup', () => {
      isDraggingPreviewSlider = false;
    });

    // Touch events
    slider?.addEventListener('touchstart', (e) => {
      isDraggingPreviewSlider = true;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('touchmove', (e) => {
      if (isDraggingPreviewSlider && e.touches.length > 0) {
        updatePreviewSliderPosition(e.touches[0].clientX);
      }
    });

    document.addEventListener('touchend', () => {
      isDraggingPreviewSlider = false;
    });
  }

  // Keyboard navigation in preview mode
  document.addEventListener('keydown', (e) => {
    if (pdfPreviewModal && pdfPreviewModal.style.display === 'flex') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigatePreview(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigatePreview(1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        hidePreviewModal();
      }
    }
  });

  // Save optimized PDF with text preservation
  savePdfBtn?.addEventListener('click', async () => {
    showLoading(true);
    try {
      // Check if we're in full page mode (pages were rendered, not just images extracted)
      const isFullPageMode =
        state.pdfImages.length > 0 && state.pdfImages[0].imageName.startsWith('page_');

      if (isFullPageMode) {
        // Full page mode: create new PDF from rendered pages
        console.log('Creating new PDF from rendered pages...');

        if (!window.jspdf || !window.jspdf.jsPDF) {
          throw new Error('jsPDF library not loaded.');
        }

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [state.pdfImages[0].width, state.pdfImages[0].height],
        });

        // Add first page
        const firstImg = state.pdfImages[0];
        const imgData = firstImg.optimizedDataURL || firstImg.dataURL;
        pdf.addImage(imgData, 'PNG', 0, 0, firstImg.width, firstImg.height);

        // Add remaining pages
        for (let i = 1; i < state.pdfImages.length; i++) {
          const img = state.pdfImages[i];
          const pageImgData = img.optimizedDataURL || img.dataURL;
          pdf.addPage([img.width, img.height], img.width > img.height ? 'landscape' : 'portrait');
          pdf.addImage(pageImgData, 'PNG', 0, 0, img.width, img.height);
        }

        // Save the PDF
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = state.currentPdfFile.name.replace('.pdf', '_optimized.pdf');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showSuccess('PDF saved successfully!');
        showLoading(false);
        return;
      }

      // Images only mode: modify original PDF
      // Verify pdf-lib is loaded
      if (!window.PDFLib) {
        throw new Error(
          'pdf-lib library not loaded. Make sure pdf-lib.min.js is in your extension folder.'
        );
      }

      console.log('Loading original PDF for modification...');

      // Debug: Check state.pdfOriginalBytes status
      console.log('state.pdfOriginalBytes type:', typeof state.pdfOriginalBytes);
      console.log('state.pdfOriginalBytes is null?', state.pdfOriginalBytes === null);
      console.log('state.pdfOriginalBytes is undefined?', state.pdfOriginalBytes === undefined);
      if (state.pdfOriginalBytes) {
        console.log('state.pdfOriginalBytes length:', state.pdfOriginalBytes.length);
        console.log('state.pdfOriginalBytes constructor:', state.pdfOriginalBytes.constructor.name);
      }

      // Verify we have the original PDF bytes
      if (!state.pdfOriginalBytes || state.pdfOriginalBytes.length === 0) {
        throw new Error('Original PDF data not available');
      }
      console.log(`Original PDF size: ${state.pdfOriginalBytes.length} bytes`);

      // Load the PDF - we'll modify it in place at the stream level
      const pdfDoc = await window.PDFLib.PDFDocument.load(state.pdfOriginalBytes);

      console.log('Matching images by page and dimensions...');

      // Group images by page for matching
      const imagesByPage = new Map();
      for (const img of state.pdfImages) {
        if (!imagesByPage.has(img.pageNum)) {
          imagesByPage.set(img.pageNum, []);
        }
        imagesByPage.get(img.pageNum).push(img);
        console.log(
          `Indexed optimized image: page ${img.pageNum}, ${img.imageName} (${img.width}×${img.height})`
        );
      }

      // Find all XObject images and match them with our optimized images
      const replacements = [];
      const matchedImages = new Set(); // Track which images we've already matched

      for (let pageIdx = 0; pageIdx < pdfDoc.getPageCount(); pageIdx++) {
        const pageNum = pageIdx + 1;
        const page = pdfDoc.getPages()[pageIdx];
        const pageDict = page.node;
        const resources = pageDict.Resources();

        if (!resources) continue;

        let xObjects = resources.get(window.PDFLib.PDFName.of('XObject'));

        // If it's a reference or doesn't have entries(), try to look it up
        if (xObjects && typeof xObjects.entries !== 'function') {
          console.log(`XObject is not a dict (type: ${xObjects.constructor.name}), attempting lookup...`);
          const lookedUp = pdfDoc.context.lookup(xObjects);
          if (lookedUp && lookedUp !== xObjects) {
            console.log(`  Looked up to type: ${lookedUp.constructor.name}`);
            xObjects = lookedUp;
          }
        }

        if (!xObjects) continue;

        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(xObjects));
        console.log(`XObjects final type: ${xObjects.constructor.name}, methods: ${methods.join(', ')}`);

        // PDFDict.entries() returns array of [PDFName, PDFObject][]
        if (typeof xObjects.entries !== 'function') {
          console.error(`Still cannot iterate after lookup. Type: ${xObjects.constructor.name}`);
          continue;
        }

        // Get entries array from PDFDict
        const xObjectEntries = xObjects.entries();
        console.log(`Found ${xObjectEntries.length} XObjects on page ${pageNum}`);

        // Check each XObject to see if it's an image
        for (const [xObjKey, xObjRef] of xObjectEntries) {
          const xObjKeyName = xObjKey.decodeText ? xObjKey.decodeText() : xObjKey.encodedName;
          const xObj = pdfDoc.context.lookup(xObjRef);

          // Check if it's an image XObject
          if (xObj && xObj.dict) {
            const type = xObj.dict.get(window.PDFLib.PDFName.of('Type'));
            const subtype = xObj.dict.get(window.PDFLib.PDFName.of('Subtype'));

            const isImage =
              subtype?.encodedName === '/Image' || subtype?.decodeText?.() === 'Image';

            if (isImage) {
              const widthObj = xObj.dict.get(window.PDFLib.PDFName.of('Width'));
              const heightObj = xObj.dict.get(window.PDFLib.PDFName.of('Height'));

              if (widthObj && heightObj) {
                // Convert PDFLib objects to plain numbers
                const width =
                  typeof widthObj === 'number'
                    ? widthObj
                    : typeof widthObj.asNumber === 'function'
                      ? widthObj.asNumber()
                      : Number(widthObj);
                const height =
                  typeof heightObj === 'number'
                    ? heightObj
                    : typeof heightObj.asNumber === 'function'
                      ? heightObj.asNumber()
                      : Number(heightObj);

                // Find the first unmatched image on this page with matching dimensions
                const pageImages = imagesByPage.get(pageNum) || [];
                console.log(
                  `Checking page ${pageNum}: found ${pageImages.length} candidate images for ${width}×${height}`
                );
                let optimizedImg = null;

                for (const img of pageImages) {
                  console.log(
                    `  Comparing with ${img.imageName}: ${img.width}×${img.height}, types: ${typeof img.width}/${typeof width}`
                  );
                  const imgKey = `${img.pageNum}-${img.index}`;
                  if (!matchedImages.has(imgKey) && img.width === width && img.height === height) {
                    optimizedImg = img;
                    matchedImages.add(imgKey);
                    console.log(`  ✓ MATCHED!`);
                    break;
                  }
                }

                if (optimizedImg) {
                  replacements.push({
                    pageNum,
                    xObjKeyName,
                    xObjRef,
                    optimizedImg,
                    width,
                    height,
                  });
                  console.log(
                    `✓ Matched XObject "${xObjKeyName}" on page ${pageNum} (${width}×${height}) with ${optimizedImg.imageName}`
                  );
                } else {
                  console.warn(
                    `⚠ No match found for "${xObjKeyName}" on page ${pageNum} (${width}×${height})`
                  );
                }
              }
            }
          }
        }
      }

      console.log(`Found ${replacements.length} images to replace`);

      // Now replace the matched images WITHOUT creating new objects
      console.log('Replacing image streams directly...');

      for (const replacement of replacements) {
        try {
          const { pageNum, xObjKeyName, xObjRef, optimizedImg, width, height } = replacement;

          // Get the optimized image bytes (or original if not optimized)
          const dataURLToUse = optimizedImg.optimizedDataURL || optimizedImg.dataURL;
          console.log(
            `Using ${optimizedImg.optimizedDataURL ? 'OPTIMIZED' : 'ORIGINAL'} data for "${xObjKeyName}" on page ${pageNum}`
          );

          const response = await fetch(dataURLToUse);
          const imageBytes = new Uint8Array(await response.arrayBuffer());

          // Get the old image object
          const oldImageObj = pdfDoc.context.lookup(xObjRef);

          if (!oldImageObj) {
            console.warn(`Could not find old image object for "${xObjKeyName}"`);
            continue;
          }

          // Determine if JPEG or PNG based on the data URL being used
          const isPng = dataURLToUse.includes('image/png');
          const isJpeg = dataURLToUse.includes('image/jpeg');

          // For PNG images, use pdf-lib's embedPng to properly handle transparency
          if (isPng) {
            try {
              // Check if this PNG has transparency
              const hasAlpha = await hasTransparency(dataURLToUse);
              console.log(`PNG "${xObjKeyName}" has transparency: ${hasAlpha}`);

              // Use pdf-lib's built-in PNG embedding which handles SMask automatically
              const embeddedImage = await pdfDoc.embedPng(imageBytes);

              // Get the embedded image's reference
              const newImageRef = embeddedImage.ref;

              // Replace the old reference with the new one in the page's XObject dictionary
              const page = pdfDoc.getPages()[pageNum - 1];
              const pageDict = page.node;
              const resources = pageDict.Resources();
              let xObjects = resources.get(window.PDFLib.PDFName.of('XObject'));

              // If it doesn't have set(), try to look it up
              if (xObjects && typeof xObjects.set !== 'function') {
                const lookedUp = pdfDoc.context.lookup(xObjects);
                if (lookedUp && lookedUp !== xObjects) {
                  xObjects = lookedUp;
                }
              }

              // Update the XObject reference
              xObjects.set(window.PDFLib.PDFName.of(xObjKeyName), newImageRef);

              console.log(
                `✓ Replaced PNG "${xObjKeyName}" on page ${pageNum} with transparency support (${formatBytes(imageBytes.length)})`
              );
              continue; // Skip the manual stream replacement below
            } catch (pngErr) {
              console.warn(
                `Failed to embed PNG with embedPng, falling back to manual method:`,
                pngErr
              );
              // Fall through to manual method below
            }
          }

          // For JPEG or fallback for PNG, use manual stream replacement
          const { PDFName, PDFRawStream } = window.PDFLib;

          // Create new dictionary based on image type
          const dict = pdfDoc.context.obj({
            Type: 'XObject',
            Subtype: 'Image',
            Width: width,
            Height: height,
            BitsPerComponent: 8,
            ColorSpace: 'DeviceRGB',
            Filter: isJpeg ? 'DCTDecode' : 'FlateDecode',
          });

          // Create a new stream with the optimized image data
          const stream = PDFRawStream.of(dict, imageBytes);

          // Replace the old object's content with the new stream
          oldImageObj.dict = stream.dict;
          oldImageObj.contents = stream.contents;

          console.log(
            `✓ Replaced "${xObjKeyName}" on page ${pageNum} (${formatBytes(imageBytes.length)})`
          );
        } catch (err) {
          console.warn(`Could not replace image "${replacement.xObjKeyName}":`, err);
        }
      }

      // Save the new PDF (should only contain optimized images)
      console.log('Saving optimized PDF...');
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false, // Disable object streams for better compatibility
      });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const originalName = state.currentPdfFile.name.replace('.pdf', '');
      a.download = `${originalName}-optimized.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Calculate actual saved size
      const savedSize = pdfBytes.length;
      const originalSize = state.pdfOriginalBytes.length;
      const reduction = Math.round((1 - savedSize / originalSize) * 100);

      showSuccess(
        `PDF saved! ${formatBytes(originalSize)} → ${formatBytes(savedSize)} (${reduction}% reduction)`
      );
      console.log('PDF save complete!');
    } catch (err) {
      console.error('Error saving PDF:', err);
      showError('Failed to save PDF: ' + err.message);
    } finally {
      showLoading(false);
    }
  });

  // Creates a new canvas from a DataURL at full resolution
  async function createFullCanvasFromImage(dataUrl) {
    const sourceImg = await createImageBitmapFromURL(dataUrl);
    const c = document.createElement('canvas');
    c.width = sourceImg.width;
    c.height = sourceImg.height;

    // Get context with alpha enabled to preserve transparency
    const ctx = c.getContext('2d', { alpha: true });

    // Clear canvas to transparent (not black)
    ctx.clearRect(0, 0, c.width, c.height);

    // Draw image (preserves transparency)
    ctx.drawImage(sourceImg, 0, 0);

    return c;
  }

  function loadImageOntoEditableImage(dataURL, isInitialLoad = false) {
    destroyCropper();
    return new Promise((resolve, reject) => {
      imageWrapper.style.display = 'none';
      editableImage.style.display = 'none';

      editableImage.removeAttribute('width');
      editableImage.removeAttribute('height');
      editableImage.style.cssText = `
                width: 100%; height: 100%;
                max-width: none; max-height: none;
                object-fit: contain; display: block;
            `;
      imageWrapper.style.width = '';
      imageWrapper.style.height = '';
      imageWrapper.style.overflow = 'hidden';

      editableImage.onload = () => {
        state.currentWidth = editableImage.naturalWidth;
        state.currentHeight = editableImage.naturalHeight;
        state.currentAspectRatio =
          state.currentHeight > 0 && state.currentWidth > 0
            ? state.currentWidth / state.currentHeight
            : 1;

        if (isInitialLoad) {
          state.originalWidth = state.currentWidth;
          state.originalHeight = state.currentHeight;
        }
        updateDimensionDisplays();

        if (state.currentWidth > 0 && state.currentHeight > 0) {
          imageWrapper.style.width = `${state.currentWidth}px`;
          imageWrapper.style.height = `${state.currentHeight}px`;
        } else {
          imageWrapper.style.width = 'auto';
          imageWrapper.style.height = 'auto';
          editableImage.style.maxWidth = '100%';
          editableImage.style.maxHeight = '100%';
        }
        // Only show imageWrapper if comparison mode is not active
        if (!state.isComparingImages) {
          imageWrapper.style.display = 'block';
        }
        editableImage.style.display = 'block';
        if (placeholderText) placeholderText.style.display = 'none';

        initCropper();
        resolve();
      };

      editableImage.onerror = () => {
        if (placeholderText) {
          placeholderText.textContent = 'Failed to load image.';
          placeholderText.style.display = 'block';
        }
        reject(new Error('Image failed to load.'));
      };

      editableImage.src = dataURL;
    });
  }

  function initCropper() {
    if (!editableImage.complete || imageWrapper.offsetWidth <= 0) return;
    if (state.cropper) destroyCropper();

    try {
      state.cropper = new Cropper(editableImage, {
        viewMode: 0,
        dragMode: 'move',
        autoCrop: false,
        responsive: true,
        restore: false,
        checkOrientation: false,
        modal: true,
        guides: true,
        center: true,
        highlight: true,
        background: true,
        movable: true,
        rotatable: true,
        scalable: true,
        zoomable: state.originalZoomableOption,
        zoomOnWheel: true,
        wheelZoomRatio: 0.1,
        zoomOnTouch: true,
        cropBoxMovable: true,
        cropBoxResizable: true,
        minContainerWidth: 10,
        minContainerHeight: 10,
        minCanvasWidth: 0,
        minCanvasHeight: 0,
        minCropBoxWidth: 0,
        minCropBoxHeight: 0,
        toggleDragModeOnDblclick: false,
        cropstart: handleCropStart,
        cropmove: handleCropMove,
        cropend: handleCropEnd,
        crop: handleCrop,
        ready() {
          console.log('Cropper ready.');
          state.cropper.disable();
          state.cropper.setDragMode('move');
          if (typeof state.originalZoomableOption === 'undefined') {
            state.originalZoomableOption = state.cropper.options.zoomable;
          } else {
            state.cropper.options.zoomable = state.originalZoomableOption;
          }
        },
      });
    } catch (err) {
      console.error('Failed to initialise Cropper:', err);
      notificationService.error('Error initialising cropping tool.');
      startCropBtn.disabled = true;
      applyCropBtn.disabled = true;
      cancelCropBtn.disabled = true;
    }
  }

  function destroyCropper() {
    if (state.cropper) {
      try {
        state.cropper.destroy();
      } catch (e) {}
      state.cropper = null;
    }
    if (cropSizeDisplay) {
      cropSizeDisplay.style.display = 'none';
    }
  }

  // --------------------------------------------------------------------------------------------
  // CROP EVENT HANDLERS
  // --------------------------------------------------------------------------------------------
  function handleCropStart(event) {
    console.log('Crop start', event.detail.action);
    if (!state.cropper) return;
    handleCropMove();
    if (cropSizeDisplay) cropSizeDisplay.style.display = 'block';
  }

  function handleCropMove() {
    if (!state.cropper || !cropSizeDisplay) return;
    try {
      const data = state.cropper.getData(true);
      const cropBoxData = state.cropper.getCropBoxData();

      cropSizeDisplay.textContent = `${data.width} x ${data.height} px`;

      const containerRect = imageContainer.getBoundingClientRect();
      const wrapperRect = imageWrapper.getBoundingClientRect();
      if (!containerRect || !wrapperRect) {
        console.warn('Could not get bounding rects for positioning crop display.');
        return;
      }

      const offsetLeft = wrapperRect.left - containerRect.left;
      const offsetTop = wrapperRect.top - containerRect.top;

      let displayTop = offsetTop + cropBoxData.top + cropBoxData.height + 5;
      let displayLeft = offsetLeft + cropBoxData.left;

      const displayHeight = cropSizeDisplay.offsetHeight || 20;
      const displayWidth = cropSizeDisplay.offsetWidth || 80;

      if (displayTop + displayHeight > imageContainer.clientHeight) {
        displayTop = offsetTop + cropBoxData.top - displayHeight - 5;
      }
      displayTop = Math.max(0, displayTop);
      displayLeft = Math.max(5, displayLeft);
      displayLeft = Math.min(displayLeft, imageContainer.clientWidth - displayWidth - 5);

      cropSizeDisplay.style.left = `${displayLeft + imageContainer.scrollLeft}px`;
      cropSizeDisplay.style.top = `${displayTop + imageContainer.scrollTop}px`;
      cropSizeDisplay.style.display = 'block';
    } catch (error) {
      console.error('Error in handleCropMove:', error);
    }
  }

  function handleCropEnd(event) {
    console.log('Crop end', event.detail.action);
  }

  function handleCrop() {
    if (!state.cropper) return;
    const data = state.cropper.getData(true);
    const isValidCrop = data.width > 0 && data.height > 0;
    if (applyCropBtn) {
      applyCropBtn.disabled = !isValidCrop;
    }
  }

  // --------------------------------------------------------------------------------------------
  // APPLY CROP / RESIZE => MASTER CANVAS
  // --------------------------------------------------------------------------------------------
  startCropBtn.addEventListener('click', () => {
    if (!state.cropper) return;
    state.cropper.enable();
    state.cropper.setDragMode('crop');
    state.cropper.setAspectRatio(state.state.currentAspectRatio_crop);
    state.isCropping = true;
    applyCropBtn.disabled = true;
    cancelCropBtn.disabled = false;
    state.cropper.options.zoomable = false;
  });

  applyCropBtn.addEventListener('click', async () => {
    if (!state.cropper || !state.isCropping) return;
    showLoading(true);
    try {
      pushStateToHistory(); // Store state before crop
      const croppedCanvas = state.cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        notificationService.warning('No valid crop area.');
        return;
      }
      const newWidth = croppedCanvas.width; // Use actual cropped size
      const newHeight = croppedCanvas.height; // Ignore resize fields

      state.masterCanvas = document.createElement('canvas');
      state.masterCanvas.width = newWidth;
      state.masterCanvas.height = newHeight;
      state.masterCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0);

      // Re-encode from state.masterCanvas => refresh display
      await refreshMainPreviewFromMasterCanvas();

      // Now that we've effectively changed the image size:
      resizeWidthInput.value = newWidth; // Show new dims in resize fields
      resizeHeightInput.value = newHeight;

      showSuccess(`Cropped to ${newWidth} × ${newHeight}px`);
    } catch (err) {
      console.error('Error applying crop:', err);
      notificationService.error('Could not apply crop.');
    } finally {
      state.cropper.disable();
      state.cropper.setDragMode('move');
      state.isCropping = false;
      applyCropBtn.disabled = true;
      cancelCropBtn.disabled = true;
      showLoading(false);
      resetUIState();
    }
  });

  cancelCropBtn.addEventListener('click', () => {
    if (!state.cropper) return;
    state.cropper.disable();
    state.cropper.setDragMode('move');
    state.isCropping = false;
    applyCropBtn.disabled = true;
    cancelCropBtn.disabled = true;
    state.cropper.options.zoomable = state.originalZoomableOption;
    resetUIState();
  });

  applyResizeBtn.addEventListener('click', async () => {
    if (!state.cropper) return;
    showLoading(true);
    try {
      pushStateToHistory(); // Store state before resize

      const croppedCanvas = state.cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        notificationService.warning('Cannot resize because no valid image is loaded.');
        return;
      }
      const newWidth = parseInt(resizeWidthInput.value, 10) || croppedCanvas.width;
      const newHeight = parseInt(resizeHeightInput.value, 10) || croppedCanvas.height;

      state.masterCanvas = document.createElement('canvas');
      state.masterCanvas.width = newWidth;
      state.masterCanvas.height = newHeight;
      state.masterCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0, newWidth, newHeight);

      await refreshMainPreviewFromMasterCanvas();
      showSuccess(`Resized to ${newWidth} × ${newHeight}px`);
    } catch (error) {
      console.error('Error applying resize:', error);
      notificationService.error('Could not resize.');
    } finally {
      showLoading(false);
      resetUIState();
    }
  });

  // Re-encode from state.masterCanvas using the currently selected format & quality
  async function refreshMainPreviewFromMasterCanvas() {
    if (!state.masterCanvas) return;
    const format = getCurrentFormat();
    const quality = getCurrentQuality();

    const newDataUrl = state.masterCanvas.toDataURL(format, quality);
    await loadImageOntoEditableImage(newDataUrl, false);
    updateEstimatedSize();

    // Update comparison view if active (edited is now on the left)
    if (state.isComparingImages && originalImagePreview) {
      originalImagePreview.src = newDataUrl;
    }
  }

  // --------------------------------------------------------------------------------------------
  // CROP ASPECT RATIO PRESETS
  // --------------------------------------------------------------------------------------------
  aspectButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      // Update active state
      aspectButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const aspectValue = btn.getAttribute('data-aspect');
      if (aspectValue === 'free') {
        state.state.currentAspectRatio_crop = NaN;
      } else {
        state.state.currentAspectRatio_crop = parseFloat(aspectValue);
      }

      // Update state.cropper if it's active
      if (state.cropper && state.isCropping) {
        state.cropper.setAspectRatio(state.state.currentAspectRatio_crop);
      }
    });
  });

  // --------------------------------------------------------------------------------------------
  // QUICK ACTIONS TOOLBAR
  // --------------------------------------------------------------------------------------------
  quickRotateLeft?.addEventListener('click', () => rotateImage(-90));
  quickRotateRight?.addEventListener('click', () => rotateImage(90));
  quickFlipH?.addEventListener('click', () => flipImage(true));
  quickFlipV?.addEventListener('click', () => flipImage(false));

  // --------------------------------------------------------------------------------------------
  // ROTATION AND FLIP
  // --------------------------------------------------------------------------------------------
  async function rotateImage(degrees) {
    if (!state.cropper) return;
    showLoading(true);
    try {
      pushStateToHistory();
      const croppedCanvas = state.cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        showError('Cannot rotate without a valid image.');
        return;
      }

      const radians = (degrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));

      const newWidth = croppedCanvas.width * cos + croppedCanvas.height * sin;
      const newHeight = croppedCanvas.width * sin + croppedCanvas.height * cos;

      state.masterCanvas = document.createElement('canvas');
      state.masterCanvas.width = newWidth;
      state.masterCanvas.height = newHeight;
      const ctx = state.masterCanvas.getContext('2d');
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(croppedCanvas, -croppedCanvas.width / 2, -croppedCanvas.height / 2);

      await refreshMainPreviewFromMasterCanvas();
      showSuccess(`Rotated ${degrees > 0 ? 'right' : 'left'} 90°`);
    } catch (error) {
      console.error('Error rotating image:', error);
      showError('Could not rotate image.');
    } finally {
      showLoading(false);
      resetUIState();
    }
  }

  async function flipImage(horizontal) {
    if (!state.cropper) return;
    showLoading(true);
    try {
      pushStateToHistory();
      const croppedCanvas = state.cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        showError('Cannot flip without a valid image.');
        return;
      }

      state.masterCanvas = document.createElement('canvas');
      state.masterCanvas.width = croppedCanvas.width;
      state.masterCanvas.height = croppedCanvas.height;
      const ctx = state.masterCanvas.getContext('2d');

      if (horizontal) {
        ctx.translate(croppedCanvas.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, croppedCanvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(croppedCanvas, 0, 0);

      await refreshMainPreviewFromMasterCanvas();
      showSuccess(`Flipped ${horizontal ? 'horizontally' : 'vertically'}`);
    } catch (error) {
      console.error('Error flipping image:', error);
      showError('Could not flip image.');
    } finally {
      showLoading(false);
      resetUIState();
    }
  }

  rotateLeftBtn.addEventListener('click', () => rotateImage(-90));
  rotateRightBtn.addEventListener('click', () => rotateImage(90));
  flipHorizontalBtn.addEventListener('click', () => flipImage(true));
  flipVerticalBtn.addEventListener('click', () => flipImage(false));

  // --------------------------------------------------------------------------------------------
  // FORMAT & QUALITY (DEBOUNCED SLIDER)
  // --------------------------------------------------------------------------------------------
  formatRadios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      handleQualityControlVisibility();
      showLoading(true);
      try {
        pushStateToHistory();
        await refreshMainPreviewFromMasterCanvas();
      } finally {
        showLoading(false);
        resetUIState();
      }
    });
  });

  const debouncedQualityUpdate = debounce(async () => {
    qualityValueDisplay.textContent = qualitySlider.value;
    showLoading(true);
    try {
      pushStateToHistory();
      await refreshMainPreviewFromMasterCanvas();
    } finally {
      showLoading(false);
      resetUIState();
    }
  }, 250);

  qualitySlider.addEventListener('input', debouncedQualityUpdate);

  function handleQualityControlVisibility() {
    const f = getCurrentFormat();
    if (f === 'image/jpeg' || f === 'image/webp') {
      qualityControl.style.display = 'block';
    } else {
      qualityControl.style.display = 'none';
    }
  }

  function getCurrentFormat() {
    return document.querySelector('input[name="format"]:checked')?.value || 'image/png';
  }
  function getCurrentQuality() {
    return parseFloat(qualitySlider.value);
  }
  function resetQualitySliderToMax() {
    qualitySlider.value = '1.0';
    qualityValueDisplay.textContent = '1.0';
  }

  // --------------------------------------------------------------------------------------------
  // LOCK ASPECT RATIO FOR RESIZE FIELDS
  // --------------------------------------------------------------------------------------------
  resizeWidthInput.addEventListener('input', () => {
    if (aspectLockCheckbox.checked && state.currentAspectRatio > 0) {
      const newWidth = parseInt(resizeWidthInput.value, 10);
      if (!isNaN(newWidth) && newWidth > 0) {
        const newHeight = Math.round(newWidth / state.currentAspectRatio);
        resizeHeightInput.value = newHeight;
      }
    }
  });

  resizeHeightInput.addEventListener('input', () => {
    if (aspectLockCheckbox.checked && state.currentAspectRatio > 0) {
      const newHeight = parseInt(resizeHeightInput.value, 10);
      if (!isNaN(newHeight) && newHeight > 0) {
        const newWidth = Math.round(newHeight * state.currentAspectRatio);
        resizeWidthInput.value = newWidth;
      }
    }
  });

  // --------------------------------------------------------------------------------------------
  // UNDO / HISTORY
  // --------------------------------------------------------------------------------------------
  function getImageState() {
    return {
      filename: state.currentImageFilename,
      width: state.currentWidth,
      height: state.currentHeight,
      aspectRatio: state.currentAspectRatio,
      format: getCurrentFormat(),
      quality: getCurrentQuality(),
      dataURL: state.masterCanvas
        ? state.masterCanvas.toDataURL(getCurrentFormat(), getCurrentQuality())
        : state.originalImageDataURL,

      cropperData: state.cropper ? state.cropper.getData() : null, // Save cropper data
    };
  }

  function pushStateToHistory() {
    if (!state.masterCanvas && !state.originalImageDataURL) return; // Nothing to save.
    const imageState = getImageState();

    historyManager.push(imageState);
    updateUndoButtonState();
  }

  async function restoreState(state) {
    if (!state) return;

    state.currentImageFilename = state.filename;
    state.currentWidth = state.width;
    state.currentHeight = state.height;
    state.currentAspectRatio = state.aspectRatio;
    resizeWidthInput.value = state.currentWidth || '';
    resizeHeightInput.value = state.currentHeight || '';

    if (qualitySlider) qualitySlider.value = state.quality;
    if (qualityValueDisplay) qualityValueDisplay.textContent = state.quality;

    // Restore format selection
    if (state.format) {
      const formatRadio = document.querySelector(`input[name="format"][value="${state.format}"]`);
      if (formatRadio) formatRadio.checked = true;
      handleQualityControlVisibility();
    }

    // Update UI immediately
    updateDimensionDisplays();
    updateEstimatedSize();
    fileNameDisplay.textContent = state.currentImageFilename || '';

    try {
      await loadImageOntoEditableImage(state.dataURL, false); // reload the data URL

      // Recreate state.masterCanvas from the restored state
      state.masterCanvas = await createFullCanvasFromImage(state.dataURL);

      if (state.state.cropperData && state.cropper) {
        state.cropper.setData(state.state.cropperData); // Restore crop area if needed.
      }

      // Update comparison view since it's always on
      if (state.isComparingImages && originalImagePreview) {
        originalImagePreview.src = state.dataURL;
      }

      updateUndoButtonState(); // Enable / disable undo
      resetUIState(); // Make sure UI toggles reflect state.
    } catch (err) {
      console.error('Failed to restore image:', err);
      showError('Failed to restore state. Image load error.');
    }
  }

  function updateUndoButtonState() {
    undoBtn.disabled = historyManager.isEmpty();
  }

  undoBtn.addEventListener('click', async () => {
    if (historyManager.isEmpty()) {
      undoMessageEl.textContent = 'Nothing to undo.'; // Display message
      setTimeout(() => {
        undoMessageEl.textContent = '';
      }, UI.NOTIFICATION_DURATION_MS); // Clear after duration
      return; // Exit the function
    }

    undoMessageEl.textContent = ''; // Clear the message before undoing

    const prevState = historyManager.pop();
    if (!historyManager.isEmpty()) {
      // Get the last item without removing it
      const states = historyManager.stack;
      await restoreState(states[states.length - 1]);
    } else {
      // Attempt to restore the original image
      if (state.originalImageDataURL) {
        await restoreState({
          filename: state.currentImageFilename,
          width: state.originalWidth,
          height: state.originalHeight,
          aspectRatio: state.originalWidth / state.originalHeight || 1, // Calculate, or default to 1
          format: 'image/png', // Or use a default
          quality: '1',
          dataURL: state.originalImageDataURL,
        });
      } else {
        console.warn('No original image to restore to.');
        clearAll(); // Fallback: clear if no original image available.
        undoMessageEl.textContent = 'No original image to restore. Cleared.';
        setTimeout(() => {
          undoMessageEl.textContent = '';
        }, 3000); // Clear after 3 seconds
      }

      showLoading(false);
      resetUIState();
    }
  });

  // --------------------------------------------------------------------------------------------
  // DIMENSION & FILE SIZE DISPLAY
  // --------------------------------------------------------------------------------------------
  function updateDimensionDisplays() {
    originalDimensionsEl.textContent = `${state.originalWidth} x ${state.originalHeight} px`;
    const dw = Math.max(0, Math.round(state.currentWidth));
    const dh = Math.max(0, Math.round(state.currentHeight));
    currentDimensionsEl.textContent = `${dw} x ${dh} px`;
    resizeWidthInput.value = dw > 0 ? dw : '';
    resizeHeightInput.value = dh > 0 ? dh : '';
  }

  async function updateEstimatedSize() {
    if (
      !editableImage.src ||
      editableImage.src === '#' ||
      state.currentWidth <= 0 ||
      state.currentHeight <= 0
    ) {
      optimizedFileSizeEl.textContent = '--';
      return;
    }
    try {
      const size = await getBlobSizeFromDataURL(editableImage.src);
      optimizedFileSizeEl.textContent = formatBytes(size);
    } catch (error) {
      console.error('Error updating estimated size:', error);
      optimizedFileSizeEl.textContent = '--';
    }
  }

  // --------------------------------------------------------------------------------------------
  // COMPARISON MODE
  // --------------------------------------------------------------------------------------------
  function toggleComparison(show) {
    if (!state.originalImageDataURL || !state.masterCanvas) return;
    state.isComparingImages = show;

    if (show) {
      // Swap: edited on left (comparison-original), original on right (comparison-edited with clip)
      const format = getCurrentFormat();
      const quality = getCurrentQuality();
      originalImagePreview.src = state.masterCanvas.toDataURL(format, quality); // Edited on left
      editedImagePreview.src = state.originalImageDataURL; // Original on right

      comparisonContainer.style.display = 'block';
      imageWrapper.style.display = 'none';
      updateComparisonSlider(50);
    } else {
      comparisonContainer.style.display = 'none';
      imageWrapper.style.display = 'block';
    }
  }

  function updateComparisonSlider(value) {
    const editedDiv = document.querySelector('.comparison-edited');
    const divider = document.querySelector('.comparison-divider');
    if (editedDiv && divider) {
      editedDiv.style.clipPath = `inset(0 0 0 ${value}%)`;
      divider.style.left = `${value}%`;
    }
  }

  comparisonSlider?.addEventListener('input', (e) => {
    updateComparisonSlider(e.target.value);
  });

  // Compare button toggle
  compareBtn?.addEventListener('click', () => {
    toggleComparison(!state.isComparingImages);
    updateCompareButton();
  });

  function updateCompareButton() {
    if (compareBtn) {
      if (state.isComparingImages) {
        compareBtn.textContent = 'Exit Compare';
        compareBtn.classList.add('active');
      } else {
        compareBtn.textContent = 'Compare';
        compareBtn.classList.remove('active');
      }
    }
  }

  // --------------------------------------------------------------------------------------------
  // KEYBOARD SHORTCUTS
  // --------------------------------------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    // Ctrl+S or Cmd+S: Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (!saveBtn.disabled) {
        saveBtn.click();
      }
    }
    // Ctrl+Z or Cmd+Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (!undoBtn.disabled) {
        undoBtn.click();
      }
    }
  });

  // --------------------------------------------------------------------------------------------
  // CLEAR / RESET
  // --------------------------------------------------------------------------------------------
  clearAllBtn.addEventListener('click', () => {
    clearAll();
  });

  function clearAll() {
    destroyCropper();
    placeholderText.style.display = 'block';
    placeholderText.textContent = 'Upload an image to begin';
    editableImage.src = '#';
    imageWrapper.style.width = '';
    imageWrapper.style.height = '';
    state.masterCanvas = null;
    state.originalImageDataURL = null;
    state.originalWidth = 0;
    state.originalHeight = 0;
    state.originalFileSize = 0;
    state.currentWidth = 0;
    state.currentHeight = 0;
    fileNameDisplay.textContent = '';
    originalDimensionsEl.textContent = '--';
    originalFileSizeEl.textContent = '--';
    currentDimensionsEl.textContent = '--';
    optimizedFileSizeEl.textContent = '--';
    startCropBtn.disabled = false;
    applyCropBtn.disabled = true;
    cancelCropBtn.disabled = true;
    resizeWidthInput.value = '';
    resizeHeightInput.value = '';
    aspectLockCheckbox.checked = true;
    resetQualitySliderToMax();
    state.isComparingImages = false;
    comparisonContainer.style.display = 'none';
    imageWrapper.style.display = 'none';

    // Clear PDF state
    pdfGallery.style.display = 'none';
    pdfInfoSection.style.display = 'none';
    pdfBulkSection.style.display = 'none';
    savePdfBtn.style.display = 'none';
    backToGalleryBtn.style.display = 'none';
    // Clean up PDF images with memory utility
    cleanupPdfImages(state.pdfImages);
    state.currentPdfFile = null;
    state.pdfDocument = null;
    state.currentEditingImageIndex = -1;

    // Clean up history with memory manager
    historyManager.clear();

    // Dispose of canvas
    if (state.masterCanvas) {
      disposeCanvas(state.masterCanvas);
      state.masterCanvas = null;
    }

    // Dispose of state.cropper
    if (state.cropper) {
      disposeCropper(state.cropper);
      state.cropper = null;
    }

    resetUIState();
  }

  function resetUIState() {
    const hasImage = !!state.masterCanvas;
    clearSection.style.display = hasImage ? 'block' : 'none';
    // Show sections but keep them collapsed (content hidden via CSS)
    cropSection.style.display = hasImage ? 'block' : 'none';
    rotateSection.style.display = hasImage ? 'block' : 'none';
    resizeSection.style.display = hasImage ? 'block' : 'none';
    formatSection.style.display = hasImage ? 'block' : 'none';
    imageInfoSection.style.display = hasImage ? 'block' : 'none';
    quickActions.style.display = hasImage ? 'flex' : 'none';
    saveBtn.disabled = !hasImage;
    saveBtn.style.display = hasImage ? 'inline-flex' : 'none';
    savePdfBtn.style.display = 'none'; // Hide PDF save button in image mode
    // Show compare button for image editing
    if (compareBtn) {
      compareBtn.style.display = hasImage ? 'inline-flex' : 'none';
      compareBtn.disabled = !hasImage;
    }
    // Show undo button for image editing
    if (undoBtn) {
      undoBtn.style.display = hasImage ? 'inline-flex' : 'none';
    }
    updateCurrentDimsDisplay();
    handleQualityControlVisibility();
  }

  // --------------------------------------------------------------------------------------------
  // SAVE BUTTON
  // --------------------------------------------------------------------------------------------
  saveBtn.addEventListener('click', () => {
    if (!state.masterCanvas) {
      notificationService.warning('No image to save.');
      return;
    }
    const format = getCurrentFormat();
    const quality = getCurrentQuality();

    const finalDataUrl = state.masterCanvas.toDataURL(format, quality);
    const a = document.createElement('a');
    a.href = finalDataUrl;
    a.download = state.currentImageFilename || 'image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

  // --------------------------------------------------------------------------------------------
  // INIT
  // --------------------------------------------------------------------------------------------
  loadThemeSettings();
  checkDisclaimer();
  checkPendingImage();
  resetUIState();

  // Set up memory cleanup on page unload
  setupUnloadCleanup({
    masterCanvas: state.masterCanvas,
    cropper: state.cropper,
    historyManager,
    pdfImages: state.pdfImages,
    originalImageDataURL: state.originalImageDataURL,
  });
});
