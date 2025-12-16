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
      const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better quality
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Store the rendered canvas to extract Form XObject regions
      const pageCanvas = canvas;

      // Now get the operator list to find images
      const ops = await page.getOperatorList();
      const { OPS } = await getResolvedPDFJS();

      // Track current transformation matrix for Form XObjects
      const transformStack = [[1, 0, 0, 1, 0, 0]]; // Identity matrix
      let currentTransform = transformStack[0];

      // Count operations for debugging
      const opCounts = {};
      for (let i = 0; i < ops.fnArray.length; i++) {
        const opName = Object.keys(OPS).find((key) => OPS[key] === ops.fnArray[i]);
        opCounts[opName] = (opCounts[opName] || 0) + 1;
      }
      console.log(`Page ${pageNum} operations:`, opCounts);

      // Find image operations (XObject images, inline images, and Form XObjects)
      for (let i = 0; i < ops.fnArray.length; i++) {
        const opCode = ops.fnArray[i];
        const args = ops.argsArray[i];

        // Track graphics state changes
        if (opCode === OPS.save) {
          transformStack.push([...currentTransform]);
        } else if (opCode === OPS.restore) {
          if (transformStack.length > 1) {
            transformStack.pop();
            currentTransform = transformStack[transformStack.length - 1];
          }
        } else if (opCode === OPS.transform) {
          // Multiply current transform with new transform
          const [a, b, c, d, e, f] = args;
          const [a0, b0, c0, d0, e0, f0] = currentTransform;
          currentTransform = [
            a * a0 + b * c0,
            a * b0 + b * d0,
            c * a0 + d * c0,
            c * b0 + d * d0,
            e * a0 + f * c0 + e0,
            e * b0 + f * d0 + f0,
          ];
          transformStack[transformStack.length - 1] = currentTransform;
        }

        // paintImageXObject = "Do" operator for XObject images
        // paintInlineImageXObject = inline images (BI/ID/EI operators)
        // paintFormXObjectBegin = Form XObjects (vector graphics)
        if (
          opCode === OPS.paintImageXObject ||
          opCode === OPS.paintInlineImageXObject ||
          opCode === OPS.paintFormXObjectBegin
        ) {
          const imageName = ops.argsArray[i][0];

          // Skip if imageName is not a valid string or has name property
          if (!imageName || (typeof imageName !== 'string' && !imageName.name)) {
            continue;
          }

          try {
            // Check if object exists (defensive check)
            if (page.objs.has && !page.objs.has(imageName)) {
              console.warn(`Image/Form "${imageName}" not found, skipping`);
              continue;
            }

            // Get the image or form object (now loaded after rendering)
            const obj = page.objs.get(imageName);

            if (obj && obj.bitmap) {
              // Raster image with bitmap
              const extractCanvas = document.createElement('canvas');
              extractCanvas.width = obj.width;
              extractCanvas.height = obj.height;
              const ctx = extractCanvas.getContext('2d', { alpha: true });
              ctx.clearRect(0, 0, extractCanvas.width, extractCanvas.height);
              ctx.drawImage(obj.bitmap, 0, 0);

              // Export as PNG to preserve transparency
              const dataURL = extractCanvas.toDataURL('image/png', 1.0);

              allImages.push({
                index: imageIndex++,
                dataURL,
                originalSize: estimateDataURLSize(dataURL),
                width: obj.width,
                height: obj.height,
                pageNum,
                imageName: `page-${pageNum}-${imageName}`,
                isOptimized: false,
                optimizedDataURL: null,
                optimizedSize: 0,
              });
            } else if (opCode === OPS.paintFormXObjectBegin) {
              // Form XObject (vector graphics) - extract from rendered page
              try {
                // Get Form XObject dimensions from the PDF
                // Form XObjects have BBox (bounding box) in their dictionary
                const formObj = page.objs.get(imageName);

                // Calculate bounding box in page coordinates using current transform
                // Default to 100x100 if we can't get dimensions
                let width = 100;
                let height = 100;

                // Try to get dimensions from the form object
                if (formObj && formObj.dict && formObj.dict.get) {
                  const bbox = formObj.dict.get('BBox');
                  if (bbox && bbox.length >= 4) {
                    width = Math.abs(bbox[2] - bbox[0]);
                    height = Math.abs(bbox[3] - bbox[1]);
                  }
                }

                // Apply current transform to get actual dimensions on page
                const [a, b, c, d, e, f] = currentTransform;
                const transformedWidth = Math.abs(a * width);
                const transformedHeight = Math.abs(d * height);
                const x = e * viewport.scale;
                const y = viewport.height - f * viewport.scale - transformedHeight;

                // Extract region from rendered page canvas
                if (transformedWidth > 1 && transformedHeight > 1) {
                  const extractCanvas = document.createElement('canvas');
                  extractCanvas.width = transformedWidth;
                  extractCanvas.height = transformedHeight;
                  const extractCtx = extractCanvas.getContext('2d', { alpha: true });

                  // Copy region from page canvas
                  extractCtx.drawImage(
                    pageCanvas,
                    x,
                    y,
                    transformedWidth,
                    transformedHeight,
                    0,
                    0,
                    transformedWidth,
                    transformedHeight
                  );

                  const dataURL = extractCanvas.toDataURL('image/png', 1.0);

                  allImages.push({
                    index: imageIndex++,
                    dataURL,
                    originalSize: estimateDataURLSize(dataURL),
                    width: transformedWidth,
                    height: transformedHeight,
                    pageNum,
                    imageName: `page-${pageNum}-form-${imageName}`,
                    isOptimized: false,
                    optimizedDataURL: null,
                    optimizedSize: 0,
                  });

                  console.log(
                    `Extracted Form XObject "${imageName}" (${transformedWidth}x${transformedHeight}) from page ${pageNum}`
                  );
                }
              } catch (formErr) {
                console.warn(`Could not extract Form XObject "${imageName}":`, formErr.message);
              }
            }
          } catch (err) {
            console.warn(`Failed to extract "${imageName}" from page ${pageNum}:`, err.message);
            // Continue to next image
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
