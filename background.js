// background.js
import { WINDOW, STORAGE } from './config.js';

// Store image data temporarily for context menu editing
let pendingImageData = null;

function openEditor(imageUrl = null) {
  const editorUrl = chrome.runtime.getURL('editor.html');
  chrome.windows
    .create({
      url: editorUrl,
      type: WINDOW.TYPE,
      width: WINDOW.WIDTH,
      height: WINDOW.HEIGHT,
    })
    .then((window) => {
      console.log('Editor window created:', window.id);
      if (imageUrl) {
        // Store the image URL to be picked up by the editor
        chrome.storage.local.set({ [STORAGE.PENDING_IMAGE_URL]: imageUrl });
      }
    })
    .catch((error) => {
      console.error('Error creating editor window:', error);
    });
}

chrome.action.onClicked.addListener((tab) => {
  console.log('Simple Image Editor action clicked.');
  openEditor();
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Simple Image Editor installed/updated.');

  // Create context menu for images
  chrome.contextMenus.create({
    id: 'edit-image',
    title: 'Edit with Simple Image Editor',
    contexts: ['image'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'edit-image' && info.srcUrl) {
    openEditor(info.srcUrl);
  }
});
