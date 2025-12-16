/**
 * Image Processing Module for Simple Image/PDF Editor
 * Handles canvas operations: rotation, flipping, resizing, cropping
 */

import { CANVAS } from '../../config.js';

/**
 * Create a canvas from an image data URL
 * @param {string} dataURL - The image data URL
 * @returns {Promise<HTMLCanvasElement>} - Canvas with the image
 */
export async function createCanvasFromDataURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image into canvas'));
    };
    img.src = dataURL;
  });
}

/**
 * Rotate a canvas by 90 degrees
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} degrees - Rotation angle (90, 180, 270)
 * @returns {HTMLCanvasElement} - New rotated canvas
 */
export function rotateCanvas(canvas, degrees) {
  const newCanvas = document.createElement('canvas');
  const ctx = newCanvas.getContext('2d');

  // For 90 and 270, swap width and height
  if (degrees === CANVAS.ROTATION_90 || degrees === CANVAS.ROTATION_270) {
    newCanvas.width = canvas.height;
    newCanvas.height = canvas.width;
  } else {
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
  }

  // Set transformation matrix
  ctx.save();

  switch (degrees) {
    case CANVAS.ROTATION_90:
      ctx.translate(newCanvas.width, 0);
      ctx.rotate((Math.PI / 180) * CANVAS.ROTATION_90);
      break;
    case CANVAS.ROTATION_180:
      ctx.translate(newCanvas.width, newCanvas.height);
      ctx.rotate((Math.PI / 180) * CANVAS.ROTATION_180);
      break;
    case CANVAS.ROTATION_270:
      ctx.translate(0, newCanvas.height);
      ctx.rotate((Math.PI / 180) * CANVAS.ROTATION_270);
      break;
  }

  ctx.drawImage(canvas, 0, 0);
  ctx.restore();

  return newCanvas;
}

/**
 * Flip a canvas horizontally or vertically
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {boolean} horizontal - Flip horizontally if true, vertically if false
 * @returns {HTMLCanvasElement} - New flipped canvas
 */
export function flipCanvas(canvas, horizontal = true) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const ctx = newCanvas.getContext('2d');

  ctx.save();
  if (horizontal) {
    ctx.scale(-1, 1);
    ctx.drawImage(canvas, -canvas.width, 0);
  } else {
    ctx.scale(1, -1);
    ctx.drawImage(canvas, 0, -canvas.height);
  }
  ctx.restore();

  return newCanvas;
}

/**
 * Resize a canvas to new dimensions
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @returns {HTMLCanvasElement} - New resized canvas
 */
export function resizeCanvas(canvas, width, height) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = width;
  newCanvas.height = height;
  const ctx = newCanvas.getContext('2d');

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(canvas, 0, 0, width, height);

  return newCanvas;
}

/**
 * Crop a canvas to specified bounds
 * @param {HTMLCanvasElement} canvas - Source canvas
 * @param {number} x - X coordinate of crop area
 * @param {number} y - Y coordinate of crop area
 * @param {number} width - Width of crop area
 * @param {number} height - Height of crop area
 * @returns {HTMLCanvasElement} - New cropped canvas
 */
export function cropCanvas(canvas, x, y, width, height) {
  const newCanvas = document.createElement('canvas');
  newCanvas.width = width;
  newCanvas.height = height;
  const ctx = newCanvas.getContext('2d');

  ctx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

  return newCanvas;
}

/**
 * Check if an image has transparency
 * @param {HTMLCanvasElement|string} source - Canvas or data URL
 * @returns {Promise<boolean>} - True if transparent
 */
export async function hasTransparency(source) {
  let canvas;

  if (typeof source === 'string') {
    canvas = await createCanvasFromDataURL(source);
  } else {
    canvas = source;
  }

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Sample pixels for performance (check every Nth pixel)
  for (let i = 3; i < data.length; i += CANVAS.TRANSPARENCY_CHECK_SAMPLE_RATE) {
    if (data[i] < CANVAS.FULL_TRANSPARENCY_VALUE) {
      return true;
    }
  }

  return false;
}

/**
 * Load an image from a data URL onto an HTMLImageElement
 * @param {HTMLImageElement} imgElement - Target image element
 * @param {string} dataURL - Image data URL
 * @returns {Promise<void>}
 */
export function loadImageElement(imgElement, dataURL) {
  return new Promise((resolve, reject) => {
    imgElement.onload = () => resolve();
    imgElement.onerror = () => reject(new Error('Failed to load image'));
    imgElement.src = dataURL;
  });
}

/**
 * Create an image bitmap from URL (with fallback)
 * @param {string} dataURL - Image data URL
 * @returns {Promise<ImageBitmap|HTMLImageElement>}
 */
export function createImageBitmapFromURL(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        if (typeof createImageBitmap === 'function') {
          const bitmap = await createImageBitmap(img);
          resolve(bitmap);
        } else {
          resolve(img);
        }
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = () => {
      reject(new Error('Image failed to load'));
    };
    img.src = dataURL;
  });
}

/**
 * Get blob size from data URL
 * @param {string} dataURL - Image data URL
 * @returns {Promise<number>} - Size in bytes
 */
export async function getBlobSizeFromDataURL(dataURL) {
  if (!dataURL || !dataURL.startsWith('data:image')) {
    return 0;
  }

  try {
    const response = await fetch(dataURL);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }
    const blob = await response.blob();
    return blob.size;
  } catch (error) {
    console.error('Error getting blob size:', error);
    return 0;
  }
}
