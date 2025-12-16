/**
 * PDF Processing Module using unpdf
 * Handles PDF image extraction and metadata
 */

import { extractImages, getDocumentProxy, extractText } from 'unpdf';

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
  const result = await extractImages(buffer);

  // Transform unpdf format to match expected format
  const images = result.images.map((img, index) => {
    // Create data URL from image data
    const dataURL = createDataURLFromImage(img);

    return {
      index,
      dataURL,
      originalSize: estimateImageSize(img),
      width: img.width,
      height: img.height,
      pageNum: img.pageNumber || index + 1,
      imageName: `image-${index + 1}`,
      isOptimized: false,
      optimizedDataURL: null,
      optimizedSize: 0,
    };
  });

  return images;
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
