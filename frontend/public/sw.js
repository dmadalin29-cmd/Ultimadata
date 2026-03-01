// X67 Digital Media Groupe - Service Worker
// IMPORTANT: Change version number to force update on all devices
const CACHE_VERSION = 'v5';
const CACHE_NAME = `x67-cache-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use (only essential static files)
const STATIC_ASSETS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache static assets and skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Force activation immediately
  self.skipWaiting();
});

// Activate event - clean ALL old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new version:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients to refresh
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Fetch event - NETWORK FIRST for HTML/JS, cache for images
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API requests (always go to network)
  if (event.request.url.includes('/api/')) return;
  
  // Skip WebSocket
  if (event.request.url.includes('/ws/')) return;

  const url = new URL(event.request.url);
  
  // For HTML and JS files - NETWORK FIRST (always get fresh content)
  if (event.request.mode === 'navigate' || 
      url.pathname.endsWith('.html') || 
      url.pathname.endsWith('.js') ||
      url.pathname.includes('/static/js/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache the fresh response
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page for navigation
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
        })
    );
    return;
  }

  // For images and other static assets - CACHE FIRST
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Return cached version but also fetch new version in background
        fetch(event.request).then((freshResponse) => {
          if (freshResponse && freshResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, freshResponse);
            });
          }
        }).catch(() => {});
        return response;
      }
      
      // Not in cache, fetch from network
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match(OFFLINE_URL);
      }
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let data = {
    title: 'X67 Digital Media',
    body: 'Ai o notificare nouă!',
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    tag: 'x67-notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/favicon-32x32.png',
    tag: data.tag || 'x67-notification',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  console.log('[SW] Syncing messages...');
}

// Message from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
