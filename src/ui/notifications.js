/**
 * Notification System for Simple Image/PDF Editor
 * Replaces alert() with custom, non-blocking notifications
 */

import { UI } from '../../config.js';

/**
 * Notification types
 */
export const NotificationType = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * NotificationService - Manages toast notifications
 */
export class NotificationService {
  constructor() {
    this.container = null;
    this.notifications = new Map();
    this.nextId = 0;
  }

  /**
   * Initialize the notification container
   */
  init() {
    if (this.container) {
      return;
    }

    // Create container if it doesn't exist
    this.container = document.getElementById('notificationContainer');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'notificationContainer';
      this.container.className = 'notification-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a notification
   * @param {string} message - The message to display
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {number} duration - Duration in ms (0 = no auto-dismiss)
   * @returns {string} - Notification ID for manual dismissal
   */
  show(message, type = NotificationType.INFO, duration = UI.NOTIFICATION_DURATION_MS) {
    this.init();

    const id = `notification-${this.nextId++}`;
    const notification = this._createNotification(id, message, type);

    this.container.appendChild(notification);
    this.notifications.set(id, notification);

    // Trigger animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Auto-dismiss if duration specified
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    // Announce to screen readers
    this._announceToScreenReader(message);

    return id;
  }

  /**
   * Show success notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   * @returns {string} - Notification ID
   */
  success(message, duration = UI.NOTIFICATION_DURATION_MS) {
    return this.show(message, NotificationType.SUCCESS, duration);
  }

  /**
   * Show error notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms (longer for errors)
   * @returns {string} - Notification ID
   */
  error(message, duration = 5000) {
    console.error(message);
    return this.show(message, NotificationType.ERROR, duration);
  }

  /**
   * Show warning notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   * @returns {string} - Notification ID
   */
  warning(message, duration = UI.NOTIFICATION_DURATION_MS) {
    console.warn(message);
    return this.show(message, NotificationType.WARNING, duration);
  }

  /**
   * Show info notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   * @returns {string} - Notification ID
   */
  info(message, duration = UI.NOTIFICATION_DURATION_MS) {
    return this.show(message, NotificationType.INFO, duration);
  }

  /**
   * Dismiss a notification by ID
   * @param {string} id - Notification ID
   */
  dismiss(id) {
    const notification = this.notifications.get(id);
    if (!notification) {
      return;
    }

    // Trigger fade-out animation
    notification.classList.remove('show');

    // Remove after animation completes
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll() {
    this.notifications.forEach((_, id) => {
      this.dismiss(id);
    });
  }

  /**
   * Create notification element
   * @private
   */
  _createNotification(id, message, type) {
    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'polite');

    // Icon
    const icon = this._getIcon(type);

    // Message
    const messageEl = document.createElement('span');
    messageEl.className = 'notification-message';
    messageEl.textContent = message;

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.addEventListener('click', () => {
      this.dismiss(id);
    });

    notification.innerHTML = `<span class="notification-icon">${icon}</span>`;
    notification.appendChild(messageEl);
    notification.appendChild(closeBtn);

    return notification;
  }

  /**
   * Get icon for notification type
   * @private
   */
  _getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type] || icons.info;
  }

  /**
   * Announce message to screen readers
   * @private
   */
  _announceToScreenReader(message) {
    const srEl = document.getElementById('srAnnouncements');
    if (srEl) {
      srEl.textContent = message;
      setTimeout(() => {
        srEl.textContent = '';
      }, UI.SCREEN_READER_ANNOUNCE_DURATION_MS);
    }
  }
}

// Create and export singleton instance
export const notificationService = new NotificationService();

// Export class for testing
export default NotificationService;
