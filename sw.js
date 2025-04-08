// Service Worker for offline functionality
const CACHE_NAME = 'rating-form-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/sync',
  '/config',
  '/static/css/styles.css',
  '/static/js/app.js',
  '/static/js/db.js',
  '/static/js/sync.js',
  '/static/images/icon-192.png',
  '/static/images/icon-512.png',
  '/static/images/header.png',
  '/manifest.json'
];

// Maximum number of sync attempts per item
const MAX_SYNC_ATTEMPTS = 5;

// Backoff time in milliseconds (starts at 30 seconds)
const INITIAL_BACKOFF = 30000;

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  
  return self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache if response is not valid
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response to cache it and return it
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          })
          .catch(error => {
            console.error('[Service Worker] Fetch failed:', error);
            // Could return a custom offline page here
          });
      })
  );
});

// Background sync event
self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync event:', event.tag);
  
  if (event.tag === 'sync-ratings') {
    event.waitUntil(
      // Notify all clients that sync was initiated
      self.clients.matchAll()
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SYNC_INITIATED'
            });
          });
        })
    );
  }
});
