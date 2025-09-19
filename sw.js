// Service Worker for College Event Hub
// Handles push notifications, caching, and background sync

const CACHE_NAME = 'college-event-hub-v1.0.1';
const STATIC_CACHE = 'static-v1.0';
const DYNAMIC_CACHE = 'dynamic-v1.0';

// Static files to cache
const STATIC_FILES = [
    '/',
    '/index.html',
    '/login.html',
    '/club-dashboard.html',
    '/event-tracker.html',
    '/gallery.html',
    '/registration.html',
    '/collaboration.html',
    '/style.css',
    '/homepage.css',
    '/auth-utils.js',
    '/api-integration.js',
    '/enhanced_script.js',
    '/cloud-storage.js',
    '/navigation.html',
    '/manifest.json',
    // Fonts and icons
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
    /\/events/,
    /\/dashboard/,
    /\/profile/,
    /\/notifications/,
    /\/attachments/
];

// Install Service Worker
self.addEventListener('install', event => {
    console.log('🛠️ Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => {
            console.log('📦 Caching static files...');
            return cache.addAll(STATIC_FILES);
        }).catch(error => {
            console.error('❌ Cache installation failed:', error);
        })
    );
    // Force activation
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
    console.log('⚡ Service Worker activating...');
    event.waitUntil(
        // Clean old caches
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// Fetch Event - Handle Offline and API Caching
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Handle API requests
    if (url.origin === location.origin && isApiRequest(url.pathname)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Handle static resources
    if (isStaticResource(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Default to network first for dynamic content
    event.respondWith(staleWhileRevalidate(request));
});

// Cache-first strategy for static resources
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.warn('❌ Cache-first failed:', error);
        return caches.match('/offline.html') || new Response('Offline page not available');
    }
}

// Network-first strategy for API calls
async function networkFirst(request) {
    try {
        const response = await fetch(request);

        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        console.warn('❌ Network failed, trying cache:', error);
        const cachedResponse = await caches.match(request);
        return cachedResponse || new Response(JSON.stringify({ error: 'Offline', message: 'Content not available offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Stale-while-revalidate strategy for app shell
async function staleWhileRevalidate(request) {
    const cacheResponse = await caches.match(request);
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
            return caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, response.clone());
                return response;
            });
        }
        return response;
    });

    return cacheResponse || fetchPromise;
}

// Helper functions
function isApiRequest(pathname) {
    return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

function isStaticResource(pathname) {
    const staticExtensions = ['.css', '.js', '.html', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff2', '.woff', '.ttf'];
    return staticExtensions.some(ext => pathname.includes(ext)) ||
           STATIC_FILES.includes(pathname) ||
           /^\/[a-z-]+(\.[a-z0-9]+)?$/.test(pathname);
}

// PUSH NOTIFICATIONS - BROWSER API
self.addEventListener('push', event => {
    console.log('📨 Push received:', event);

    if (!event.data) {
        console.error('❌ No data in push message');
        return;
    }

    try {
        const data = event.data.json();

        const options = {
            body: data.body || 'You have a new notification',
            icon: data.icon || '/icon-192x192.png',
            badge: '/icon-72x72.png',
            image: data.image,
            data: {
                url: data.url || '/',
                action: data.action
            },
            actions: data.actions || [],
            requireInteraction: data.urgent || false,
            silent: false,
            tag: data.tag || 'default',
            renotify: true
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'College Event Hub', options)
                .then(() => {
                    console.log('✅ Notification shown successfully');
                })
                .catch(error => {
                    console.error('❌ Failed to show notification:', error);
                })
        );
    } catch (error) {
        console.error('❌ Error parsing push data:', error);
        // Show generic notification
        event.waitUntil(
            self.registration.showNotification('College Event Hub', {
                body: 'You have a new notification!',
                icon: '/icon-192x192.png',
                badge: '/icon-72x72.png'
            })
        );
    }
});

// Notification Click Handler
self.addEventListener('notificationclick', event => {
    console.log('🖱️ Notification clicked:', event);

    event.notification.close();

    const notificationData = event.notification.data || {};
    let targetUrl = notificationData.url || '/';

    if (event.action) {
        // Handle custom actions
        switch (event.action) {
            case 'view_event':
                targetUrl = `/event/${notificationData.eventId}`;
                break;
            case 'attend':
                // Handle attend action
                console.log('👆 User wants to attend event:', notificationData.eventId);
                break;
            case 'dismiss':
                return;
        }
    }

    event.waitUntil(
        clients.matchAll().then(windowClients => {
            // Check if there's already a window/tab open with the target URL
            for (let client of windowClients) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window/tab with the target URL
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Background Sync for Offline Actions
self.addEventListener('sync', event => {
    console.log('🔄 Background sync:', event.tag);

    if (event.tag === 'notification-sync') {
        event.waitUntil(handleNotificationSync());
    } else if (event.tag === 'upload-queue') {
        event.waitUntil(handleUploadQueue());
    }
});

// Handle Notification Sync
async function handleNotificationSync() {
    try {
        const response = await fetch('/api/notifications/sync');
        const notifications = await response.json();

        // Schedule notifications for future events
        const now = Date.now();
        notifications.forEach(notification => {
            const notificationTime = new Date(notification.scheduledAt).getTime();
            if (notificationTime > now) {
                scheduleNotification(notification, notificationTime - now);
            }
        });

        console.log('✅ Notifications synced successfully');
    } catch (error) {
        console.error('❌ Notification sync failed:', error);
    }
}

// Handle Upload Queue (for offline file uploads)
async function handleUploadQueue() {
    const queue = await getStoredRequests();

    if (queue.length === 0) return;

    console.log(`🔄 Processing ${queue.length} queued uploads...`);

    for (const request of queue) {
        try {
            const response = await fetch(request.url, {
                method: request.method,
                headers: request.headers,
                body: request.body
            });

            if (response.ok) {
                // Remove from queue
                await removeStoredRequest(request.id);
                console.log(`✅ Queued request ${request.id} completed`);
            } else {
                console.error(`❌ Queued request ${request.id} failed:`, response.status);
            }
        } catch (error) {
            console.error(`❌ Queued request ${request.id} error:`, error);
        }
    }
}

// PERIODIC SYNC - UPDATE CACHE REGULARLY
self.addEventListener('periodicsync', event => {
    console.log('🔄 Periodic sync:', event.tag);

    if (event.tag === 'content-update') {
        event.waitUntil(updateContent());
    } else if (event.tag === 'notification-check') {
        event.waitUntil(checkForNewNotifications());
    }
});

async function updateContent() {
    try {
        // Update events data
        const eventsResponse = await fetch('/api/events?limit=20');
        if (eventsResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put('/events', eventsResponse);
        }

        // Update dashboard data
        const dashboardResponse = await fetch('/api/dashboard');
        if (dashboardResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put('/dashboard', dashboardResponse);
        }

        console.log('✅ Content updated');
    } catch (error) {
        console.error('❌ Content update failed:', error);
    }
}

async function checkForNewNotifications() {
    try {
        const response = await fetch('/api/notifications?since=lastSync');
        if (response.ok) {
            const notifications = await response.json();

            if (notifications.length > 0) {
                self.registration.showNotification(
                    'New Updates Available',
                    {
                        body: `You have ${notifications.length} new notifications`,
                        icon: '/icon-192x192.png',
                        tag: 'new-notifications'
                    }
                );
            }
        }
    } catch (error) {
        console.error('❌ Notification check failed:', error);
    }
}

// MESSAGE HANDLING - COMMUNICATION WITH PAGES
self.addEventListener('message', event => {
    console.log('📨 Message from page:', event.data);

    const { type, data } = event.data;

    switch (type) {
        case 'NOTIFICATION_PERMISSION_REQUEST':
            event.waitUntil(requestNotificationPermission(event.source));
            break;

        case 'LOGOUT':
            clearUserCaches();
            break;

        case 'CLEAR_CACHE':
            clearAllCaches();
            break;

        case 'QUEUED_REQUEST':
            storeRequestForLater(data.request, data.id);
            break;
    }
});

// Request notification permission (note: showNotification doesn't return permission)
function requestNotificationPermission(client) {
    try {
        self.registration.showNotification('Enable Notifications', {
            body: 'Get notified about upcoming events and updates!',
            icon: '/icon-192x192.png',
            actions: [{
                action: 'enable',
                title: 'Enable'
            }, {
                action: 'dismiss',
                title: 'Not Now'
            }]
        });

        // Send success message back to page
        client.postMessage({
            type: 'NOTIFICATION_PERMISSION_GRANTED'
        });

    } catch (error) {
        console.error('❌ Permission request failed:', error);
    }
}

// Clear user-specific cache on logout
async function clearUserCaches() {
    const cacheNames = await caches.keys();

    await Promise.all(
        cacheNames.map(cacheName => {
            if (cacheName.includes('user') || cacheName.includes('profile')) {
                return caches.delete(cacheName);
            }
        })
    );

    console.log('✅ User caches cleared');
}

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();

    await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );

    console.log('✅ All caches cleared');
}

// Store request for offline processing
async function storeRequestForLater(request, id) {
    const store = await getStorageStore();
    const requests = await getStoredRequests();
    requests.push({ ...request, id });

    store.setItem('queuedRequests', JSON.stringify(requests));
}

// Get stored requests
async function getStoredRequests() {
    const store = await getStorageStore();
    return JSON.parse(store.getItem('queuedRequests') || '[]');
}

// Remove stored request
async function removeStoredRequest(id) {
    const store = await getStorageStore();
    const requests = await getStoredRequests();
    const filtered = requests.filter(req => req.id !== id);
    store.setItem('queuedRequests', JSON.stringify(filtered));
}

// Simple storage abstraction
async function getStorageStore() {
    // For service workers, we could implement IndexedDB or use a simple object
    // For now, return a mock store
    return {
        data: {},
        getItem(key) {
            return this.data[key] || null;
        },
        setItem(key, value) {
            this.data[key] = value;
        },
        removeItem(key) {
            delete this.data[key];
        }
    };
}

// Initialize notification manager
console.log('🚀 Service Worker loaded and ready');
console.log('📱 Notification services initialized');
console.log('🗃️ Cache management active');
console.log('🔄 Background sync enabled');

// Export for debugging
self.swAPI = {
    clearCaches: clearAllCaches,
    clearUser: clearUserCaches,
    getCaches: () => caches.keys(),
    forcePush: (title, body) => {
        self.registration.showNotification(title, {
            body: body,
            icon: '/icon-192x192.png'
        });
    }
};
