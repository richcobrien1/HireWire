/**
 * App Initializer - Sets up sync, PWA, and offline capabilities
 * Created: December 15, 2025
 */

'use client';

import { useEffect } from 'react';
import { registerServiceWorker, onServiceWorkerMessage } from '@/lib/pwa/serviceWorker';
import { syncService } from '@/lib/sync';
import { setupAutoBackup, setupIntegrityCheck } from '@/lib/backup';
import { useAppStore } from '@/lib/store';

export function AppInitializer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize on client side only
    const init = async () => {
      console.log('[App] Initializing HireWire...');

      // Register service worker for offline support
      try {
        const registration = await registerServiceWorker();
        if (registration) {
          console.log('[App] Service worker registered');
        }
      } catch (error) {
        console.error('[App] Service worker registration failed:', error);
      }

      // Start sync service
      syncService.start();
      console.log('[App] Sync service started');

      // Set up automatic backups
      const cleanupBackup = setupAutoBackup();
      console.log('[App] Auto-backup enabled');

      // Set up integrity checks
      const cleanupIntegrity = setupIntegrityCheck();
      console.log('[App] Integrity checks enabled');

      // Listen for service worker messages
      const unsubscribe = onServiceWorkerMessage((message) => {
        if (message.type === 'SYNC_COMPLETE') {
          console.log('[App] Background sync completed');
          // Refresh app data
          useAppStore.getState().refreshProfile();
          useAppStore.getState().refreshMatches();
        }
      });

      // Subscribe to sync status changes
      const unsubscribeSync = syncService.subscribe((status) => {
        useAppStore.getState().setSyncStatus(status);
      });

      // Set up network status monitoring
      const handleOnline = () => {
        useAppStore.getState().setSyncStatus({ isOnline: true });
        console.log('[App] Network restored');
      };

      const handleOffline = () => {
        useAppStore.getState().setSyncStatus({ isOnline: false });
        console.log('[App] Network lost');
      };

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      console.log('[App] Initialization complete');

      // Cleanup function
      return () => {
        syncService.stop();
        cleanupBackup();
        cleanupIntegrity();
        unsubscribe();
        unsubscribeSync();
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    };

    init();
  }, []);

  return <>{children}</>;
}

export default AppInitializer;
