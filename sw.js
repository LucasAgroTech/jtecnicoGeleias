// Service Worker for offline functionality
const CACHE_NAME = 'rating-form-cache-v6';

// Versão do app - incrementar quando houver mudanças significativas
const APP_VERSION = '1.2.0';

// Detecta se estamos em produção (Heroku) ou desenvolvimento
const isProduction = self.location.hostname.includes('herokuapp.com') || 
                    !self.location.hostname.includes('localhost');

// Lista de recursos essenciais que devem ser cacheados imediatamente
const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './static/css/styles.css',
  './static/js/app.js',
  './static/js/db.js',
  './static/js/sync.js',
  // Versões absolutas para garantir compatibilidade
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/static/css/styles.css',
  '/static/js/app.js',
  '/static/js/db.js',
  '/static/js/sync.js'
];

// Lista completa de recursos para cachear
const ASSETS_TO_CACHE = [
  ...CORE_ASSETS,
  './sync',
  './config',
  './static/images/icon-192.png',
  './static/images/icon-512.png',
  './static/images/header.png',
  // Versões absolutas para garantir compatibilidade
  '/sync',
  '/config',
  '/static/images/icon-192.png',
  '/static/images/icon-512.png',
  '/static/images/header.png'
];

// Versões alternativas dos caminhos para lidar com diferentes ambientes
const ALTERNATIVE_PATHS = {
  '/': ['index.html', './index.html', '../index.html', './', '../'],
  '/index.html': ['./index.html', '../index.html', 'index.html'],
  '/manifest.json': ['./manifest.json', '../manifest.json', '../static/manifest.json', 'manifest.json'],
  '/sw.js': ['./sw.js', '../sw.js', 'sw.js'],
  '/static/css/styles.css': ['./static/css/styles.css', '../static/css/styles.css', 'static/css/styles.css'],
  '/static/js/app.js': ['./static/js/app.js', '../static/js/app.js', 'static/js/app.js'],
  '/static/js/db.js': ['./static/js/db.js', '../static/js/db.js', 'static/js/db.js'],
  '/static/js/sync.js': ['./static/js/sync.js', '../static/js/sync.js', 'static/js/sync.js'],
  '/static/images/icon-192.png': ['./static/images/icon-192.png', '../static/images/icon-192.png', 'static/images/icon-192.png'],
  '/static/images/icon-512.png': ['./static/images/icon-512.png', '../static/images/icon-512.png', 'static/images/icon-512.png'],
  '/static/images/header.png': ['./static/images/header.png', '../static/images/header.png', 'static/images/header.png']
};

// Página HTML para mostrar quando estiver offline (versão inline como fallback)
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prêmio CNA Brasil Artesanal - Geleia (Offline)</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #fff5f5;
            color: #333;
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        h1 {
            color: #b71540;
            margin: 0;
            padding: 0;
        }
        .status {
            display: inline-block;
            background-color: #e74c3c;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-weight: bold;
            margin-top: 10px;
        }
        .info-box {
            background-color: #f8f4e8;
            border-left: 4px solid #f39c12;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 4px 4px 0;
        }
        .btn {
            display: inline-block;
            background-color: #b71540;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            text-decoration: none;
            margin-right: 10px;
            margin-top: 10px;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background-color: #900d30;
        }
        .btn.secondary {
            background-color: #3498db;
        }
        .btn.secondary:hover {
            background-color: #2980b9;
        }
        .buttons {
            margin-top: 20px;
            text-align: center;
        }
        .connection-status {
            text-align: center;
            margin-top: 20px;
            font-size: 14px;
            color: #666;
        }
        .steps {
            margin: 20px 0;
        }
        .steps ol {
            padding-left: 20px;
        }
        .steps li {
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Prêmio CNA Brasil Artesanal</h1>
            <div class="status">Offline</div>
        </header>
        
        <div class="info-box">
            <p><strong>Você está offline</strong>, mas o aplicativo continua funcionando normalmente.</p>
            <p>Todas as avaliações serão salvas localmente e sincronizadas automaticamente quando você estiver online novamente.</p>
        </div>
        
        <div class="steps">
            <h3>Como usar o aplicativo offline:</h3>
            <ol>
                <li>Clique no botão "Ir para o Formulário" abaixo</li>
                <li>Preencha as avaliações normalmente</li>
                <li>Seus dados serão salvos no dispositivo</li>
                <li>Quando reconectar à internet, os dados serão sincronizados automaticamente</li>
            </ol>
        </div>
        
        <div class="buttons">
            <a href="/" class="btn">Ir para o Formulário</a>
            <button class="btn secondary" onclick="checkConnection()">Tentar Reconectar</button>
        </div>
        
        <div class="connection-status" id="connection-status">
            Verificando conexão...
        </div>
    </div>
    
    <script>
        // Função para verificar a conexão
        function checkConnection() {
            const statusElement = document.getElementById('connection-status');
            
            if (navigator.onLine) {
                statusElement.textContent = 'Conexão detectada! Redirecionando...';
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
            } else {
                statusElement.textContent = 'Ainda offline. Tente novamente mais tarde.';
                setTimeout(() => {
                    statusElement.textContent = 'Verificando conexão...';
                }, 3000);
            }
        }
        
        // Verifica a conexão quando a página carrega
        document.addEventListener('DOMContentLoaded', () => {
            checkConnection();
        });
        
        // Verifica periodicamente se a conexão foi restabelecida
        setInterval(() => {
            const statusElement = document.getElementById('connection-status');
            
            if (navigator.onLine) {
                statusElement.textContent = 'Conexão detectada! Você pode continuar usando o aplicativo normalmente.';
            } else {
                statusElement.textContent = 'Verificando conexão...';
            }
        }, 10000);
        
        // Detecta mudanças na conexão
        window.addEventListener('online', () => {
            const statusElement = document.getElementById('connection-status');
            statusElement.textContent = 'Conexão detectada! Redirecionando...';
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        });
    </script>
</body>
</html>
`;

// Maximum number of sync attempts per item
const MAX_SYNC_ATTEMPTS = 5;

// Backoff time in milliseconds (starts at 30 seconds)
const INITIAL_BACKOFF = 30000;

// Função para tentar buscar um recurso com caminhos alternativos
const fetchWithAlternatives = async (request, alternatives) => {
  // Primeiro tenta o caminho original
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      return response;
    }
  } catch (error) {
    console.log(`Falha ao buscar ${request.url}, tentando alternativas`);
  }
  
  // Se falhar, tenta os caminhos alternativos
  if (alternatives && alternatives.length > 0) {
    const url = new URL(request.url);
    const baseUrl = url.origin;
    
    for (const altPath of alternatives) {
      try {
        const altUrl = new URL(altPath, baseUrl);
        console.log(`Tentando caminho alternativo: ${altUrl.href}`);
        const response = await fetch(altUrl.href);
        if (response && response.status === 200) {
          return response;
        }
      } catch (error) {
        console.log(`Falha ao buscar caminho alternativo ${altPath}`);
      }
    }
  }
  
  // Se todas as tentativas falharem, lança um erro
  throw new Error(`Não foi possível buscar ${request.url} nem suas alternativas`);
};

// Função para criar respostas offline para recursos essenciais
const createOfflineAssets = async () => {
  const cache = await caches.open(CACHE_NAME);
  
  // Cria a página offline
  await cache.put('/offline.html', createOfflineResponse());
  
  // Cria uma resposta vazia para CSS e JS que não puderam ser cacheados
  const emptyCSS = new Response('/* Fallback CSS */', {
    headers: { 'Content-Type': 'text/css' }
  });
  
  const emptyJS = new Response('// Fallback JS', {
    headers: { 'Content-Type': 'application/javascript' }
  });
  
  // Adiciona fallbacks para recursos críticos
  await cache.put(new Request('/static/css/styles.css'), emptyCSS.clone());
  await cache.put(new Request('/static/js/app.js'), emptyJS.clone());
  await cache.put(new Request('/static/js/db.js'), emptyJS.clone());
  await cache.put(new Request('/static/js/sync.js'), emptyJS.clone());
  
  console.log('[Service Worker] Offline fallbacks created');
};

// Função para pré-cachear a página inicial
const precacheHomePage = async () => {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Cria uma versão offline da página inicial
    const offlineHomeHTML = OFFLINE_HTML.replace(
      '<div class="status">Offline</div>',
      '<div class="status">Modo Offline</div>'
    ).replace(
      '<h1>Prêmio CNA Brasil Artesanal</h1>',
      '<h1>Formulário de Avaliação</h1>'
    );
    
    const offlineHomeResponse = new Response(offlineHomeHTML, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
    
    // Cacheia a versão offline da página inicial como fallback
    await cache.put('/', offlineHomeResponse.clone());
    await cache.put('/index.html', offlineHomeResponse.clone());
    
    console.log('[Service Worker] Offline home page cached');
    return true;
  } catch (error) {
    console.error('[Service Worker] Failed to cache offline home page:', error);
    return false;
  }
};

// Install event - cache assets with improved error handling
self.addEventListener('install', event => {
  console.log('[Service Worker] Installing version:', APP_VERSION);
  
  // Primeiro cacheia os recursos essenciais
  const cacheEssentials = async () => {
    const cache = await caches.open(CACHE_NAME);
    console.log('[Service Worker] Caching core assets');
    
    // Cria recursos offline primeiro
    await createOfflineAssets();
    await precacheHomePage();
    
    // Cacheia cada recurso essencial individualmente para melhor tratamento de erros
    const cachePromises = CORE_ASSETS.map(async (asset) => {
      try {
        // Tenta o caminho original primeiro
        const request = new Request(asset);
        let response;
        
        try {
          response = await fetch(request, { cache: 'no-store' });
        } catch (error) {
          console.log(`[Service Worker] Fetch failed for ${asset}, trying alternatives: ${error.message}`);
          // Se falhar, tenta caminhos alternativos
          const alternatives = ALTERNATIVE_PATHS[asset] || [];
          try {
            response = await fetchWithAlternatives(request, alternatives);
          } catch (altError) {
            console.warn(`[Service Worker] All alternatives failed for ${asset}: ${altError.message}`);
            
            // Se estamos em produção, cria uma resposta vazia em vez de falhar
            if (isProduction) {
              if (asset.includes('.css')) {
                return cache.put(asset, new Response('/* Fallback CSS */', {
                  headers: { 'Content-Type': 'text/css' }
                }));
              } else if (asset.includes('.js')) {
                return cache.put(asset, new Response('// Fallback JS', {
                  headers: { 'Content-Type': 'application/javascript' }
                }));
              } else if (asset === '/' || asset === '/index.html' || asset === './index.html' || asset === './') {
                return cache.put(asset, createOfflineResponse());
              }
            }
            return false;
          }
        }
        
        if (response && response.status === 200) {
          await cache.put(asset, response);
          console.log(`[Service Worker] Cached: ${asset}`);
          return true;
        } else {
          console.warn(`[Service Worker] Failed to cache: ${asset}, status: ${response?.status}`);
          return false;
        }
      } catch (error) {
        console.error(`[Service Worker] Error caching ${asset}:`, error);
        // Não falha a instalação por causa de um único recurso
        return false;
      }
    });
    
    // Aguarda todas as promessas terminarem
    return Promise.all(cachePromises);
  };
  
  // Depois cacheia o restante dos recursos
  const cacheRemaining = async () => {
    const cache = await caches.open(CACHE_NAME);
    console.log('[Service Worker] Caching remaining assets');
    
    const remainingAssets = ASSETS_TO_CACHE.filter(asset => !CORE_ASSETS.includes(asset));
    
    // Tenta cachear os recursos restantes, mas não falha se algum não puder ser cacheado
    for (const asset of remainingAssets) {
      try {
        const request = new Request(asset);
        const response = await fetch(request);
        
        if (response && response.status === 200) {
          await cache.put(asset, response);
          console.log(`[Service Worker] Cached: ${asset}`);
        }
      } catch (error) {
        console.warn(`[Service Worker] Non-critical asset not cached: ${asset}`);
      }
    }
  };
  
  // Executa o cacheamento em duas etapas
  event.waitUntil(
    cacheEssentials()
      .then(() => {
        console.log('[Service Worker] Core assets cached successfully');
        return cacheRemaining();
      })
      .then(() => {
        console.log('[Service Worker] All assets cached');
        return self.skipWaiting(); // Ativa o service worker imediatamente
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating version:', APP_VERSION);
  
  const activationTasks = async () => {
    // Limpa caches antigos
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) {
          console.log('[Service Worker] Clearing old cache:', cacheName);
          return caches.delete(cacheName);
        }
      })
    );
    
    // Toma controle de todas as páginas imediatamente
    await self.clients.claim();
    
    // Notifica todos os clientes que o service worker foi atualizado
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_ACTIVATED',
        version: APP_VERSION
      });
    });
    
    console.log('[Service Worker] Activation complete, now controlling all pages');
  };
  
  event.waitUntil(activationTasks());
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

// Função para verificar se uma URL corresponde a um caminho conhecido
const getPathKey = (url) => {
  const urlPath = new URL(url).pathname;
  
  // Verifica caminhos exatos
  if (ALTERNATIVE_PATHS[urlPath]) {
    return urlPath;
  }
  
  // Verifica caminhos parciais
  for (const path of Object.keys(ALTERNATIVE_PATHS)) {
    if (urlPath.endsWith(path) || path.endsWith(urlPath)) {
      return path;
    }
  }
  
  return null;
};

// Função para verificar se uma URL é a página inicial
const isHomePage = (url) => {
  const path = new URL(url).pathname;
  return path === '/' || path === '/index.html' || path === '' || path.endsWith('/index.html');
};

// Fetch event - serve from cache or network with improved error handling
self.addEventListener('fetch', event => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  
  // Estratégia especial para a página inicial - sempre tenta servir do cache primeiro
  if (isHomePage(event.request.url)) {
    event.respondWith(
      (async () => {
        try {
          console.log(`[Service Worker] Handling home page request: ${event.request.url}`);
          
          // Primeiro tenta encontrar no cache
          let cachedResponse = await caches.match(event.request);
          
          // Se não encontrar com o URL exato, tenta URLs alternativos
          if (!cachedResponse) {
            console.log('[Service Worker] Home page not found in cache with exact URL, trying alternatives');
            
            // Lista de possíveis caminhos para a página inicial
            const homePaths = ['/', '/index.html', './index.html', './'];
            
            // Tenta cada caminho alternativo
            for (const path of homePaths) {
              cachedResponse = await caches.match(path);
              if (cachedResponse) {
                console.log(`[Service Worker] Found home page in cache at: ${path}`);
                break;
              }
            }
          }
          
          if (cachedResponse) {
            console.log(`[Service Worker] Serving home page from cache`);
            
            // Atualiza o cache em segundo plano (stale-while-revalidate) apenas se estiver online
            if (navigator.onLine) {
              fetch(event.request)
                .then(networkResponse => {
                  if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, networkResponse.clone());
                      console.log('[Service Worker] Updated cached home page');
                    });
                  }
                })
                .catch(error => {
                  console.log('[Service Worker] Failed to update cached home page:', error);
                });
            }
            
            return cachedResponse;
          }
          
          // Se não estiver no cache, tenta buscar da rede apenas se estiver online
          if (navigator.onLine) {
            try {
              console.log('[Service Worker] Home page not in cache, fetching from network');
              const networkResponse = await fetch(event.request);
              if (networkResponse && networkResponse.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, networkResponse.clone());
                console.log('[Service Worker] Cached home page from network');
                return networkResponse;
              }
            } catch (error) {
              console.log('[Service Worker] Failed to fetch home page from network:', error.message);
            }
          }
          
          // Se estiver offline ou tudo falhar, tenta usar a versão cacheada da home
          console.log('[Service Worker] Serving offline home page');
          
          // Tenta encontrar qualquer versão cacheada da home page
          const cachedHome = await caches.match('/') || 
                             await caches.match('/index.html') ||
                             await caches.match('./index.html') ||
                             await caches.match('./');
          
          if (cachedHome) {
            console.log('[Service Worker] Found cached home page alternative');
            return cachedHome;
          }
          
          // Se não encontrar nenhuma versão cacheada, cria uma resposta offline
          console.log('[Service Worker] No cached home page found, creating offline response');
          return createOfflineResponse();
        } catch (error) {
          console.error('[Service Worker] Error serving home page:', error);
          return createOfflineResponse();
        }
      })()
    );
    return;
  }
  
  // Para outros recursos, usa a estratégia padrão: Cache First, falling back to network
  event.respondWith(
    (async () => {
      try {
        // Primeiro tenta encontrar no cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
          return cachedResponse;
        }
        
        // Se não estiver no cache, tenta buscar da rede
        try {
          console.log(`[Service Worker] Fetching from network: ${event.request.url}`);
          const networkResponse = await fetch(event.request);
          
          // Verifica se a resposta é válida
          if (networkResponse && networkResponse.status === 200) {
            // Clona a resposta para cachear
            const responseToCache = networkResponse.clone();
            const cache = await caches.open(CACHE_NAME);
            await cache.put(event.request, responseToCache);
            
            return networkResponse;
          } else {
            console.warn(`[Service Worker] Invalid network response for ${event.request.url}: ${networkResponse?.status}`);
            throw new Error('Invalid network response');
          }
        } catch (networkError) {
          console.warn(`[Service Worker] Network fetch failed for ${event.request.url}: ${networkError.message}`);
          
          // Tenta caminhos alternativos se disponíveis
          const pathKey = getPathKey(event.request.url);
          if (pathKey && ALTERNATIVE_PATHS[pathKey]) {
            try {
              console.log(`[Service Worker] Trying alternative paths for ${event.request.url}`);
              const altResponse = await fetchWithAlternatives(
                event.request, 
                ALTERNATIVE_PATHS[pathKey]
              );
              
              // Cacheia a resposta alternativa bem-sucedida
              if (altResponse && altResponse.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                await cache.put(event.request, altResponse.clone());
                return altResponse;
              }
            } catch (altError) {
              console.warn(`[Service Worker] All alternative paths failed for ${event.request.url}`);
            }
          }
          
          // Se todas as tentativas falharem, retorna uma resposta offline apropriada
          
          // Verifica se é uma página HTML
          const isHTMLPage = event.request.mode === 'navigate' || 
                            (event.request.headers.get('accept') && 
                             event.request.headers.get('accept').includes('text/html'));
          
          if (isHTMLPage) {
            console.log(`[Service Worker] Serving offline page for HTML request: ${event.request.url}`);
            const offlineResponse = await caches.match('/offline.html');
            return offlineResponse || createOfflineResponse();
          }
          
          // Para recursos críticos, tenta encontrar fallbacks específicos
          if (event.request.url.includes('/static/js/')) {
            const jsPath = event.request.url.split('/').pop();
            console.log(`[Service Worker] Looking for JS fallback: ${jsPath}`);
            
            // Tenta encontrar uma versão em cache do mesmo arquivo
            const fallbackJS = await caches.match('/static/js/' + jsPath);
            if (fallbackJS) return fallbackJS;
            
            // Ou retorna um JS vazio
            return new Response('// Fallback JS', {
              headers: { 'Content-Type': 'application/javascript' }
            });
          }
          
          if (event.request.url.includes('/static/css/')) {
            const cssPath = event.request.url.split('/').pop();
            console.log(`[Service Worker] Looking for CSS fallback: ${cssPath}`);
            
            // Tenta encontrar uma versão em cache do mesmo arquivo
            const fallbackCSS = await caches.match('/static/css/' + cssPath);
            if (fallbackCSS) return fallbackCSS;
            
            // Ou retorna um CSS vazio
            return new Response('/* Fallback CSS */', {
              headers: { 'Content-Type': 'text/css' }
            });
          }
          
          // Para imagens, usa um ícone padrão
          if (event.request.url.includes('/static/images/')) {
            console.log(`[Service Worker] Serving fallback image for: ${event.request.url}`);
            return await caches.match('/static/images/icon-192.png');
          }
          
          // Para outros recursos, retorna uma mensagem de erro
          console.log(`[Service Worker] Returning error response for: ${event.request.url}`);
          return new Response('Recurso não disponível offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        }
      } catch (error) {
        console.error(`[Service Worker] Unhandled error in fetch handler: ${error.message}`);
        return createOfflineResponse();
      }
    })()
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
