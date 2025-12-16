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

      // Track which objects we've already extracted to avoid duplicates
      const extractedObjects = new Set();

      // Track current transformation matrix for Form XObjects
      const transformStack = [[1, 0, 0, 1, 0, 0]]; // Identity matrix
      let currentTransform = transformStack[0];

      // Track clipping regions for shading extraction
      const clippingStack = [];
      let currentClipBounds = null;
      let shadingIndex = 0;

      // Count operations for debugging
      const opCounts = {};
      for (let i = 0; i < ops.fnArray.length; i++) {
        const opName = Object.keys(OPS).find((key) => OPS[key] === ops.fnArray[i]) || 'unknown';
        opCounts[opName] = (opCounts[opName] || 0) + 1;
      }
      console.log(`Page ${pageNum} operations:`, JSON.stringify(opCounts, null, 2));

      // Track the last dependency name (might be used for Form XObjects)
      let lastDependencyName = null;

      // Find image operations (XObject images, inline images, and Form XObjects)
      for (let i = 0; i < ops.fnArray.length; i++) {
        const opCode = ops.fnArray[i];
        const args = ops.argsArray[i];

        // Track dependency operations (these reference objects to be loaded)
        if (opCode === OPS.dependency) {
          lastDependencyName = args[0]; // Dependencies have the object name as first arg
          console.log(`Dependency operation: "${lastDependencyName}"`);
        }

        // Track graphics state changes
        if (opCode === OPS.save) {
          transformStack.push([...currentTransform]);
          clippingStack.push(currentClipBounds);
        } else if (opCode === OPS.restore) {
          if (transformStack.length > 1) {
            transformStack.pop();
            currentTransform = transformStack[transformStack.length - 1];
          }
          if (clippingStack.length > 0) {
            currentClipBounds = clippingStack.pop();
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
        } else if (opCode === OPS.constructPath) {
          // constructPath defines a path that might be used for clipping
          // args[0] contains path operations (array of operation codes)
          // args[1] contains path data (coordinates)
          // We'll compute a bounding box from the path data
          const pathOps = args[0];
          const pathData = args[1];

          console.log(
            `constructPath on page ${pageNum}: args.length=${args.length}`,
            `pathOps=${pathOps}`,
            `pathData.length=${pathData ? pathData.length : 'null'}`,
            `pathData[0]=`,
            pathData ? pathData[0] : 'null',
            `args[2]=`,
            args[2]
          );

          if (pathData && pathData.length >= 4) {
            // Simple bounding box calculation from path coordinates
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
            for (let j = 0; j < pathData.length; j += 2) {
              const x = pathData[j];
              const y = pathData[j + 1];
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }

            // Store as potential clip bounds (will be used if followed by clip operation)
            const pathBounds = { minX, minY, maxX, maxY };
            console.log(
              `constructPath on page ${pageNum}: bounds=${JSON.stringify(pathBounds)}, currentClip=${JSON.stringify(currentClipBounds)}`
            );
            currentClipBounds = pathBounds;
          }
        } else if (opCode === OPS.clip) {
          // Clip operation uses the previously constructed path
          // currentClipBounds should already be set by constructPath
          console.log(
            `CLIP operation on page ${pageNum}, currentClipBounds=${JSON.stringify(currentClipBounds)}`
          );
        } else if (opCode === OPS.shadingFill) {
          console.log(
            `SHADINGFILL on page ${pageNum}, currentClipBounds=${JSON.stringify(currentClipBounds)}`
          );
          // Extract the shading region from the rendered page
          if (currentClipBounds) {
            try {
              // Transform clip bounds to page coordinates
              const [a, b, c, d, e, f] = currentTransform;
              const x1 = currentClipBounds.minX * a + currentClipBounds.minY * c + e;
              const y1 = currentClipBounds.minX * b + currentClipBounds.minY * d + f;
              const x2 = currentClipBounds.maxX * a + currentClipBounds.maxY * c + e;
              const y2 = currentClipBounds.maxX * b + currentClipBounds.maxY * d + f;

              // Convert to canvas coordinates (PDF uses bottom-left origin, canvas uses top-left)
              const canvasX = Math.min(x1, x2) * viewport.scale;
              const canvasY = viewport.height - Math.max(y1, y2) * viewport.scale;
              const width = Math.abs(x2 - x1) * viewport.scale;
              const height = Math.abs(y2 - y1) * viewport.scale;

              console.log(
                `Extracting shading ${shadingIndex} on page ${pageNum}: (${Math.round(canvasX)}, ${Math.round(canvasY)}, ${Math.round(width)}x${Math.round(height)})`
              );

              if (width > 1 && height > 1) {
                // Extract the shading region from the rendered page canvas
                const shadingCanvas = document.createElement('canvas');
                shadingCanvas.width = width;
                shadingCanvas.height = height;
                const shadingCtx = shadingCanvas.getContext('2d', { alpha: true });

                shadingCtx.drawImage(
                  pageCanvas,
                  canvasX,
                  canvasY,
                  width,
                  height,
                  0,
                  0,
                  width,
                  height
                );

                const dataURL = shadingCanvas.toDataURL('image/png', 1.0);

                allImages.push({
                  index: imageIndex++,
                  dataURL,
                  originalSize: estimateDataURLSize(dataURL),
                  width,
                  height,
                  pageNum,
                  imageName: `page-${pageNum}-shading-${shadingIndex}`,
                  isOptimized: false,
                  optimizedDataURL: null,
                  optimizedSize: 0,
                });

                console.log(
                  `✓ Extracted shading ${shadingIndex} on page ${pageNum} (${Math.round(width)}x${Math.round(height)})`
                );
                shadingIndex++;
              }
            } catch (err) {
              console.warn(`Failed to extract shading on page ${pageNum}:`, err.message);
            }
          } else {
            console.log(
              `Shading on page ${pageNum} has no clip bounds, skipping`
            );
          }
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
          const args = ops.argsArray[i];

          // Log what type of operation this is BEFORE validation
          const opType =
            opCode === OPS.paintImageXObject
              ? 'XObject'
              : opCode === OPS.paintInlineImageXObject
                ? 'Inline'
                : 'FormXObject';
          console.log(
            `Processing ${opType} operation, args length: ${args.length}`,
            `args[0]:`,
            args[0],
            `args[1]:`,
            args[1]
          );

          // For Form XObjects, the structure is different:
          // args[0] = transformation matrix (Float32Array)
          // args[1] = Form XObject name (string) OR null
          // For regular images:
          // args[0] = image name (string)
          let actualImageName;
          if (opCode === OPS.paintFormXObjectBegin) {
            // Try args[1] first, fall back to last dependency if null
            actualImageName = args[1] || lastDependencyName;
            console.log(
              `  Form XObject name: args[1]="${args[1]}", lastDependency="${lastDependencyName}", using="${actualImageName}"`
            );
          } else {
            actualImageName = imageName; // Regular image name from args[0]
          }

          // Skip if imageName is not a valid string or has name property
          if (
            !actualImageName ||
            (typeof actualImageName !== 'string' && !actualImageName.name)
          ) {
            console.warn(`⚠ Skipping ${opType} - invalid imageName:`, actualImageName);
            continue;
          }

          // Use actualImageName from here on
          const finalImageName = actualImageName;

          console.log(
            `✓ Found ${opType} "${finalImageName}" on page ${pageNum}, opCode=${opCode}`
          );

          // Skip if we've already extracted this object
          if (extractedObjects.has(finalImageName)) {
            console.log(
              `  Skipping "${finalImageName}" - already extracted (likely FormXObject wrapping an image)`
            );
            continue;
          }

          try {
            // Check if object exists (defensive check)
            if (page.objs.has && !page.objs.has(finalImageName)) {
              console.warn(`Image/Form "${finalImageName}" not found, skipping`);
              continue;
            }

            // Get the image or form object (now loaded after rendering)
            const obj = page.objs.get(finalImageName);
            console.log(
              `  Object "${finalImageName}": exists=${!!obj}, hasBitmap=${!!(obj && obj.bitmap)}, hasDict=${!!(obj && obj.dict)}`
            );

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
                imageName: `page-${pageNum}-${finalImageName}`,
                isOptimized: false,
                optimizedDataURL: null,
                optimizedSize: 0,
              });

              // Mark this object as extracted
              extractedObjects.add(finalImageName);
            } else if (opCode === OPS.paintFormXObjectBegin) {
              // Form XObject (vector graphics) - extract from rendered page
              try {
                // Get Form XObject dimensions from the PDF
                // Form XObjects have BBox (bounding box) in their dictionary
                const formObj = page.objs.get(finalImageName);

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
                    imageName: `page-${pageNum}-form-${finalImageName}`,
                    isOptimized: false,
                    optimizedDataURL: null,
                    optimizedSize: 0,
                  });

                  console.log(
                    `Extracted Form XObject "${finalImageName}" (${transformedWidth}x${transformedHeight}) from page ${pageNum}`
                  );

                  // Mark this object as extracted
                  extractedObjects.add(finalImageName);
                }
              } catch (formErr) {
                console.warn(`Could not extract Form XObject "${finalImageName}":`, formErr.message);
              }
            }
          } catch (err) {
            console.warn(`Failed to extract "${finalImageName}" from page ${pageNum}:`, err.message);
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
