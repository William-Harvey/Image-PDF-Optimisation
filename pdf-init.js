// PDF.js initialization script
// This must load as a module to import pdf.mjs

import * as pdfjsLib from './pdf.mjs';

// Make PDF.js globally available
window.pdfjsLib = pdfjsLib;

// Configure worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.mjs';

// Signal that PDF.js is ready
window.pdfJsReady = true;
window.dispatchEvent(new Event('pdfjs-loaded'));
console.log('PDF.js loaded and ready');
