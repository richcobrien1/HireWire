/**
 * Sync Service - Handles background synchronization
 * HireWire Offline-First Sync Engine
 * Created: December 15, 2025
 */

import { db, getPendingSyncItems, completeSyncItem, failSyncItem } from '../db';
import type { SyncQueueItem, Conflict } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ==================== SYNC SERVICE CLASS ====================

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  
  // Retry delays (exponential backoff in ms)
  private retryDelays = [1000, 5000, 15000, 60000, 300000];

  constructor() {
    // Set up network status monitoring
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnlineStatus(true));
      window.addEventListener('offline', () => this.handleOnlineStatus(false));
    }
  }

  // ==================== PUBLIC API ====================

  /**
   * Start automatic background sync (every 5 minutes when online)
   */
  start(): void {
    if (this.syncInterval) return;
    
    // Initial sync
    this.sync();
    
    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.sync();
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Stop automatic background sync
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Manually trigger sync
   */
  async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      console.log('[Sync] Skipping sync - offline or already syncing');
      return;
    }

    console.log('[Sync] Starting sync...');
    this.isSyncing = true;
    this.notifyListeners({ isSyncing: true });

    try {
      // Step 1: Pull latest data from server
      await this.pullFromServer();

      // Step 2: Push local changes to server
      await this.pushToServer();

      // Step 3: Update sync metadata
      await this.updateSyncMetadata();

      console.log('[Sync] Sync completed successfully');
      this.notifyListeners({
        isSyncing: false,
        lastSyncAt: Date.now(),
        lastSuccessfulSyncAt: Date.now(),
      });
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
      this.notifyListeners({
        isSyncing: false,
        errors: [{
          id: `sync-error-${Date.now()}`,
          entity: 'sync',
          entityId: 'global',
          operation: 'sync',
          error: error instanceof Error ? error.message : 'Unknown sync error',
          timestamp: Date.now(),
          retryable: true,
        }],
      });
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Subscribe to sync status changes
   */
  subscribe(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current online status
   */
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(online: boolean): void {
    this.isOnline = online;
    this.notifyListeners({ isOnline: online });

    if (online) {
      console.log('[Sync] Network restored - triggering sync');
      // Trigger sync when coming back online
      setTimeout(() => this.sync(), 1000);
    } else {
      console.log('[Sync] Network lost - switching to offline mode');
    }
  }

  /**
   * Pull latest data from server
   */
  private async pullFromServer(): Promise<void> {
    // Get last sync timestamp
    const lastSync = await this.getLastSyncTimestamp();
    
    try {
      // Fetch updates since last sync
      const response = await fetch(`${API_URL}/api/sync/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAccessToken()}`,
        },
        body: JSON.stringify({ since: lastSync }),
      });

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Write updates to IndexedDB
      if (data.profiles?.length) {
        await db.profiles.bulkPut(data.profiles);
      }
      if (data.matches?.length) {
        await db.matches.bulkPut(data.matches);
      }
      if (data.messages?.length) {
        await db.messages.bulkPut(data.messages);
      }
      if (data.jobs?.length) {
        await db.jobs.bulkPut(data.jobs);
      }

      console.log('[Sync] Pull completed:', {
        profiles: data.profiles?.length || 0,
        matches: data.matches?.length || 0,
        messages: data.messages?.length || 0,
        jobs: data.jobs?.length || 0,
      });
    } catch (error) {
      console.error('[Sync] Pull failed:', error);
      throw error;
    }
  }

  /**
   * Push local changes to server
   */
  private async pushToServer(): Promise<void> {
    // Get pending operations from queue
    const pending = await getPendingSyncItems();

    if (pending.length === 0) {
      console.log('[Sync] No pending changes to push');
      return;
    }

    console.log(`[Sync] Pushing ${pending.length} pending operations...`);

    let completed = 0;
    let failed = 0;

    // Process queue items by priority
    for (const item of pending) {
      try {
        await this.executeSyncOperation(item);
        await completeSyncItem(item.id);
        completed++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await failSyncItem(item.id, errorMsg);
        failed++;
        console.error(`[Sync] Operation failed:`, item, error);
      }
    }

    console.log(`[Sync] Push completed: ${completed} succeeded, ${failed} failed`);
    
    this.notifyListeners({
      pendingCount: await this.getPendingCount(),
      failedCount: failed,
    });
  }

  /**
   * Execute a single sync operation
   */
  private async executeSyncOperation(item: SyncQueueItem): Promise<void> {
    const endpoint = this.getEndpointForEntity(item.entity);
    const method = this.getMethodForOperation(item.operation);
    const url = `${API_URL}${endpoint}${item.operation !== 'create' ? `/${item.entityId}` : ''}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAccessToken()}`,
      },
      body: item.operation !== 'delete' ? JSON.stringify(item.payload) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    // Update local record with server-assigned ID if needed
    if (item.operation === 'create' && result.data?.id) {
      await this.updateLocalIdWithServerId(item.entity, item.entityId, result.data.id);
    }
  }

  /**
   * Update local temporary ID with server-assigned ID
   */
  private async updateLocalIdWithServerId(entity: string, localId: string, serverId: string): Promise<void> {
    switch (entity) {
      case 'message':
        const message = await db.messages.get(localId);
        if (message) {
          await db.messages.delete(localId);
          await db.messages.put({ ...message, id: serverId, localId: undefined });
        }
        break;
      case 'swipe':
        const swipe = await db.swipes.get(localId);
        if (swipe) {
          await db.swipes.delete(localId);
          await db.swipes.put({ ...swipe, id: serverId });
        }
        break;
    }
  }

  /**
   * Get API endpoint for entity type
   */
  private getEndpointForEntity(entity: string): string {
    const endpoints: Record<string, string> = {
      profile: '/api/profile/candidate',
      message: '/api/messages',
      swipe: '/api/swipe',
      preference: '/api/preferences',
      achievement: '/api/achievements',
    };
    return endpoints[entity] || `/api/${entity}`;
  }

  /**
   * Get HTTP method for operation type
   */
  private getMethodForOperation(operation: string): string {
    const methods: Record<string, string> = {
      create: 'POST',
      update: 'PUT',
      delete: 'DELETE',
    };
    return methods[operation] || 'POST';
  }

  /**
   * Update sync metadata
   */
  private async updateSyncMetadata(): Promise<void> {
    await db.metadata.put({
      key: 'lastSyncAt',
      value: Date.now(),
      updatedAt: Date.now(),
    });
  }

  /**
   * Get last sync timestamp
   */
  private async getLastSyncTimestamp(): Promise<number> {
    const metadata = await db.metadata.get('lastSyncAt');
    return metadata?.value || 0;
  }

  /**
   * Get pending operations count
   */
  private async getPendingCount(): Promise<number> {
    return await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .count();
  }

  /**
   * Get access token from localStorage
   */
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Try to get from Zustand persist storage
    const stored = localStorage.getItem('hirewire-storage');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.state?.auth?.accessToken || null;
    }
    
    return null;
  }

  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: Partial<SyncStatus>): void {
    this.listeners.forEach(listener => listener(status as any));
  }
}

// ==================== CONFLICT RESOLUTION ====================

/**
 * Detect conflicts between local and server versions
 */
export async function detectConflicts(): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  
  // Check profiles for conflicts
  const profiles = await db.profiles.toArray();
  for (const profile of profiles) {
    if (profile.syncStatus === 'conflict') {
      conflicts.push({
        id: `conflict-${profile.id}`,
        entity: 'profile',
        entityId: profile.id,
        localVersion: profile,
        serverVersion: null, // Would be fetched from server
        localUpdatedAt: profile.updatedAt,
        serverUpdatedAt: profile.lastSyncedAt,
        strategy: 'merge-fields',
      });
    }
  }
  
  return conflicts;
}

/**
 * Resolve conflicts using specified strategy
 */
export async function resolveConflict(conflict: Conflict): Promise<any> {
  switch (conflict.strategy) {
    case 'local-wins':
      return conflict.localVersion;
    
    case 'server-wins':
      return conflict.serverVersion;
    
    case 'merge-fields':
      return mergeConflict(conflict);
    
    case 'keep-both':
      // For messages, keep both (no actual conflict)
      return conflict.localVersion;
    
    case 'manual':
      // Requires user intervention
      throw new Error('Manual conflict resolution required');
    
    default:
      // Default to server wins
      return conflict.serverVersion;
  }
}

/**
 * Merge conflicting changes (field-level merge, newer wins)
 */
function mergeConflict(conflict: Conflict): any {
  const local = conflict.localVersion as any;
  const server = conflict.serverVersion as any;
  
  const merged: any = {};
  
  // Get all unique keys
  const keys = new Set([...Object.keys(local), ...Object.keys(server)]);
  
  for (const key of keys) {
    // For timestamp fields, use newer value
    if (key.includes('At') || key.includes('Date')) {
      merged[key] = Math.max(local[key] || 0, server[key] || 0);
    }
    // For arrays, merge and deduplicate
    else if (Array.isArray(local[key]) || Array.isArray(server[key])) {
      const localArr = local[key] || [];
      const serverArr = server[key] || [];
      merged[key] = Array.from(new Set([...localArr, ...serverArr]));
    }
    // For objects, recursively merge
    else if (typeof local[key] === 'object' && typeof server[key] === 'object') {
      merged[key] = { ...server[key], ...local[key] };
    }
    // For primitives, use local if more recent, else server
    else {
      merged[key] = local.updatedAt > server.updatedAt ? local[key] : server[key];
    }
  }
  
  return merged;
}

// ==================== TYPES ====================

interface SyncStatus {
  isOnline?: boolean;
  isSyncing?: boolean;
  lastSyncAt?: number;
  lastSuccessfulSyncAt?: number;
  pendingCount?: number;
  failedCount?: number;
  errors?: Array<{
    id: string;
    entity: string;
    entityId: string;
    operation: string;
    error: string;
    timestamp: number;
    retryable: boolean;
  }>;
}

// ==================== SINGLETON INSTANCE ====================

export const syncService = new SyncService();

// Auto-start sync service
if (typeof window !== 'undefined') {
  syncService.start();
}

export default syncService;
