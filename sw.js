// Service Worker for offline functionality
const CACHE_NAME = 'rating-form-cache-v3';
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
  '/manifest.json',
  '/offline.html'  // Página de fallback para quando estiver offline
];

// Página HTML simples para mostrar quando estiver offline
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulário de Avaliação - Offline</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            color: #333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #3498db;
        }
        .btn {
            background-color: #3498db;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Formulário de Avaliação</h1>
        <p>Você está offline, mas o aplicativo ainda está disponível.</p>
        <p>Você pode continuar usando o formulário normalmente. As avaliações serão salvas localmente e sincronizadas quando você estiver online novamente.</p>
        <button class="btn" onclick="window.location.reload()">Tentar novamente</button>
    </div>
</body>
</html>
`;

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

// Função para criar uma resposta com o HTML offline
const createOfflineResponse = () => {
  return new Response(OFFLINE_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    }
  });
};

// Função para criar a página offline.html no cache
const cacheOfflinePage = async () => {
  const cache = await caches.open(CACHE_NAME);
  await cache.put('/offline.html', createOfflineResponse());
  console.log('[Service Worker] Offline page cached');
};

// Chama a função para criar a página offline no cache
cacheOfflinePage();

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  // Estratégia: Cache First, falling back to network, then to offline page
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
            
            // Check if the request is for a page (HTML)
            const url = new URL(event.request.url);
            const isHTMLPage = event.request.mode === 'navigate' || 
                              (event.request.method === 'GET' && 
                               event.request.headers.get('accept').includes('text/html'));
            
            if (isHTMLPage) {
              // Return the offline page for HTML requests
              return caches.match('/offline.html')
                .then(offlineResponse => {
                  return offlineResponse || createOfflineResponse();
                });
            }
            
            // For non-HTML resources, try to find any cached version
            return caches.match('/static/images/icon-192.png')
              .then(fallbackResponse => {
                // Return a fallback image or resource if appropriate
                if (event.request.url.includes('/static/images/')) {
                  return fallbackResponse;
                }
                
                // Otherwise just fail
                return new Response('Recurso não disponível offline', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: new Headers({
                    'Content-Type': 'text/plain'
                  })
                });
              });
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
