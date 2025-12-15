/**
 * IndexedDB Database Configuration using Dexie.js
 * HireWire Local Storage Layer
 * Created: December 15, 2025
 */

import Dexie, { type EntityTable } from 'dexie';
import type {
  Profile,
  Match,
  Message,
  Job,
  SwipeHistory,
  UnlockedAchievement,
  Conversation,
  SyncQueueItem,
  SyncMetadata,
  UserPreferences,
  AIConversation,
  AIMessage,
  AISuggestion,
} from './types';

// Define the database schema
export class HireWireDB extends Dexie {
  // Typed tables
  profiles!: EntityTable<Profile, 'id'>;
  matches!: EntityTable<Match, 'id'>;
  messages!: EntityTable<Message, 'id'>;
  jobs!: EntityTable<Job, 'id'>;
  swipes!: EntityTable<SwipeHistory, 'id'>;
  achievements!: EntityTable<UnlockedAchievement, 'achievementId'>;
  conversations!: EntityTable<Conversation, 'matchId'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  metadata!: EntityTable<SyncMetadata, 'key'>;
  preferences!: EntityTable<UserPreferences, 'userId'>;
  aiConversations!: EntityTable<AIConversation, 'id'>;
  aiMessages!: EntityTable<AIMessage, 'id'>;
  aiSuggestions!: EntityTable<AISuggestion, 'id'>;

  constructor() {
    super('hirewire-db');

    // Define schema version 1
    this.version(1).stores({
      profiles: 'id, userId, syncStatus, lastSyncedAt, updatedAt',
      matches: 'id, candidateId, jobId, status, createdAt, syncStatus',
      messages: 'id, matchId, timestamp, syncStatus, senderId, recipientId',
      jobs: 'id, companyId, status, lastSyncedAt, postedAt',
      swipes: 'id, userId, targetId, timestamp, synced',
      achievements: 'achievementId, userId, unlockedAt, synced',
      conversations: 'matchId, lastActivityAt',
      syncQueue: '++id, status, priority, createdAt, nextRetryAt, entity',
      metadata: 'key, updatedAt',
      preferences: 'userId, updatedAt',
      aiConversations: 'id, userId, type, status, createdAt, lastMessageAt',
      aiMessages: 'id, conversationId, timestamp, role',
      aiSuggestions: 'id, userId, type, priority, dismissed, createdAt, expiresAt',
    });

    // Add hooks for automatic timestamping
    this.profiles.hook('creating', (primKey, obj) => {
      if (!obj.createdAt) obj.createdAt = Date.now();
      if (!obj.updatedAt) obj.updatedAt = Date.now();
    });

    this.profiles.hook('updating', (modifications, primKey, obj) => {
      modifications.updatedAt = Date.now();
      return modifications;
    });

    this.messages.hook('creating', (primKey, obj) => {
      if (!obj.timestamp) obj.timestamp = Date.now();
    });
  }
}

// Create singleton instance
export const db = new HireWireDB();

// ==================== DATABASE UTILITIES ====================

/**
 * Clear all data from the database (for logout/reset)
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map(table => table.clear()));
  });
}

/**
 * Clear specific user's data
 */
export async function clearUserData(userId: string): Promise<void> {
  await db.transaction('rw', [db.profiles, db.matches, db.messages, db.swipes, db.achievements, db.preferences], async () => {
    await db.profiles.where('userId').equals(userId).delete();
    await db.matches.where('candidateId').equals(userId).delete();
    await db.messages.where('senderId').equals(userId).or('recipientId').equals(userId).delete();
    await db.swipes.where('userId').equals(userId).delete();
    await db.achievements.where('userId').equals(userId).delete();
    await db.preferences.where('userId').equals(userId).delete();
  });
}

/**
 * Get database size and statistics
 */
export async function getDatabaseStats() {
  const stats = await Promise.all([
    db.profiles.count(),
    db.matches.count(),
    db.messages.count(),
    db.jobs.count(),
    db.swipes.count(),
    db.achievements.count(),
    db.syncQueue.count(),
  ]);

  return {
    profiles: stats[0],
    matches: stats[1],
    messages: stats[2],
    jobs: stats[3],
    swipes: stats[4],
    achievements: stats[5],
    pendingSync: stats[6],
    total: stats.reduce((a, b) => a + b, 0),
  };
}

/**
 * Export all data as JSON (for backup)
 */
export async function exportDatabase(): Promise<string> {
  const data = {
    version: 1,
    timestamp: Date.now(),
    stores: {
      profiles: await db.profiles.toArray(),
      matches: await db.matches.toArray(),
      messages: await db.messages.toArray(),
      jobs: await db.jobs.toArray(),
      swipes: await db.swipes.toArray(),
      achievements: await db.achievements.toArray(),
      preferences: await db.preferences.toArray(),
    },
  };

  return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON backup
 */
export async function importDatabase(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData);

  if (data.version !== 1) {
    throw new Error('Incompatible backup version');
  }

  await db.transaction('rw', db.tables, async () => {
    // Clear existing data
    await clearDatabase();

    // Import each store
    if (data.stores.profiles?.length) await db.profiles.bulkAdd(data.stores.profiles);
    if (data.stores.matches?.length) await db.matches.bulkAdd(data.stores.matches);
    if (data.stores.messages?.length) await db.messages.bulkAdd(data.stores.messages);
    if (data.stores.jobs?.length) await db.jobs.bulkAdd(data.stores.jobs);
    if (data.stores.swipes?.length) await db.swipes.bulkAdd(data.stores.swipes);
    if (data.stores.achievements?.length) await db.achievements.bulkAdd(data.stores.achievements);
    if (data.stores.preferences?.length) await db.preferences.bulkAdd(data.stores.preferences);
  });
}

// ==================== CACHE UTILITIES ====================

/**
 * Cache Time-To-Live (TTL) settings in milliseconds
 */
export const CACHE_TTL = {
  profiles: 15 * 60 * 1000, // 15 minutes
  matches: 5 * 60 * 1000, // 5 minutes
  jobs: 60 * 60 * 1000, // 1 hour
  messages: 30 * 1000, // 30 seconds (when chat open)
} as const;

/**
 * Invalidate stale cache entries
 */
export async function invalidateStaleCache(entity: keyof typeof CACHE_TTL): Promise<number> {
  const ttl = CACHE_TTL[entity];
  const cutoff = Date.now() - ttl;

  switch (entity) {
    case 'profiles':
      return await db.profiles.where('lastSyncedAt').below(cutoff).delete();
    case 'matches':
      return await db.matches.where('lastSyncedAt').below(cutoff).delete();
    case 'jobs':
      return await db.jobs.where('lastSyncedAt').below(cutoff).delete();
    case 'messages':
      return await db.messages.where('timestamp').below(cutoff).delete();
    default:
      return 0;
  }
}

/**
 * Invalidate all caches
 */
export async function invalidateAllCaches(): Promise<void> {
  await Promise.all([
    invalidateStaleCache('profiles'),
    invalidateStaleCache('matches'),
    invalidateStaleCache('jobs'),
    invalidateStaleCache('messages'),
  ]);
}

// ==================== QUERY HELPERS ====================

/**
 * Get user's profile
 */
export async function getProfile(userId: string): Promise<Profile | undefined> {
  return await db.profiles.where('userId').equals(userId).first();
}

/**
 * Get today's matches for a candidate
 */
export async function getTodayMatches(candidateId: string): Promise<Match[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return await db.matches
    .where('candidateId')
    .equals(candidateId)
    .and(match => match.createdAt >= startOfDay.getTime())
    .sortBy('matchScore');
}

/**
 * Get messages for a match
 */
export async function getMessages(matchId: string, limit = 50): Promise<Message[]> {
  return await db.messages
    .where('matchId')
    .equals(matchId)
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * Get conversations with unread count
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  const conversations = await db.conversations.toArray();
  
  // Enrich with unread counts
  for (const conv of conversations) {
    const unread = await db.messages
      .where('[matchId+recipientId]')
      .equals([conv.matchId, userId])
      .and(msg => !msg.readAt)
      .count();
    
    conv.unreadCount = unread;
  }

  return conversations.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
}

/**
 * Get pending sync queue items
 */
export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  return await db.syncQueue
    .where('status')
    .equals('pending')
    .or('status')
    .equals('failed')
    .and(item => {
      // Only return items that are ready to retry
      return !item.nextRetryAt || item.nextRetryAt <= Date.now();
    })
    .sortBy('priority');
}

/**
 * Get user's unlocked achievements
 */
export async function getUserAchievements(userId: string): Promise<UnlockedAchievement[]> {
  return await db.achievements
    .where('userId')
    .equals(userId)
    .sortBy('unlockedAt');
}

// ==================== SYNC QUEUE OPERATIONS ====================

/**
 * Add item to sync queue
 */
export async function queueSync(item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts' | 'status'>): Promise<string> {
  const queueItem: Omit<SyncQueueItem, 'id'> = {
    ...item,
    attempts: 0,
    maxAttempts: 5,
    createdAt: Date.now(),
    status: 'pending',
  };

  return await db.syncQueue.add(queueItem as any) as any;
}

/**
 * Mark sync item as completed
 */
export async function completeSyncItem(id: string): Promise<void> {
  await db.syncQueue.update(id, { status: 'completed' });
}

/**
 * Mark sync item as failed and schedule retry
 */
export async function failSyncItem(id: string, error: string): Promise<void> {
  const item = await db.syncQueue.get(id);
  if (!item) return;

  const attempts = item.attempts + 1;
  const retryDelays = [1000, 5000, 15000, 60000, 300000]; // Exponential backoff
  const nextRetryAt = Date.now() + (retryDelays[Math.min(attempts, retryDelays.length - 1)] || 300000);

  await db.syncQueue.update(id, {
    status: attempts >= item.maxAttempts ? 'failed' : 'pending',
    attempts,
    lastAttemptAt: Date.now(),
    nextRetryAt,
    error,
  });
}

/**
 * Clear completed sync items (cleanup)
 */
export async function clearCompletedSyncItems(): Promise<number> {
  return await db.syncQueue.where('status').equals('completed').delete();
}

// ==================== DEVELOPMENT HELPERS ====================

/**
 * Debug: Dump entire database
 * Only available in development
 */
export async function debugDumpDB() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('debugDumpDB is only available in development');
    return null;
  }

  return {
    profiles: await db.profiles.toArray(),
    matches: await db.matches.toArray(),
    messages: await db.messages.toArray(),
    jobs: await db.jobs.toArray(),
    swipes: await db.swipes.toArray(),
    achievements: await db.achievements.toArray(),
    conversations: await db.conversations.toArray(),
    syncQueue: await db.syncQueue.toArray(),
    metadata: await db.metadata.toArray(),
    preferences: await db.preferences.toArray(),
  };
}

/**
 * Debug: Get sync queue status
 */
export async function debugSyncQueue() {
  const pending = await db.syncQueue.where('status').equals('pending').count();
  const processing = await db.syncQueue.where('status').equals('processing').count();
  const failed = await db.syncQueue.where('status').equals('failed').count();
  const completed = await db.syncQueue.where('status').equals('completed').count();

  return { pending, processing, failed, completed, total: pending + processing + failed + completed };
}

// ==================== EXPORTS ====================

export default db;

// Export types for convenience
export type { EntityTable } from 'dexie';
