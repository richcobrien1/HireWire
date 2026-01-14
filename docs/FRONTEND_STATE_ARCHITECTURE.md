# HireWire Frontend State & Sync Architecture

**Created:** December 15, 2025  
**Purpose:** Define comprehensive frontend state management and data synchronization strategy

---

## Architecture Overview

### Core Principles

1. **Offline-First**: App works without network, syncs when available
2. **Optimistic UI**: Instant feedback, sync in background
3. **Conflict Resolution**: Last-write-wins with merge strategies
4. **Progressive Enhancement**: Basic features work always, advanced features require sync
5. **Performance**: IndexedDB for large data, memory for hot data
6. **Resilience**: Multiple backup strategies, no data loss

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       USER INTERACTION                       │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              REACT COMPONENT (UI Layer)                      │
│  - useState (local UI state)                                 │
│  - useForm (form state)                                      │
│  - Event handlers                                            │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           ZUSTAND STORE (Global State Manager)               │
│  - Reactive state management                                 │
│  - Computed selectors                                        │
│  - Action dispatchers                                        │
│  - State subscriptions                                       │
└─────────────┬──────────────────────────┬────────────────────┘
              ↓                          ↓
┌──────────────────────────┐  ┌──────────────────────────────┐
│   SESSION STORAGE        │  │   LOCAL STORAGE              │
│   (Temporary UI state)   │  │   (Persistent preferences)   │
│   - Current tab          │  │   - Theme settings           │
│   - Scroll position      │  │   - User preferences         │
│   - Draft messages       │  │   - Auth tokens              │
│   TTL: Browser session   │  │   TTL: Until cleared         │
└──────────────────────────┘  └──────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────────┐
│              INDEXEDDB (Local Database)                      │
│  - Complete offline data store                               │
│  - Profiles, matches, messages, jobs                         │
│  - Queue for pending syncs                                   │
│  - Conflict resolution metadata                              │
│  TTL: Until explicitly cleared or 90 days inactive           │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           SYNC SERVICE (Background Worker)                   │
│  - Service Worker for background sync                        │
│  - Queue manager (pending operations)                        │
│  - Conflict detector and resolver                            │
│  - Retry logic with exponential backoff                      │
│  - Network status monitoring                                 │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Server State)                      │
│  - PostgreSQL (source of truth)                              │
│  - Neo4j (graph relationships)                               │
│  - Qdrant (semantic vectors)                                 │
│  - Redis (real-time cache)                                   │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│           S3/BACKUP STORAGE (Disaster Recovery)              │
│  - Daily database snapshots                                  │
│  - User file backups (resumes, media)                        │
│  - Audit logs                                                │
│  Retention: 30 days rolling backup                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models Mapping

### Local State ↔ Backend Schema

| Frontend Model | Backend Table | Storage Layer | Sync Priority |
|----------------|---------------|---------------|---------------|
| UserProfile | candidate_profiles | IndexedDB + Zustand | Critical (immediate) |
| CareerContext | candidate_profiles.career_* | IndexedDB | Critical (immediate) |
| DailyMatches | matches (cache) | IndexedDB + Redis | High (5min) |
| SwipeHistory | swipes | IndexedDB + Queue | High (30sec) |
| Messages | messages | IndexedDB + WebSocket | Critical (real-time) |
| JobListings | jobs | IndexedDB (cache) | Medium (1hr) |
| Achievements | achievements_unlocked | IndexedDB | Low (5min) |
| Preferences | user_preferences | localStorage | Low (on change) |
| DraftMessages | - | sessionStorage | N/A (local only) |
| UIState | - | sessionStorage | N/A (local only) |

---

## IndexedDB Schema Design

### Database Structure

```typescript
interface HireWireDB {
  // Version 1
  stores: {
    profiles: ProfileStore;
    matches: MatchStore;
    messages: MessageStore;
    jobs: JobStore;
    swipes: SwipeStore;
    achievements: AchievementStore;
    syncQueue: SyncQueueStore;
    metadata: MetadataStore;
  }
}

// Store Schemas
interface ProfileStore {
  id: string; // Primary key
  userId: string; // Indexed
  fullName: string;
  email: string;
  skills: string[];
  experience: ExperienceEntry[];
  careerContext: CareerContextData;
  validationScore: number;
  
  // Sync metadata
  lastSyncedAt: number;
  localUpdatedAt: number;
  version: number;
  syncStatus: 'synced' | 'pending' | 'conflict';
}

interface MatchStore {
  id: string; // Primary key
  candidateId: string; // Indexed
  jobId: string; // Indexed
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  explanation: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  
  // Sync metadata
  lastSyncedAt: number;
  syncStatus: 'synced' | 'pending';
}

interface MessageStore {
  id: string; // Primary key
  matchId: string; // Indexed
  senderId: string;
  recipientId: string;
  content: string;
  timestamp: number;
  readAt?: number;
  
  // Sync metadata
  localId?: string; // Temp ID before server assigns real ID
  syncStatus: 'synced' | 'pending' | 'failed';
  retryCount: number;
}

interface SwipeStore {
  id: string; // Primary key (temp, replaced on sync)
  userId: string; // Indexed
  targetId: string; // Job or candidate ID
  targetType: 'job' | 'candidate';
  direction: 'left' | 'right';
  timestamp: number;
  
  // Sync metadata
  synced: boolean;
  syncedAt?: number;
}

interface SyncQueueStore {
  id: string; // Auto-increment
  operation: 'create' | 'update' | 'delete';
  entity: 'profile' | 'message' | 'swipe' | 'preference';
  entityId: string;
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

interface MetadataStore {
  key: string; // Primary key
  value: any;
  updatedAt: number;
}
```

### Indexes

```typescript
// Composite indexes for efficient queries
const indexes = {
  profiles: ['userId', 'syncStatus'],
  matches: ['candidateId', 'jobId', 'status'],
  messages: ['matchId', 'timestamp', 'syncStatus'],
  swipes: ['userId', 'timestamp', 'synced'],
  syncQueue: ['status', 'priority', 'createdAt']
};
```

---

## Zustand Store Architecture

### Store Slices

```typescript
interface AppStore {
  // User slice
  user: UserState;
  setUser: (user: User) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  
  // Matches slice
  matches: MatchState;
  dailyMatches: Match[];
  fetchDailyMatches: () => Promise<void>;
  swipeOnMatch: (matchId: string, direction: 'left' | 'right') => Promise<void>;
  
  // Messages slice
  conversations: ConversationState;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  
  // Sync slice
  sync: SyncState;
  startSync: () => Promise<void>;
  pauseSync: () => void;
  getSyncStatus: () => SyncStatus;
  
  // UI slice
  ui: UIState;
  setTheme: (theme: 'light' | 'dark') => void;
  showNotification: (message: string, type: NotificationType) => void;
}

// State interfaces
interface UserState {
  currentUser: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
}

interface MatchState {
  dailyMatches: Match[];
  history: SwipeHistory[];
  currentIndex: number;
  isLoading: boolean;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  errors: SyncError[];
}

interface UIState {
  theme: 'light' | 'dark';
  notifications: Notification[];
  modals: { [key: string]: boolean };
}
```

### Store Implementation Strategy

```typescript
// Zustand with middleware
const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // State and actions here
      })),
      {
        name: 'hirewire-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist user preferences, not data
          ui: { theme: state.ui.theme }
        })
      }
    )
  )
);
```

---

## Synchronization Strategy

### Sync Triggers

1. **Immediate Sync** (Critical Priority)
   - User profile updates
   - Career context changes
   - Message sends
   - Match actions (swipe)

2. **Background Sync** (High Priority)
   - Match list refresh (every 5 minutes)
   - Message fetching (every 30 seconds when chat open)
   - Achievement unlocks

3. **Lazy Sync** (Low Priority)
   - Job listing updates (every hour)
   - Statistics updates (every 15 minutes)
   - Profile view tracking

### Sync Mechanism

```typescript
class SyncService {
  private syncQueue: SyncQueueStore;
  private isOnline: boolean;
  private isSyncing: boolean;
  private retryIntervals = [1000, 5000, 15000, 60000]; // Exponential backoff
  
  async sync() {
    if (!this.isOnline || this.isSyncing) return;
    
    this.isSyncing = true;
    
    try {
      // 1. Pull latest data from server
      await this.pullFromServer();
      
      // 2. Detect conflicts
      const conflicts = await this.detectConflicts();
      
      // 3. Resolve conflicts
      await this.resolveConflicts(conflicts);
      
      // 4. Push local changes to server
      await this.pushToServer();
      
      // 5. Update sync metadata
      await this.updateSyncMetadata();
      
    } catch (error) {
      console.error('Sync failed:', error);
      this.scheduleRetry();
    } finally {
      this.isSyncing = false;
    }
  }
  
  private async pullFromServer() {
    // Fetch updates since last sync
    const lastSync = await this.getLastSyncTimestamp();
    const updates = await api.getUpdates({ since: lastSync });
    
    // Write to IndexedDB
    await db.bulkPut(updates);
  }
  
  private async pushToServer() {
    // Get pending operations from queue
    const pending = await db.syncQueue
      .where('status')
      .equals('pending')
      .sortBy('priority');
    
    for (const operation of pending) {
      try {
        await this.executeOperation(operation);
        operation.status = 'completed';
        await db.syncQueue.put(operation);
      } catch (error) {
        operation.status = 'failed';
        operation.attempts++;
        operation.error = error.message;
        await db.syncQueue.put(operation);
      }
    }
  }
  
  private async detectConflicts(): Promise<Conflict[]> {
    // Compare local version with server version
    // Return list of conflicts
  }
  
  private async resolveConflicts(conflicts: Conflict[]) {
    for (const conflict of conflicts) {
      // Strategy: Last-write-wins by default
      // For messages: Keep both (no conflict)
      // For profile: Merge fields (prefer newer)
      const resolved = await this.mergeStrategy(conflict);
      await db.put(conflict.entity, resolved);
    }
  }
}
```

### Conflict Resolution Strategies

| Entity Type | Strategy | Rationale |
|-------------|----------|-----------|
| Profile | Field-level merge (newer wins) | User may edit on multiple devices |
| Messages | No conflict (append-only) | Messages are immutable |
| Swipes | Server wins | Once synced, cannot change |
| Preferences | Local wins | User preference at moment matters |
| Matches | Server wins | Server is source of truth |

---

## Service Worker Implementation

### Background Sync

```typescript
// sw.js - Service Worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-hirewire-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  const db = await openDB('hirewire-db');
  const pending = await db.getAll('syncQueue');
  
  for (const item of pending) {
    try {
      await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(item)
      });
      await db.delete('syncQueue', item.id);
    } catch (error) {
      // Retry later
      await db.put('syncQueue', { ...item, attempts: item.attempts + 1 });
    }
  }
}

// Register periodic background sync (every 30 minutes)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'periodic-sync') {
    event.waitUntil(syncData());
  }
});
```

### Network Status Monitoring

```typescript
// Client-side network monitoring
class NetworkMonitor {
  private isOnline = navigator.onLine;
  private listeners: Array<(online: boolean) => void> = [];
  
  constructor() {
    window.addEventListener('online', () => this.setOnline(true));
    window.addEventListener('offline', () => this.setOnline(false));
  }
  
  private setOnline(online: boolean) {
    this.isOnline = online;
    this.listeners.forEach(fn => fn(online));
    
    if (online) {
      // Trigger sync when coming back online
      this.triggerSync();
    }
  }
  
  subscribe(fn: (online: boolean) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }
  
  private async triggerSync() {
    if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-hirewire-data');
    }
  }
}
```

---

## Backup and Recovery

### Data Backup Strategy

```typescript
interface BackupStrategy {
  // Local backups (export to file)
  exportData: () => Promise<Blob>; // JSON export of all local data
  importData: (file: File) => Promise<void>; // Restore from export
  
  // Server backups (automatic)
  serverBackup: {
    frequency: 'daily';
    retention: '30 days';
    storage: 'S3';
  };
  
  // Recovery modes
  recovery: {
    fullRestore: () => Promise<void>; // Restore from server
    partialRestore: (entity: string) => Promise<void>; // Restore specific data
    conflictRestore: (timestamp: number) => Promise<void>; // Point-in-time restore
  };
}
```

### Data Export/Import

```typescript
class BackupService {
  async exportAllData(): Promise<Blob> {
    const db = await openDB('hirewire-db');
    
    const data = {
      version: 1,
      timestamp: Date.now(),
      stores: {
        profiles: await db.getAll('profiles'),
        matches: await db.getAll('matches'),
        messages: await db.getAll('messages'),
        jobs: await db.getAll('jobs'),
        achievements: await db.getAll('achievements')
      }
    };
    
    const json = JSON.stringify(data, null, 2);
    return new Blob([json], { type: 'application/json' });
  }
  
  async importData(file: File): Promise<void> {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // Validate version
    if (data.version !== 1) {
      throw new Error('Incompatible backup version');
    }
    
    const db = await openDB('hirewire-db');
    
    // Import each store
    for (const [storeName, items] of Object.entries(data.stores)) {
      await db.clear(storeName);
      for (const item of items as any[]) {
        await db.add(storeName, item);
      }
    }
    
    // Trigger sync to reconcile with server
    await syncService.sync();
  }
}
```

---

## Performance Optimizations

### Lazy Loading

```typescript
// Load data on demand, not all at once
class DataLoader {
  async loadDailyMatches(page = 0, limit = 10) {
    // Check cache first
    const cached = await db.matches
      .where('createdAt')
      .above(Date.now() - 24 * 60 * 60 * 1000)
      .limit(limit)
      .offset(page * limit)
      .toArray();
    
    if (cached.length > 0) return cached;
    
    // Fetch from server if not cached
    const matches = await api.getDailyMatches({ page, limit });
    await db.matches.bulkPut(matches);
    return matches;
  }
}
```

### Query Optimization

```typescript
// Use indexed queries
const recentMessages = await db.messages
  .where('[matchId+timestamp]') // Composite index
  .between([matchId, 0], [matchId, Date.now()])
  .reverse()
  .limit(50)
  .toArray();
```

### Cache Invalidation

```typescript
class CacheManager {
  private ttls = {
    matches: 5 * 60 * 1000, // 5 minutes
    jobs: 60 * 60 * 1000, // 1 hour
    messages: 30 * 1000, // 30 seconds
    profiles: 15 * 60 * 1000 // 15 minutes
  };
  
  async invalidate(entity: keyof typeof this.ttls) {
    const cutoff = Date.now() - this.ttls[entity];
    await db[entity]
      .where('lastSyncedAt')
      .below(cutoff)
      .delete();
  }
}
```

---

## Security Considerations

### Data Encryption

```typescript
// Encrypt sensitive data in IndexedDB
class EncryptionService {
  private key: CryptoKey;
  
  async encrypt(data: any): Promise<string> {
    const json = JSON.stringify(data);
    const encoded = new TextEncoder().encode(json);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: this.generateIV() },
      this.key,
      encoded
    );
    return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  }
  
  async decrypt(encrypted: string): Promise<any> {
    const buffer = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: this.getIV() },
      this.key,
      buffer
    );
    const json = new TextDecoder().decode(decrypted);
    return JSON.parse(json);
  }
}
```

### Token Management

```typescript
// Secure token storage
class TokenManager {
  private tokenKey = 'hirewire_auth_token';
  
  setToken(token: string, expiresIn: number) {
    const expiry = Date.now() + expiresIn * 1000;
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(`${this.tokenKey}_expiry`, expiry.toString());
  }
  
  getToken(): string | null {
    const expiry = localStorage.getItem(`${this.tokenKey}_expiry`);
    if (expiry && Date.now() > parseInt(expiry)) {
      this.clearToken();
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }
  
  clearToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(`${this.tokenKey}_expiry`);
  }
}
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
- ✅ Create architecture document (this file)
- [ ] Implement IndexedDB schema and utilities
- [ ] Set up Zustand store with basic slices
- [ ] Create data model interfaces

### Phase 2: Core Sync (Week 2)
- [ ] Build sync service class
- [ ] Implement queue management
- [ ] Add conflict detection
- [ ] Create sync status UI

### Phase 3: Offline Support (Week 3)
- [ ] Register service worker
- [ ] Implement background sync
- [ ] Add network monitoring
- [ ] Test offline scenarios

### Phase 4: Optimization (Week 4)
- [ ] Add caching strategies
- [ ] Implement lazy loading
- [ ] Optimize query performance
- [ ] Add encryption for sensitive data

### Phase 5: Backup & Recovery (Week 5)
- [ ] Build export/import functionality
- [ ] Add server backup integration
- [ ] Create recovery UI
- [ ] Test disaster recovery

---

## Testing Strategy

### Unit Tests
- IndexedDB operations
- Sync queue logic
- Conflict resolution
- Data transformations

### Integration Tests
- Online → offline → online flow
- Conflict scenarios
- Background sync
- Multi-device sync

### Performance Tests
- Large dataset queries
- Sync with 1000+ pending operations
- Memory usage
- IndexedDB storage limits

---

## Monitoring and Debugging

### Metrics to Track
- Sync success/failure rate
- Average sync duration
- Queue length
- Conflict frequency
- Cache hit rate
- IndexedDB size

### Debug Tools
```typescript
// Development-only debug helpers
const debug = {
  dumpDB: async () => {
    const db = await openDB('hirewire-db');
    return {
      profiles: await db.getAll('profiles'),
      matches: await db.getAll('matches'),
      messages: await db.getAll('messages'),
      syncQueue: await db.getAll('syncQueue')
    };
  },
  
  clearDB: async () => {
    const db = await openDB('hirewire-db');
    await db.clear('profiles');
    await db.clear('matches');
    await db.clear('messages');
  },
  
  simulateOffline: () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    window.dispatchEvent(new Event('offline'));
  }
};
```

---

## References

- **IndexedDB API**: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- **Service Workers**: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- **Background Sync API**: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- **Zustand Documentation**: https://zustand-demo.pmnd.rs/
- **Dexie.js** (IndexedDB wrapper): https://dexie.org/

---

*This architecture enables HireWire to work seamlessly offline, sync intelligently in the background, and never lose user data.*
