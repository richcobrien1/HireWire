/**
 * Service Worker Registration and Management
 * HireWire PWA Setup
 * Created: December 15, 2025
 */

/**
 * Register service worker for offline support and background sync
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] Service worker registered:', registration.scope);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[SW] New version available');
          
          // Notify user to reload
          if (window.confirm('New version available! Reload to update?')) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
          }
        }
      });
    });

    // Register for background sync if supported
    if ('sync' in registration) {
      await registration.sync.register('sync-hirewire-data');
      console.log('[SW] Background sync registered');
    }

    // Register for periodic sync if supported (Chrome only)
    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as any,
      });

      if (status.state === 'granted') {
        await (registration as any).periodicSync.register('periodic-sync', {
          minInterval: 30 * 60 * 1000, // 30 minutes
        });
        console.log('[SW] Periodic sync registered');
      }
    }

    return registration;
  } catch (error) {
    console.error('[SW] Registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker (for cleanup)
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[SW] Service worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[SW] Unregistration failed:', error);
    return false;
  }
}

/**
 * Trigger background sync manually
 */
export async function triggerSync(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Background sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if ('sync' in registration) {
      await registration.sync.register('sync-hirewire-data');
      console.log('[SW] Background sync triggered');
    } else {
      console.log('[SW] Background sync not supported');
    }
  } catch (error) {
    console.error('[SW] Failed to trigger sync:', error);
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[Notifications] Not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  console.log('[Notifications] Permission:', permission);
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[Push] Permission denied');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      // TODO: Replace with your actual VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
      
      console.log('[Push] Subscribed:', subscription.endpoint);
      
      // Send subscription to server
      // TODO: Implement API call to save subscription
    }

    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

/**
 * Check if app is running in standalone mode (installed PWA)
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Prompt user to install PWA
 */
export function setupInstallPrompt(): {
  prompt: () => Promise<void>;
  isInstallable: boolean;
} {
  let deferredPrompt: any = null;
  let isInstallable = false;

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      isInstallable = true;
      console.log('[PWA] Install prompt available');
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      deferredPrompt = null;
      isInstallable = false;
    });
  }

  return {
    prompt: async () => {
      if (!deferredPrompt) {
        console.log('[PWA] Install prompt not available');
        return;
      }

      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install outcome:', outcome);
      
      deferredPrompt = null;
      isInstallable = false;
    },
    isInstallable,
  };
}

/**
 * Listen for service worker messages
 */
export function onServiceWorkerMessage(
  callback: (message: any) => void
): () => void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handler);

  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
