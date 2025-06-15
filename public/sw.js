
const CACHE_NAME = 'tyokalu-app-v3';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/female-greeting.mp3',
  '/lovable-uploads/10bcea1a-822b-41ed-835a-637ece170831.png'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Static resources cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Installation failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    }).catch((error) => {
      console.error('Activation failed:', error);
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests, chrome-extension requests, and data URLs
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('data:') ||
      event.request.url.startsWith('blob:')) {
    return;
  }

  // Skip if URL contains certain patterns that cause issues
  if (event.request.url.includes('extension') || 
      event.request.url.includes('nif2_main.js')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Otherwise fetch from network
        console.log('Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response since it's a stream
            const responseToCache = response.clone();

            // Cache successful responses for static assets
            if (STATIC_CACHE_URLS.includes(new URL(event.request.url).pathname)) {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch((error) => {
                  console.error('Cache put failed:', error);
                });
            }

            return response;
          })
          .catch((error) => {
            console.error('Fetch failed:', error);
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
      .catch((error) => {
        console.error('Cache match failed:', error);
      })
  );
});

// Listen for the skip waiting message from the updated service worker
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline uploads - fix async response issue
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);
  
  if (event.tag === 'upload-audio') {
    console.log('Background sync: upload-audio');
    event.waitUntil(
      self.registration.showNotification('Työkalu App', {
        body: 'Yhteys palautettu. Voit jatkaa äänikeskustelua.',
        icon: '/lovable-uploads/10bcea1a-822b-41ed-835a-637ece170831.png'
      }).catch((error) => {
        console.error('Notification failed:', error);
      })
    );
  }
  
  if (event.tag === 'upload-file' || event.tag === 'upload-photo') {
    console.log('Background sync:', event.tag);
    event.waitUntil(
      self.registration.showNotification('Työkalu App', {
        body: 'Yhteys palautettu. Tiedostot lähetetään.',
        icon: '/lovable-uploads/10bcea1a-822b-41ed-835a-637ece170831.png'
      }).catch((error) => {
        console.error('Notification failed:', error);
      })
    );
  }
});
