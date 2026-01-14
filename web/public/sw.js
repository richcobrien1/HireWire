/**
 * Service Worker for HireWire
 * Handles background sync, offline caching, and push notifications
 * Created: December 15, 2025
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = 'hirewire-v1';
const API_CACHE = 'hirewire-api-v1';

// Assets to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/_next/static/css/app/layout.css',
  // Add other static assets as needed
];

// ==================== INSTALL EVENT ====================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.error('[SW] Failed to cache assets:', err);
      });
    })
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// ==================== ACTIVATE EVENT ====================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Claim all clients immediately
  return self.clients.claim();
});

// ==================== FETCH EVENT ====================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Handle navigation requests with network-first, fallback to offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline') || new Response('Offline');
      })
    );
    return;
  }
  
  // Handle static assets with cache-first strategy
  event.respondWith(cacheFirstStrategy(request));
});

// ==================== BACKGROUND SYNC EVENT ====================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-hirewire-data') {
    event.waitUntil(syncData());
  }
});

// ==================== PERIODIC BACKGROUND SYNC ====================

self.addEventListener('periodicsync', (event: any) => {
  console.log('[SW] Periodic sync triggered:', event.tag);
  
  if (event.tag === 'periodic-sync') {
    event.waitUntil(syncData());
  }
});

// ==================== PUSH NOTIFICATIONS ====================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (!event.data) return;
  
  const data = event.data.json();
  const options: NotificationOptions = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      ...data.data,
    },
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'HireWire', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ==================== MESSAGE EVENT ====================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// ==================== CACHING STRATEGIES ====================

/**
 * Cache-first strategy: Try cache first, then network
 */
async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('[SW] Serving from cache:', request.url);
    return cached;
  }
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirstStrategy(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);
  
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'OFFLINE',
          message: 'You are offline. Data will be synced when connection is restored.',
        },
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ==================== SYNC LOGIC ====================

/**
 * Sync pending data with server
 */
async function syncData(): Promise<void> {
  console.log('[SW] Starting background sync...');
  
  try {
    // Open IndexedDB to get pending operations
    const db = await openIndexedDB();
    const pending = await getPendingSyncOperations(db);
    
    if (pending.length === 0) {
      console.log('[SW] No pending operations to sync');
      return;
    }
    
    console.log(`[SW] Syncing ${pending.length} operations...`);
    
    for (const operation of pending) {
      try {
        await executeSyncOperation(operation);
        await markOperationComplete(db, operation.id);
      } catch (error) {
        console.error('[SW] Sync operation failed:', operation, error);
        await markOperationFailed(db, operation.id, error);
      }
    }
    
    console.log('[SW] Background sync completed');
    
    // Notify clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Open IndexedDB connection
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hirewire-db', 1);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending sync operations from IndexedDB
 */
function getPendingSyncOperations(db: IDBDatabase): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');
    const request = store.getAll();
    
    request.onsuccess = () => {
      const all = request.result || [];
      const pending = all.filter((item: any) => 
        item.status === 'pending' && 
        (!item.nextRetryAt || item.nextRetryAt <= Date.now())
      );
      resolve(pending);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Execute a sync operation
 */
async function executeSyncOperation(operation: any): Promise<void> {
  const API_URL = 'http://localhost:4000'; // TODO: Get from env
  const endpoint = getEndpointForEntity(operation.entity);
  const method = getMethodForOperation(operation.operation);
  const url = `${API_URL}${endpoint}${operation.operation !== 'create' ? `/${operation.entityId}` : ''}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // TODO: Get auth token from IndexedDB or cache
    },
    body: operation.operation !== 'delete' ? JSON.stringify(operation.payload) : undefined,
  });
  
  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`);
  }
}

/**
 * Mark operation as complete in IndexedDB
 */
function markOperationComplete(db: IDBDatabase, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mark operation as failed in IndexedDB
 */
function markOperationFailed(db: IDBDatabase, id: string, error: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (!item) return resolve();
      
      item.attempts = (item.attempts || 0) + 1;
      item.lastAttemptAt = Date.now();
      item.status = item.attempts >= item.maxAttempts ? 'failed' : 'pending';
      item.error = error?.message || 'Unknown error';
      
      // Calculate next retry time with exponential backoff
      const retryDelays = [1000, 5000, 15000, 60000, 300000];
      const delay = retryDelays[Math.min(item.attempts, retryDelays.length - 1)];
      item.nextRetryAt = Date.now() + delay;
      
      const putRequest = store.put(item);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// ==================== HELPER FUNCTIONS ====================

function getEndpointForEntity(entity: string): string {
  const endpoints: Record<string, string> = {
    profile: '/api/profile/candidate',
    message: '/api/messages',
    swipe: '/api/swipe',
    preference: '/api/preferences',
    achievement: '/api/achievements',
  };
  return endpoints[entity] || `/api/${entity}`;
}

function getMethodForOperation(operation: string): string {
  const methods: Record<string, string> = {
    create: 'POST',
    update: 'PUT',
    delete: 'DELETE',
  };
  return methods[operation] || 'POST';
}

// Export empty object to make this a module
export {};
