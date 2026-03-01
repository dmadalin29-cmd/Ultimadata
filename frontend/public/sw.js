// X67 Digital Media Groupe - Service Worker v7
// Simplified version for stability
const CACHE_VERSION = 'v7';
const CACHE_NAME = `x67-cache-${CACHE_VERSION}`;

// Install - just skip waiting
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  self.skipWaiting();
});

// Activate - clean old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);
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
    }).then(() => self.clients.claim())
  );
});

// Fetch - simple network first, no complex caching
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API and WebSocket
  if (event.request.url.includes('/api/') || event.request.url.includes('/ws/')) return;

  // Always try network first
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Only use cache as fallback when offline
        return caches.match(event.request);
      })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = {
    title: 'X67 Digital',
    body: 'Notificare nouă!',
    icon: '/icon-192.png'
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: '/favicon-32x32.png',
      vibrate: [200, 100, 200]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Message handler
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
