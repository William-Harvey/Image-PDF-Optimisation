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

  // --- State ---
  let cropper = null;
  let originalImageDataURL = null;
  let currentImageFilename = DEFAULTS.IMAGE_FILENAME;
  let originalWidth = 0;
  let originalHeight = 0;
  let originalFileSize = 0;
  let currentWidth = 0;
  let currentHeight = 0;
  let currentAspectRatio = DEFAULTS.ASPECT_RATIO;
  let isCropping = false;
  let originalZoomableOption = DEFAULTS.ZOOM_ENABLED;

  // Uncompressed canvas storing all edits (crop, resize).
  let masterCanvas = null;

  // Undo stack - using HistoryManager for bounded memory
  const historyManager = new HistoryManager();

  // Comparison mode state
  let isComparingImages = false;

  // Aspect ratio for cropping
  let currentAspectRatio_crop = CROP.ASPECT_FREE; // NaN = free, number = locked ratio

  // PDF state
  let currentPdfFile = null;
  let pdfDocument = null;
  let pdfOriginalBytes = null; // Store original PDF for text preservation
  let pdfImages = []; // Array of {index, dataURL, originalSize, optimizedDataURL, optimizedSize, width, height, pageNum, imageName}
  let currentEditingImageIndex = null;
  let currentPreviewIndex = 0; // For preview modal navigation
  let isPreviewComparing = false; // For preview compare mode
  let isPdfMode = false;
  let previewBgMode = 'dark'; // Background mode for preview: 'dark', 'light', 'checkerboard'

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
    if (currentDimsDisplay && currentWidth > 0 && currentHeight > 0) {
      currentDimsDisplay.textContent = `${Math.round(currentWidth)} × ${Math.round(currentHeight)}px`;
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
      currentImageFilename = sanitizeFilename(rawFilename);
      fileNameDisplay.textContent = currentImageFilename;

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
    originalImageDataURL = dataURL;
    originalFileSize = fileSize;
    originalFileSizeEl.textContent = formatBytes(originalFileSize);

    try {
      await loadImageOntoEditableImage(originalImageDataURL, true);
      masterCanvas = await createFullCanvasFromImage(originalImageDataURL);
      resetQualitySliderToMax();
      resetUIState();
      updateEstimatedSize();
      toggleComparison(false); // Start with comparison disabled so editing works
      updateCompareButton();
      showLoading(false);
      announceToScreenReader(
        `Image loaded: ${currentImageFilename}, ${originalWidth} by ${originalHeight} pixels`
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

    currentImageFilename = sanitizeFilename(file.name);
    fileNameDisplay.textContent = currentImageFilename;
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

        currentImageFilename = sanitizeFilename(file.name);
        fileNameDisplay.textContent = currentImageFilename;
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

        currentImageFilename = sanitizeFilename(`pasted-image-${Date.now()}.png`);
        fileNameDisplay.textContent = currentImageFilename;
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

    currentPdfFile = file;
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
    pdfOriginalBytes = new Uint8Array(arrayBuffer).slice();
    console.log(`Stored original PDF: ${pdfOriginalBytes.length} bytes`);

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
    pdfImages = await extractPdfImages(file, mode);

    if (pdfImages.length === 0) {
      throw new Error(
        mode === 'fullpages'
          ? 'Failed to render PDF pages.'
          : 'No images found in PDF. This PDF may only contain vector graphics or text.'
      );
    }

    console.log(
      `Extracted ${pdfImages.length} ${mode === 'fullpages' ? 'pages' : 'images'} using unpdf`
    );
    pdfImageCount.textContent = pdfImages.length;
    galleryImageCount.textContent = pdfImages.length;
    renderPdfGallery();

    // Show preview button after extraction
    if (previewAllBtn && pdfImages.length > 0) {
      previewAllBtn.style.display = 'block';
    }

    console.log('Smart extraction complete!');
  }

  function renderPdfGallery() {
    console.log('renderPdfGallery called. Number of images:', pdfImages.length);
    pdfImageGrid.innerHTML = '';

    pdfImages.forEach((img, idx) => {
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
    pdfImages.forEach((img) => {
      totalOptimized += img.optimizedSize || img.originalSize;
    });
    pdfOptimizedSize.textContent = formatBytes(totalOptimized);

    const optimizedCount = pdfImages.filter((img) => img.isOptimized).length;
    const allOptimized = pdfImages.every((img) => img.isOptimized);

    // Always enable save button, but update text to show progress
    savePdfBtn.disabled = false;
    if (allOptimized) {
      savePdfBtn.textContent = `Save Optimized PDF (${pdfImages.length}/${pdfImages.length})`;
    } else {
      savePdfBtn.textContent = `Save PDF (${optimizedCount}/${pdfImages.length} optimized)`;
    }
  }

  function showPdfGallery() {
    isPdfMode = true;
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
    currentEditingImageIndex = index;
    const img = pdfImages[index];

    showLoading(true);
    try {
      currentImageFilename = `page-${img.pageNum}.png`;
      fileNameDisplay.textContent = `Editing: ${currentImageFilename}`;

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
      'Back to Gallery clicked. currentEditingImageIndex:',
      currentEditingImageIndex,
      'masterCanvas exists:',
      !!masterCanvas
    );

    if (currentEditingImageIndex !== null && masterCanvas) {
      showLoading(true);
      try {
        const format = getCurrentFormat();
        const quality = getCurrentQuality();
        const optimizedDataURL = masterCanvas.toDataURL(format, quality);
        const optimizedSize = await getBlobSizeFromDataURL(optimizedDataURL);

        console.log(
          'Saving image at index',
          currentEditingImageIndex,
          'Size:',
          optimizedSize,
          'isOptimized: true'
        );

        pdfImages[currentEditingImageIndex].optimizedDataURL = optimizedDataURL;
        pdfImages[currentEditingImageIndex].optimizedSize = optimizedSize;
        pdfImages[currentEditingImageIndex].isOptimized = true;
        pdfImages[currentEditingImageIndex].previewQuality = quality;
        pdfImages[currentEditingImageIndex].width = masterCanvas.width;
        pdfImages[currentEditingImageIndex].height = masterCanvas.height;

        console.log('Saved pdfImages[' + currentEditingImageIndex + ']:', {
          isOptimized: pdfImages[currentEditingImageIndex].isOptimized,
          optimizedSize: pdfImages[currentEditingImageIndex].optimizedSize,
          hasOptimizedDataURL: !!pdfImages[currentEditingImageIndex].optimizedDataURL,
        });

        renderPdfGallery();
        showSuccess('Image updated');
      } catch (err) {
        console.error('Error saving edited image:', err);
      }
      showLoading(false);
    } else {
      console.log('Skipping save - no edits detected or masterCanvas is null');
    }

    currentEditingImageIndex = null;
    clearAll();
    showPdfGallery();
    fileNameDisplay.textContent = currentPdfFile.name;
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
      for (let i = 0; i < pdfImages.length; i++) {
        const img = pdfImages[i];

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

        pdfImages[i].optimizedDataURL = optimizedDataURL;
        pdfImages[i].optimizedSize = optimizedSize;
        pdfImages[i].isOptimized = true;
        pdfImages[i].previewQuality = quality;
        pdfImages[i].width = imgWidth;
        pdfImages[i].height = imgHeight;
      }

      renderPdfGallery();
      const avgReduction = Math.round(
        (1 -
          pdfImages.reduce((sum, img) => sum + img.optimizedSize, 0) /
            pdfImages.reduce((sum, img) => sum + img.originalSize, 0)) *
          100
      );
      showSuccess(`All ${pdfImages.length} images optimized (${avgReduction}% reduction)`);

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
    currentPreviewIndex = index;
    await updatePreviewDisplay();

    // Set initial background
    if (previewImageWrapper) {
      previewImageWrapper.className = 'preview-image-wrapper bg-' + previewBgMode;
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
    if (!pdfImages[currentPreviewIndex]) return;

    const img = pdfImages[currentPreviewIndex];

    // If image hasn't been optimized yet, create an initial preview at default quality
    if (!img.optimizedDataURL) {
      const defaultQuality = 0.8;
      try {
        // Check for transparency and choose format accordingly
        const hasAlpha = await hasTransparency(img.dataURL);
        const selectedFormat = hasAlpha ? 'image/png' : 'image/jpeg';
        console.log(
          `Preview ${currentPreviewIndex}: ${hasAlpha ? 'has transparency, using PNG' : 'opaque, using JPEG'}`
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

    console.log('Preview image', currentPreviewIndex, {
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
      previewImageNumber.textContent = `Image ${currentPreviewIndex + 1} of ${pdfImages.length}`;
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
      prevImageBtn.disabled = currentPreviewIndex === 0;
    }
    if (nextImageBtn) {
      nextImageBtn.disabled = currentPreviewIndex === pdfImages.length - 1;
    }
  }

  async function navigatePreview(direction) {
    const newIndex = currentPreviewIndex + direction;
    if (newIndex >= 0 && newIndex < pdfImages.length) {
      currentPreviewIndex = newIndex;
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
    editPdfImage(currentPreviewIndex);
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
      const img = pdfImages[currentPreviewIndex];
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
    if (previewBgMode === 'dark') {
      previewBgMode = 'light';
    } else if (previewBgMode === 'light') {
      previewBgMode = 'checkerboard';
    } else {
      previewBgMode = 'dark';
    }

    // Update the wrapper classes
    if (previewImageWrapper) {
      previewImageWrapper.className = 'preview-image-wrapper bg-' + previewBgMode;
    }

    console.log('Preview background changed to:', previewBgMode);
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
    const img = pdfImages[currentPreviewIndex];
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
        `Apply: Image ${currentPreviewIndex} - ${hasAlpha ? 'has transparency, using PNG' : 'opaque, using JPEG'}`
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

      console.log(`Preview: Applied quality ${quality} to image ${currentPreviewIndex}`, {
        format: selectedFormat,
        originalSize: img.originalSize,
        newOptimizedSize: optimizedSize,
        reduction: Math.round((1 - optimizedSize / img.originalSize) * 100) + '%',
      });

      // Update the pdfImages array
      pdfImages[currentPreviewIndex].optimizedDataURL = optimizedDataURL;
      pdfImages[currentPreviewIndex].optimizedSize = optimizedSize;
      pdfImages[currentPreviewIndex].isOptimized = true;
      pdfImages[currentPreviewIndex].previewQuality = quality;
      pdfImages[currentPreviewIndex].width = imgWidth;
      pdfImages[currentPreviewIndex].height = imgHeight;

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
      const isFullPageMode = pdfImages.length > 0 && pdfImages[0].imageName.startsWith('page_');

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
          format: [pdfImages[0].width, pdfImages[0].height],
        });

        // Add first page
        const firstImg = pdfImages[0];
        const imgData = firstImg.optimizedDataURL || firstImg.dataURL;
        pdf.addImage(imgData, 'PNG', 0, 0, firstImg.width, firstImg.height);

        // Add remaining pages
        for (let i = 1; i < pdfImages.length; i++) {
          const img = pdfImages[i];
          const pageImgData = img.optimizedDataURL || img.dataURL;
          pdf.addPage([img.width, img.height], img.width > img.height ? 'landscape' : 'portrait');
          pdf.addImage(pageImgData, 'PNG', 0, 0, img.width, img.height);
        }

        // Save the PDF
        const pdfBlob = pdf.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentPdfFile.name.replace('.pdf', '_optimized.pdf');
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

      // Debug: Check pdfOriginalBytes status
      console.log('pdfOriginalBytes type:', typeof pdfOriginalBytes);
      console.log('pdfOriginalBytes is null?', pdfOriginalBytes === null);
      console.log('pdfOriginalBytes is undefined?', pdfOriginalBytes === undefined);
      if (pdfOriginalBytes) {
        console.log('pdfOriginalBytes length:', pdfOriginalBytes.length);
        console.log('pdfOriginalBytes constructor:', pdfOriginalBytes.constructor.name);
      }

      // Verify we have the original PDF bytes
      if (!pdfOriginalBytes || pdfOriginalBytes.length === 0) {
        throw new Error('Original PDF data not available');
      }
      console.log(`Original PDF size: ${pdfOriginalBytes.length} bytes`);

      // Load the PDF - we'll modify it in place at the stream level
      const pdfDoc = await window.PDFLib.PDFDocument.load(pdfOriginalBytes);

      console.log('Matching images by page and dimensions...');

      // Group images by page for matching
      const imagesByPage = new Map();
      for (const img of pdfImages) {
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
        if (xObjects && xObjects.constructor.name === 'PDFRef') {
          xObjects = pdfDoc.context.lookup(xObjects);
        }

        if (!xObjects) continue;

        // Check if xObjects has entries method (PDFLib dictionary)
        if (typeof xObjects.entries !== 'function') {
          console.warn(`XObjects on page ${pageNum} does not have entries() method`, {
            type: typeof xObjects,
            constructor: xObjects?.constructor?.name,
            keys: Object.keys(xObjects || {}).slice(0, 5),
          });
          continue;
        }

        // Check each XObject to see if it's an image
        for (const [xObjKey, xObjRef] of xObjects.entries()) {
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
              if (xObjects && xObjects.constructor.name === 'PDFRef') {
                xObjects = pdfDoc.context.lookup(xObjects);
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
      const originalName = currentPdfFile.name.replace('.pdf', '');
      a.download = `${originalName}-optimized.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Calculate actual saved size
      const savedSize = pdfBytes.length;
      const originalSize = pdfOriginalBytes.length;
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
        currentWidth = editableImage.naturalWidth;
        currentHeight = editableImage.naturalHeight;
        currentAspectRatio =
          currentHeight > 0 && currentWidth > 0 ? currentWidth / currentHeight : 1;

        if (isInitialLoad) {
          originalWidth = currentWidth;
          originalHeight = currentHeight;
        }
        updateDimensionDisplays();

        if (currentWidth > 0 && currentHeight > 0) {
          imageWrapper.style.width = `${currentWidth}px`;
          imageWrapper.style.height = `${currentHeight}px`;
        } else {
          imageWrapper.style.width = 'auto';
          imageWrapper.style.height = 'auto';
          editableImage.style.maxWidth = '100%';
          editableImage.style.maxHeight = '100%';
        }
        // Only show imageWrapper if comparison mode is not active
        if (!isComparingImages) {
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
    if (cropper) destroyCropper();

    try {
      cropper = new Cropper(editableImage, {
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
        zoomable: originalZoomableOption,
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
          cropper.disable();
          cropper.setDragMode('move');
          if (typeof originalZoomableOption === 'undefined') {
            originalZoomableOption = cropper.options.zoomable;
          } else {
            cropper.options.zoomable = originalZoomableOption;
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
    if (cropper) {
      try {
        cropper.destroy();
      } catch (e) {}
      cropper = null;
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
    if (!cropper) return;
    handleCropMove();
    if (cropSizeDisplay) cropSizeDisplay.style.display = 'block';
  }

  function handleCropMove() {
    if (!cropper || !cropSizeDisplay) return;
    try {
      const data = cropper.getData(true);
      const cropBoxData = cropper.getCropBoxData();

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
    if (!cropper) return;
    const data = cropper.getData(true);
    const isValidCrop = data.width > 0 && data.height > 0;
    if (applyCropBtn) {
      applyCropBtn.disabled = !isValidCrop;
    }
  }

  // --------------------------------------------------------------------------------------------
  // APPLY CROP / RESIZE => MASTER CANVAS
  // --------------------------------------------------------------------------------------------
  startCropBtn.addEventListener('click', () => {
    if (!cropper) return;
    cropper.enable();
    cropper.setDragMode('crop');
    cropper.setAspectRatio(currentAspectRatio_crop);
    isCropping = true;
    applyCropBtn.disabled = true;
    cancelCropBtn.disabled = false;
    cropper.options.zoomable = false;
  });

  applyCropBtn.addEventListener('click', async () => {
    if (!cropper || !isCropping) return;
    showLoading(true);
    try {
      pushStateToHistory(); // Store state before crop
      const croppedCanvas = cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        notificationService.warning('No valid crop area.');
        return;
      }
      const newWidth = croppedCanvas.width; // Use actual cropped size
      const newHeight = croppedCanvas.height; // Ignore resize fields

      masterCanvas = document.createElement('canvas');
      masterCanvas.width = newWidth;
      masterCanvas.height = newHeight;
      masterCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0);

      // Re-encode from masterCanvas => refresh display
      await refreshMainPreviewFromMasterCanvas();

      // Now that we've effectively changed the image size:
      resizeWidthInput.value = newWidth; // Show new dims in resize fields
      resizeHeightInput.value = newHeight;

      showSuccess(`Cropped to ${newWidth} × ${newHeight}px`);
    } catch (err) {
      console.error('Error applying crop:', err);
      notificationService.error('Could not apply crop.');
    } finally {
      cropper.disable();
      cropper.setDragMode('move');
      isCropping = false;
      applyCropBtn.disabled = true;
      cancelCropBtn.disabled = true;
      showLoading(false);
      resetUIState();
    }
  });

  cancelCropBtn.addEventListener('click', () => {
    if (!cropper) return;
    cropper.disable();
    cropper.setDragMode('move');
    isCropping = false;
    applyCropBtn.disabled = true;
    cancelCropBtn.disabled = true;
    cropper.options.zoomable = originalZoomableOption;
    resetUIState();
  });

  applyResizeBtn.addEventListener('click', async () => {
    if (!cropper) return;
    showLoading(true);
    try {
      pushStateToHistory(); // Store state before resize

      const croppedCanvas = cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        notificationService.warning('Cannot resize because no valid image is loaded.');
        return;
      }
      const newWidth = parseInt(resizeWidthInput.value, 10) || croppedCanvas.width;
      const newHeight = parseInt(resizeHeightInput.value, 10) || croppedCanvas.height;

      masterCanvas = document.createElement('canvas');
      masterCanvas.width = newWidth;
      masterCanvas.height = newHeight;
      masterCanvas.getContext('2d').drawImage(croppedCanvas, 0, 0, newWidth, newHeight);

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

  // Re-encode from masterCanvas using the currently selected format & quality
  async function refreshMainPreviewFromMasterCanvas() {
    if (!masterCanvas) return;
    const format = getCurrentFormat();
    const quality = getCurrentQuality();

    const newDataUrl = masterCanvas.toDataURL(format, quality);
    await loadImageOntoEditableImage(newDataUrl, false);
    updateEstimatedSize();

    // Update comparison view if active (edited is now on the left)
    if (isComparingImages && originalImagePreview) {
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
        currentAspectRatio_crop = NaN;
      } else {
        currentAspectRatio_crop = parseFloat(aspectValue);
      }

      // Update cropper if it's active
      if (cropper && isCropping) {
        cropper.setAspectRatio(currentAspectRatio_crop);
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
    if (!cropper) return;
    showLoading(true);
    try {
      pushStateToHistory();
      const croppedCanvas = cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        showError('Cannot rotate without a valid image.');
        return;
      }

      const radians = (degrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));

      const newWidth = croppedCanvas.width * cos + croppedCanvas.height * sin;
      const newHeight = croppedCanvas.width * sin + croppedCanvas.height * cos;

      masterCanvas = document.createElement('canvas');
      masterCanvas.width = newWidth;
      masterCanvas.height = newHeight;
      const ctx = masterCanvas.getContext('2d');
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
    if (!cropper) return;
    showLoading(true);
    try {
      pushStateToHistory();
      const croppedCanvas = cropper.getCroppedCanvas();
      if (!croppedCanvas) {
        showError('Cannot flip without a valid image.');
        return;
      }

      masterCanvas = document.createElement('canvas');
      masterCanvas.width = croppedCanvas.width;
      masterCanvas.height = croppedCanvas.height;
      const ctx = masterCanvas.getContext('2d');

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
    if (aspectLockCheckbox.checked && currentAspectRatio > 0) {
      const newWidth = parseInt(resizeWidthInput.value, 10);
      if (!isNaN(newWidth) && newWidth > 0) {
        const newHeight = Math.round(newWidth / currentAspectRatio);
        resizeHeightInput.value = newHeight;
      }
    }
  });

  resizeHeightInput.addEventListener('input', () => {
    if (aspectLockCheckbox.checked && currentAspectRatio > 0) {
      const newHeight = parseInt(resizeHeightInput.value, 10);
      if (!isNaN(newHeight) && newHeight > 0) {
        const newWidth = Math.round(newHeight * currentAspectRatio);
        resizeWidthInput.value = newWidth;
      }
    }
  });

  // --------------------------------------------------------------------------------------------
  // UNDO / HISTORY
  // --------------------------------------------------------------------------------------------
  function getImageState() {
    return {
      filename: currentImageFilename,
      width: currentWidth,
      height: currentHeight,
      aspectRatio: currentAspectRatio,
      format: getCurrentFormat(),
      quality: getCurrentQuality(),
      dataURL: masterCanvas
        ? masterCanvas.toDataURL(getCurrentFormat(), getCurrentQuality())
        : originalImageDataURL,

      cropperData: cropper ? cropper.getData() : null, // Save cropper data
    };
  }

  function pushStateToHistory() {
    if (!masterCanvas && !originalImageDataURL) return; // Nothing to save.
    const state = getImageState();

    historyManager.push(state);
    updateUndoButtonState();
  }

  async function restoreState(state) {
    if (!state) return;

    currentImageFilename = state.filename;
    currentWidth = state.width;
    currentHeight = state.height;
    currentAspectRatio = state.aspectRatio;
    resizeWidthInput.value = currentWidth || '';
    resizeHeightInput.value = currentHeight || '';

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
    fileNameDisplay.textContent = currentImageFilename || '';

    try {
      await loadImageOntoEditableImage(state.dataURL, false); // reload the data URL

      // Recreate masterCanvas from the restored state
      masterCanvas = await createFullCanvasFromImage(state.dataURL);

      if (state.cropperData && cropper) {
        cropper.setData(state.cropperData); // Restore crop area if needed.
      }

      // Update comparison view since it's always on
      if (isComparingImages && originalImagePreview) {
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
      if (originalImageDataURL) {
        await restoreState({
          filename: currentImageFilename,
          width: originalWidth,
          height: originalHeight,
          aspectRatio: originalWidth / originalHeight || 1, // Calculate, or default to 1
          format: 'image/png', // Or use a default
          quality: '1',
          dataURL: originalImageDataURL,
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
    originalDimensionsEl.textContent = `${originalWidth} x ${originalHeight} px`;
    const dw = Math.max(0, Math.round(currentWidth));
    const dh = Math.max(0, Math.round(currentHeight));
    currentDimensionsEl.textContent = `${dw} x ${dh} px`;
    resizeWidthInput.value = dw > 0 ? dw : '';
    resizeHeightInput.value = dh > 0 ? dh : '';
  }

  async function updateEstimatedSize() {
    if (
      !editableImage.src ||
      editableImage.src === '#' ||
      currentWidth <= 0 ||
      currentHeight <= 0
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
    if (!originalImageDataURL || !masterCanvas) return;
    isComparingImages = show;

    if (show) {
      // Swap: edited on left (comparison-original), original on right (comparison-edited with clip)
      const format = getCurrentFormat();
      const quality = getCurrentQuality();
      originalImagePreview.src = masterCanvas.toDataURL(format, quality); // Edited on left
      editedImagePreview.src = originalImageDataURL; // Original on right

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
    toggleComparison(!isComparingImages);
    updateCompareButton();
  });

  function updateCompareButton() {
    if (compareBtn) {
      if (isComparingImages) {
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
    masterCanvas = null;
    originalImageDataURL = null;
    originalWidth = 0;
    originalHeight = 0;
    originalFileSize = 0;
    currentWidth = 0;
    currentHeight = 0;
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
    isComparingImages = false;
    comparisonContainer.style.display = 'none';
    imageWrapper.style.display = 'none';

    // Clear PDF state
    pdfGallery.style.display = 'none';
    pdfInfoSection.style.display = 'none';
    pdfBulkSection.style.display = 'none';
    savePdfBtn.style.display = 'none';
    backToGalleryBtn.style.display = 'none';
    // Clean up PDF images with memory utility
    cleanupPdfImages(pdfImages);
    currentPdfFile = null;
    pdfDocument = null;
    currentEditingImageIndex = -1;

    // Clean up history with memory manager
    historyManager.clear();

    // Dispose of canvas
    if (masterCanvas) {
      disposeCanvas(masterCanvas);
      masterCanvas = null;
    }

    // Dispose of cropper
    if (cropper) {
      disposeCropper(cropper);
      cropper = null;
    }

    resetUIState();
  }

  function resetUIState() {
    const hasImage = !!masterCanvas;
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
    if (!masterCanvas) {
      notificationService.warning('No image to save.');
      return;
    }
    const format = getCurrentFormat();
    const quality = getCurrentQuality();

    const finalDataUrl = masterCanvas.toDataURL(format, quality);
    const a = document.createElement('a');
    a.href = finalDataUrl;
    a.download = currentImageFilename || 'image.png';
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
    masterCanvas,
    cropper,
    historyManager,
    pdfImages,
    originalImageDataURL,
  });
});
