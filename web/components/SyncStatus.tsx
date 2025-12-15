/**
 * Sync Status Component
 * Displays real-time sync status and network connectivity
 * Created: December 15, 2025
 */

'use client';

import { useEffect, useState } from 'react';
import { useSyncStatus, useIsOnline } from '@/lib/store';
import { syncService } from '@/lib/sync';

export function SyncStatus() {
  const syncStatus = useSyncStatus();
  const isOnline = useIsOnline();
  const [lastSyncText, setLastSyncText] = useState('Never');

  useEffect(() => {
    if (syncStatus.lastSuccessfulSyncAt) {
      const updateText = () => {
        const diff = Date.now() - syncStatus.lastSuccessfulSyncAt!;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (minutes < 1) {
          setLastSyncText('Just now');
        } else if (minutes < 60) {
          setLastSyncText(`${minutes}m ago`);
        } else if (hours < 24) {
          setLastSyncText(`${hours}h ago`);
        } else {
          setLastSyncText('Over 24h ago');
        }
      };

      updateText();
      const interval = setInterval(updateText, 30000); // Update every 30s
      return () => clearInterval(interval);
    }
  }, [syncStatus.lastSuccessfulSyncAt]);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <div className="w-2 h-2 bg-orange-500 rounded-full" />
        <span className="text-sm text-orange-500">Offline</span>
        {syncStatus.pendingCount > 0 && (
          <span className="text-xs text-orange-400">
            ({syncStatus.pendingCount} pending)
          </span>
        )}
      </div>
    );
  }

  if (syncStatus.isSyncing) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <span className="text-sm text-blue-500">Syncing...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
      <div className="w-2 h-2 bg-green-500 rounded-full" />
      <span className="text-sm text-green-500">Synced</span>
      <span className="text-xs text-green-400">{lastSyncText}</span>
    </div>
  );
}

export default SyncStatus;
