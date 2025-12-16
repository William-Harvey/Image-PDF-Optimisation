/**
 * PDF Processing Module using unpdf
 * Handles PDF image extraction and metadata
 */

import {
  extractImages,
  getDocumentProxy,
  extractText,
  getResolvedPDFJS,
} from '../../unpdf.bundle.mjs';

/**
 * Extract images from a PDF file
 * @param {File|ArrayBuffer} pdfData - PDF file or buffer
 * @param {string} mode - 'images' (embedded images only) or 'fullpages' (render full pages)
 * @returns {Promise<Array>} - Array of extracted images with metadata
 */
export async function extractPdfImages(pdfData, mode = 'images') {
  try {
    // Convert File to ArrayBuffer if needed
    let buffer;
    if (pdfData instanceof File) {
      buffer = await pdfData.arrayBuffer();
    } else {
      buffer = pdfData;
    }

    if (mode === 'images') {
      // Extract embedded images using unpdf
      return await extractEmbeddedImages(buffer);
    } else if (mode === 'fullpages') {
      // Render full pages as images
      return await renderPdfPages(buffer);
    } else {
      throw new Error(`Unknown extraction mode: ${mode}`);
    }
  } catch (error) {
    console.error('Error extracting PDF images:', error);
    throw error;
  }
}

/**
 * Extract embedded images from PDF using unpdf
 * @private
 */
async function extractEmbeddedImages(buffer) {
  try {
    // Get document proxy first
    const pdf = await getDocumentProxy(buffer);
    const allImages = [];
    let imageIndex = 0;

    // Extract images from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // CRITICAL: Render the page first to load all image objects into memory
      // Without this, page.objs won't have the image data available
      const viewport = page.getViewport({ scale: 1.0 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Now get the operator list to find images
      const ops = await page.getOperatorList();
      const { OPS } = await getResolvedPDFJS();

      // Find image operations (paintImageXObject = "Do" operator for images)
      for (let i = 0; i < ops.fnArray.length; i++) {
        if (ops.fnArray[i] === OPS.paintImageXObject) {
          const imageName = ops.argsArray[i][0];

          // Check if object exists
          if (!page.objs.has(imageName)) {
            console.warn(`Image "${imageName}" not found, skipping`);
            continue;
          }

          // Get the image object (now loaded after rendering)
          const image = page.objs.get(imageName);

          if (image && image.bitmap) {
            // Convert ImageBitmap to canvas
            const extractCanvas = document.createElement('canvas');
            extractCanvas.width = image.width;
            extractCanvas.height = image.height;
            const ctx = extractCanvas.getContext('2d', { alpha: true });
            ctx.clearRect(0, 0, extractCanvas.width, extractCanvas.height);
            ctx.drawImage(image.bitmap, 0, 0);

            // Export as PNG to preserve transparency
            const dataURL = extractCanvas.toDataURL('image/png', 1.0);

            allImages.push({
              index: imageIndex++,
              dataURL,
              originalSize: estimateDataURLSize(dataURL),
              width: image.width,
              height: image.height,
              pageNum,
              imageName: `page-${pageNum}-${imageName}`,
              isOptimized: false,
              optimizedDataURL: null,
              optimizedSize: 0,
            });
          }
        }
      }

      // Clean up
      page.cleanup();
    }

    return allImages;
  } catch (error) {
    console.error('Error in extractEmbeddedImages:', error);
    throw error;
  }
}

/**
 * Render full PDF pages as images
 * Uses PDF.js via unpdf's document proxy
 * @private
 */
async function renderPdfPages(buffer) {
  try {
    // Get PDF document proxy from unpdf
    const pdf = await getDocumentProxy(buffer);
    const numPages = pdf.numPages;

    const images = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      // Get viewport at scale 2 for higher quality
      const viewport = page.getViewport({ scale: 2 });

      // Create canvas to render page
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert canvas to data URL
      const dataURL = canvas.toDataURL('image/png', 1.0);

      images.push({
        index: pageNum - 1,
        dataURL,
        originalSize: estimateDataURLSize(dataURL),
        width: canvas.width,
        height: canvas.height,
        pageNum,
        imageName: `page-${pageNum}`,
        isOptimized: false,
        optimizedDataURL: null,
        optimizedSize: 0,
      });

      // Clean up
      page.cleanup();
    }

    return images;
  } catch (error) {
    console.error('Error rendering PDF pages:', error);
    throw error;
  }
}

/**
 * Create data URL from raw image data (Uint8Array)
 * @private
 */
function createDataURLFromImageData(data) {
  try {
    // Convert Uint8Array to base64
    const base64 = btoa(
      Array.from(new Uint8Array(data))
        .map((byte) => String.fromCharCode(byte))
        .join('')
    );
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error creating data URL from image data:', error);
    throw error;
  }
}

/**
 * Create data URL from unpdf image object
 * @private
 */
function createDataURLFromImage(img) {
  try {
    // unpdf returns image data as base64 string
    if (img.data) {
      // If data is already a string (base64)
      if (typeof img.data === 'string') {
        return `data:image/png;base64,${img.data}`;
      }

      // If data is Uint8Array or Buffer, convert to base64
      const base64 = btoa(
        Array.from(new Uint8Array(img.data))
          .map((byte) => String.fromCharCode(byte))
          .join('')
      );
      return `data:image/png;base64,${base64}`;
    }

    throw new Error('Invalid image data');
  } catch (error) {
    console.error('Error creating data URL:', error);
    throw error;
  }
}

/**
 * Estimate image size from unpdf image object
 * @private
 */
function estimateImageSize(img) {
  if (img.data) {
    if (typeof img.data === 'string') {
      // Base64 string - estimate size
      return Math.ceil((img.data.length * 3) / 4);
    }
    if (img.data.length) {
      return img.data.length;
    }
  }
  // Fallback estimate based on dimensions
  return img.width * img.height * 4; // RGBA
}

/**
 * Estimate data URL size
 * @private
 */
function estimateDataURLSize(dataURL) {
  // Remove data URL prefix and estimate
  const base64Data = dataURL.split(',')[1];
  return Math.ceil((base64Data.length * 3) / 4);
}

/**
 * Extract text from PDF (bonus feature from unpdf)
 * @param {File|ArrayBuffer} pdfData - PDF file or buffer
 * @returns {Promise<string>} - Extracted text
 */
export async function extractPdfText(pdfData) {
  try {
    let buffer;
    if (pdfData instanceof File) {
      buffer = await pdfData.arrayBuffer();
    } else {
      buffer = pdfData;
    }

    const result = await extractText(buffer);
    return result.text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

/**
 * Get PDF metadata
 * @param {File|ArrayBuffer} pdfData - PDF file or buffer
 * @returns {Promise<Object>} - PDF metadata (pages, etc.)
 */
export async function getPdfMetadata(pdfData) {
  try {
    let buffer;
    if (pdfData instanceof File) {
      buffer = await pdfData.arrayBuffer();
    } else {
      buffer = pdfData;
    }

    const pdf = await getDocumentProxy(buffer);

    return {
      numPages: pdf.numPages,
      fingerprint: pdf.fingerprint,
    };
  } catch (error) {
    console.error('Error getting PDF metadata:', error);
    throw error;
  }
}
