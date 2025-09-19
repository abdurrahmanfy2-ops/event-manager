// Notification Manager for College Event Hub
// Handles browser push notifications, in-app notifications, and notification center

class NotificationManager {
    constructor() {
        this.apiBase = 'http://localhost:8001';
        this.permissionGranted = false;
        this.worker = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.preferences = {
            browser: true,
            events: true,
            social: true,
            system: true,
            urgent: true
        };
        this.initialize();
    }

    /**
     * Initialize notification system
     */
    initialize() {
        this.checkPermission();
        this.registerServiceWorker();
        this.loadPreferences();
        this.listenForAuthChanges();

        console.log('🔔 Notification system initializing...');
    }

    /**
     * Register service worker for push notifications
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                this.worker = await navigator.serviceWorker.register('sw.js', {
                    scope: './'
                });
                console.log('✅ Service worker registered');

                // Listen for messages from service worker
                navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));

                // Setup push subscription
                this.setupPushSubscription();

            } catch (error) {
                console.warn('❌ Service worker registration failed:', error);
            }
        } else {
            console.warn('❌ Service workers not supported');
        }
    }

    /**
     * Check notification permission status
     */
    async checkPermission() {
        if ('Notification' in window) {
            this.permissionGranted = Notification.permission === 'granted';
            console.log(`🔔 Notification permission: ${Notification.permission}`);
            return this.permissionGranted;
        }
        console.warn('❌ Browser notifications not supported');
        return false;
    }

    /**
     * Request notification permission from user
     */
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();

            this.permissionGranted = permission === 'granted';

            if (this.permissionGranted) {
                console.log('✅ Notification permission granted');
                this.showNativeNotification('Notifications Enabled!', {
                    body: 'You will now receive updates about events and activities.',
                    icon: 'icon-192x192.png',
                    badge: 'icon-72x72.png',
                    tag: 'permission-granted'
                });

                // Update service worker if registered
                if (this.worker) {
                    this.worker.active.postMessage({
                        type: 'NOTIFICATION_PERMISSION_REQUEST'
                    });
                }

                return true;
            } else {
                console.log('❌ Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('❌ Permission request failed:', error);
            return false;
        }
    }

    /**
     * Setup push notification subscription
     */
    async setupPushSubscription() {
        if (!this.worker || !this.permissionGranted) return;

        try {
            const subscription = await this.worker.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array('YOUR_PUBLIC_VAPID_KEY')
            });

            console.log('✅ Push subscription created:', subscription.endpoint);
            return subscription;
        } catch (error) {
            console.error('❌ Push subscription failed:', error);
        }
    }

    /**
     * Show native browser notification
     */
    async showNativeNotification(title, options = {}) {
        if (!this.permissionGranted || !('Notification' in window)) {
            console.warn('❌ Cannot show notification - permission denied or not supported');
            return;
        }

        try {
            const notification = new Notification(title, {
                icon: '/icon-192x192.png',
                badge: '/icon-72x72.png',
                ...options
            });

            // Auto-close after timeout
            if (!options.requireInteraction) {
                setTimeout(() => notification.close(), 5000);
            }

            return notification;
        } catch (error) {
            console.error('❌ Failed to show notification:', error);
        }
    }

    /**
     * Send push notification through service worker
     */
    async sendPushNotification(title, message, options = {}) {
        if (!this.worker) {
            console.warn('❌ Service worker not available');
            return;
        }

        const data = {
            title,
            body: message,
            ...options,
            timestamp: Date.now()
        };

        try {
            await self.registration.showNotification(title, message);
            console.log('📱 Push notification sent');
        } catch (error) {
            console.error('❌ Push notification failed:', error);
            // Fallback to in-app notification
            this.showInAppNotification(title, message, options);
        }
    }

    /**
     * Show in-app notification (custom UI)
     */
    showInAppNotification(title, message, options = {}) {
        const container = this.getNotificationContainer();

        const notification = document.createElement('div');
        notification.className = 'in-app-notification';
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${options.icon || 'fas fa-bell'}"></i>
            </div>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
                <div class="notification-actions">
                    ${options.actions ? options.actions.map(action => `
                        <button class="action-btn" onclick="handleNotificationAction('${action.action}', '${options.id || 'general'}')">
                            ${action.title}
                        </button>
                    `).join('') : ''}
                    <button class="dismiss-btn" onclick="this.closest('.in-app-notification').remove()">×</button>
                </div>
            </div>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds if not urgent
        if (!options.persistent) {
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 5000);
        }

        // Save to local notifications
        this.addToNotifications({
            id: options.id || Date.now().toString(),
            title,
            message,
            timestamp: Date.now(),
            type: options.type || 'system',
            read: false,
            persistent: options.persistent || false
        });
    }

    /**
     * Get or create notification container
     */
    getNotificationContainer() {
        let container = document.querySelector('.notifications-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notifications-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                max-width: 400px;
                pointer-events: none;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * Add notification to local storage
     */
    addToNotifications(notification) {
        this.notifications.unshift(notification);
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100); // Keep only latest 100
        }

        this.saveToLocalStorage();
        this.updateUnreadCount();
        this.updateNotificationBadge();
    }

    /**
     * Mark notification as read
     */
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.saveToLocalStorage();
            this.updateUnreadCount();
            this.updateNotificationBadge();
        }
    }

    /**
     * Mark all notifications as read
     */
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.saveToLocalStorage();
        this.updateUnreadCount();
        this.updateNotificationBadge();
    }

    /**
     * Remove notification
     */
    removeNotification(notificationId) {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.saveToLocalStorage();
        this.updateUnreadCount();
        this.updateNotificationBadge();
    }

    /**
     * Update unread count
     */
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        console.log(`📬 Unread notifications: ${this.unreadCount}`);
    }

    /**
     * Update notification badge in UI
     */
    updateNotificationBadge() {
        const badges = document.querySelectorAll('.notification-badge');

        badges.forEach(badge => {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    /**
     * Save notifications to localStorage
     */
    saveToLocalStorage() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (error) {
            console.error('❌ Failed to save notifications:', error);
        }
    }

    /**
     * Load notifications from localStorage
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                this.updateUnreadCount();
                this.updateNotificationBadge();
            }
        } catch (error) {
            console.error('❌ Failed to load notifications:', error);
            this.notifications = [];
        }
    }

    /**
     * Load notification preferences
     */
    loadPreferences() {
        try {
            const saved = localStorage.getItem('notification_preferences');
            if (saved) {
                this.preferences = { ...this.preferences, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('❌ Failed to load preferences:', error);
        }

        this.loadFromLocalStorage();
    }

    /**
     * Save notification preferences
     */
    savePreferences() {
        try {
            localStorage.setItem('notification_preferences', JSON.stringify(this.preferences));
        } catch (error) {
            console.error('❌ Failed to save preferences:', error);
        }
    }

    /**
     * Update preference
     */
    updatePreference(key, value) {
        this.preferences[key] = value;
        this.savePreferences();
    }

    /**
     * Handle service worker messages
     */
    handleServiceWorkerMessage(event) {
        const { type, data } = event.data;

        switch (type) {
            case 'NOTIFICATION_PERMISSION_GRANTED':
                console.log('📱 Service worker confirmed notification permissions');
                break;
            case 'NOTIFICATION_SHOWN':
                console.log('📱 Service worker showed notification');
                break;
            default:
                console.log('📱 Unknown service worker message:', type, data);
        }
    }

    /**
     * Listen for authentication changes
     */
    listenForAuthChanges() {
        document.addEventListener('authStateChanged', (event) => {
            if (event.detail.authenticated) {
                console.log('👤 User logged in - loading user notifications');
                this.syncWithServer();
            } else {
                console.log('👤 User logged out - clearing notifications');
                // Optional: Clear notifications on logout
            }
        });

        // Listen for logout
        document.addEventListener('logout', () => {
            // Clear user-specific notifications
            this.notifications = this.notifications.filter(n => n.type !== 'personal');
            this.saveToLocalStorage();
        });
    }

    /**
     * Sync notifications with server
     */
    async syncWithServer() {
        if (!window.AuthManager?.isAuthenticated()) return;

        try {
            const response = await fetch(`${this.apiBase}/sync/notifications`, {
                headers: window.AuthManager.getAuthHeaders()
            });

            if (response.ok) {
                const serverNotifications = await response.json();

                // Merge server notifications
                serverNotifications.forEach(serverNotif => {
                    const existing = this.notifications.find(n => n.serverId === serverNotif.id);
                    if (!existing) {
                        this.addToNotifications({
                            id: `server_${serverNotif.id}`,
                            serverId: serverNotif.id,
                            title: serverNotif.title,
                            message: serverNotif.message,
                            timestamp: new Date(serverNotif.createdAt).getTime(),
                            type: serverNotif.type || 'system',
                            read: serverNotif.read || false,
                            persistent: serverNotif.urgent || false
                        });
                    }
                });

                console.log('🔄 Notifications synced with server');
            }
        } catch (error) {
            console.error('❌ Notification sync failed:', error);
        }
    }

    /**
     * Utility function for VAPID key conversion
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Notify about event reminders
     */
    notifyEventReminder(event, minutesUntil = 30) {
        if (!this.preferences.events) return;

        const title = `⏰ Event Reminder: ${event.title}`;
        const body = `${minutesUntil} minutes remaining • ${event.location} • ${event.time}`;

        this.showNativeNotification(title, {
            body,
            icon: 'icon-192x192.png',
            badge: 'icon-72x72.png',
            data: {
                eventId: event.id,
                type: 'event-reminder'
            },
            actions: [
                {
                    action: 'view_event',
                    title: 'View Event'
                },
                {
                    action: 'attend',
                    title: 'Attend Now'
                }
            ],
            requireInteraction: false
        });

        // Also show in-app notification
        this.showInAppNotification(title, body, {
            type: 'event',
            id: `event_reminder_${event.id}_${Date.now()}`,
            icon: 'fas fa-calendar-alt',
            actions: [
                { action: 'view', title: 'View' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        });
    }

    /**
     * Notify about new friend/follower
     */
    notifySocialActivity(message, user = null) {
        if (!this.preferences.social) return;

        const title = `👤 Social Activity`;
        const body = message;

        this.showNativeNotification(title, {
            body,
            icon: 'icon-192x192.png',
            badge: 'icon-72x72.png',
            data: { type: 'social' }
        });
    }

    /**
     * Notify about system updates
     */
    notifySystemUpdate(message, urgent = false) {
        if (!this.preferences.system) return;

        const title = urgent ? '🚨 System Alert' : '🔔 System Update';
        const body = message;

        if (urgent) {
            this.showNativeNotification(title, {
                body,
                icon: 'icon-192x192.png',
                badge: 'icon-72x72.png',
                data: { type: 'urgent' },
                actions: [
                    { action: 'read_more', title: 'Read More' }
                ],
                requireInteraction: true
            });
        } else {
            this.showNativeNotification(title, {
                body,
                icon: 'icon-192x192.png',
                badge: 'icon-72x72.png',
                data: { type: 'system' }
            });
        }

        this.showInAppNotification(title, body, {
            type: 'system',
            persistent: urgent,
            icon: urgent ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle'
        });
    }

    /**
     * Get notifications for UI
     */
    getNotifications() {
        return this.notifications;
    }

    /**
     * Get unread count
     */
    getUnreadCount() {
        return this.unreadCount;
    }
}

// Global notification manager instance
const notificationManager = new NotificationManager();

// Export for global use
window.NotificationManager = notificationManager;

// Helper functions
window.requestNotificationPermission = () => notificationManager.requestPermission();
window.sendPushNotification = (title, message, options) => notificationManager.sendPushNotification(title, message, options);
window.showInAppNotification = (title, message, options) => notificationManager.showInAppNotification(title, message, options);

// Debug functions
window.testNotification = {
    request: () => notificationManager.requestPermission(),
    event: () => notificationManager.notifyEventReminder({ title: 'Test Event', location: 'Test Hall', time: '2:00 PM' }),
    social: () => notificationManager.notifySocialActivity('Test social notification'),
    system: () => notificationManager.notifySystemUpdate('Test system update'),
    urgent: () => notificationManager.notifySystemUpdate('Test urgent system alert', true),
    native: () => notificationManager.showNativeNotification('Test Native Notification', { body: 'This is a test!' }),
    inApp: () => notificationManager.showInAppNotification('Test In-App', 'This is a test in-app notification'),
    list: () => console.log('Notifications:', notificationManager.getNotifications()),
    unread: () => console.log('Unread count:', notificationManager.getUnreadCount())
};

console.log('🔔 Notification Manager initialized');
console.log('💡 Use window.testNotification to test features');

// Example usage:
// window.testNotification.request();    // Request permission
// window.testNotification.native();     // Test native notification
// window.testNotification.event();      // Test event reminder
// window.testNotification.system();     // Test system notification

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Show demo notification after 5 seconds
    setTimeout(() => {
        notificationManager.showInAppNotification(
            'Welcome to College Event Hub!',
            '🔔 Notifications are now active. You will receive updates about events and activities.',
            {
                type: 'system',
                persistent: false,
                icon: 'fas fa-hand-wave'
            }
        );
    }, 5000);
});
