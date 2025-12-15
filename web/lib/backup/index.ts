/**
 * Backup and Recovery Service
 * HireWire Data Export/Import and Disaster Recovery
 * Created: December 15, 2025
 */

import { db, exportDatabase, importDatabase, clearDatabase, getDatabaseStats } from '../db';
import type { Profile, Match, Message } from '../types';

// ==================== BACKUP SERVICE ====================

export class BackupService {
  /**
   * Export all local data as JSON file
   */
  async exportToFile(): Promise<void> {
    try {
      const jsonData = await exportDatabase();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `hirewire-backup-${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      
      URL.revokeObjectURL(url);
      
      console.log('[Backup] Exported to:', filename);
    } catch (error) {
      console.error('[Backup] Export failed:', error);
      throw error;
    }
  }

  /**
   * Import data from JSON file
   */
  async importFromFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      await importDatabase(text);
      console.log('[Backup] Import completed');
    } catch (error) {
      console.error('[Backup] Import failed:', error);
      throw error;
    }
  }

  /**
   * Export specific entity type
   */
  async exportEntity<T extends keyof typeof db>(
    entityType: T
  ): Promise<string> {
    const table = db[entityType];
    const data = await table.toArray();
    
    const exportData = {
      type: entityType,
      version: 1,
      timestamp: Date.now(),
      count: data.length,
      data,
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Create automatic backup to localStorage (limited size)
   */
  async createAutoBackup(): Promise<void> {
    try {
      const stats = await getDatabaseStats();
      
      // Only backup if total items < 1000 (to avoid exceeding localStorage limits)
      if (stats.total > 1000) {
        console.log('[Backup] Database too large for auto-backup');
        return;
      }
      
      const jsonData = await exportDatabase();
      localStorage.setItem('hirewire_auto_backup', jsonData);
      localStorage.setItem('hirewire_auto_backup_timestamp', Date.now().toString());
      
      console.log('[Backup] Auto-backup created');
    } catch (error) {
      console.error('[Backup] Auto-backup failed:', error);
    }
  }

  /**
   * Restore from automatic backup
   */
  async restoreFromAutoBackup(): Promise<boolean> {
    try {
      const backup = localStorage.getItem('hirewire_auto_backup');
      if (!backup) {
        console.log('[Backup] No auto-backup found');
        return false;
      }
      
      await importDatabase(backup);
      console.log('[Backup] Restored from auto-backup');
      return true;
    } catch (error) {
      console.error('[Backup] Restore from auto-backup failed:', error);
      return false;
    }
  }

  /**
   * Get auto-backup info
   */
  getAutoBackupInfo(): { exists: boolean; timestamp: number | null } {
    const backup = localStorage.getItem('hirewire_auto_backup');
    const timestamp = localStorage.getItem('hirewire_auto_backup_timestamp');
    
    return {
      exists: !!backup,
      timestamp: timestamp ? parseInt(timestamp) : null,
    };
  }

  /**
   * Delete auto-backup
   */
  deleteAutoBackup(): void {
    localStorage.removeItem('hirewire_auto_backup');
    localStorage.removeItem('hirewire_auto_backup_timestamp');
    console.log('[Backup] Auto-backup deleted');
  }
}

// ==================== RECOVERY SERVICE ====================

export class RecoveryService {
  /**
   * Check database integrity
   */
  async checkIntegrity(): Promise<IntegrityReport> {
    const report: IntegrityReport = {
      isHealthy: true,
      issues: [],
      stats: await getDatabaseStats(),
    };

    try {
      // Check for orphaned messages (messages without matches)
      const messages = await db.messages.toArray();
      const matches = await db.matches.toArray();
      const matchIds = new Set(matches.map(m => m.id));
      
      const orphanedMessages = messages.filter(m => !matchIds.has(m.matchId));
      if (orphanedMessages.length > 0) {
        report.issues.push({
          type: 'orphaned_messages',
          severity: 'warning',
          count: orphanedMessages.length,
          message: `Found ${orphanedMessages.length} messages without matching conversations`,
        });
        report.isHealthy = false;
      }

      // Check for corrupted profiles
      const profiles = await db.profiles.toArray();
      const corruptedProfiles = profiles.filter(p => !p.userId || !p.id);
      if (corruptedProfiles.length > 0) {
        report.issues.push({
          type: 'corrupted_profiles',
          severity: 'error',
          count: corruptedProfiles.length,
          message: `Found ${corruptedProfiles.length} corrupted profiles`,
        });
        report.isHealthy = false;
      }

      // Check for stuck sync queue items
      const syncQueue = await db.syncQueue
        .where('status')
        .equals('processing')
        .toArray();
      
      const stuckItems = syncQueue.filter(
        item => item.lastAttemptAt && Date.now() - item.lastAttemptAt > 5 * 60 * 1000
      );
      
      if (stuckItems.length > 0) {
        report.issues.push({
          type: 'stuck_sync',
          severity: 'warning',
          count: stuckItems.length,
          message: `Found ${stuckItems.length} stuck sync operations`,
        });
        report.isHealthy = false;
      }

    } catch (error) {
      report.issues.push({
        type: 'check_failed',
        severity: 'error',
        count: 0,
        message: error instanceof Error ? error.message : 'Integrity check failed',
      });
      report.isHealthy = false;
    }

    return report;
  }

  /**
   * Repair database issues
   */
  async repairDatabase(): Promise<RepairReport> {
    const report: RepairReport = {
      fixed: [],
      failed: [],
    };

    try {
      // Remove orphaned messages
      const messages = await db.messages.toArray();
      const matches = await db.matches.toArray();
      const matchIds = new Set(matches.map(m => m.id));
      
      for (const message of messages) {
        if (!matchIds.has(message.matchId)) {
          try {
            await db.messages.delete(message.id);
            report.fixed.push({
              type: 'orphaned_message',
              id: message.id,
              message: 'Removed orphaned message',
            });
          } catch (error) {
            report.failed.push({
              type: 'orphaned_message',
              id: message.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Remove corrupted profiles
      const profiles = await db.profiles.toArray();
      for (const profile of profiles) {
        if (!profile.userId || !profile.id) {
          try {
            await db.profiles.delete(profile.id);
            report.fixed.push({
              type: 'corrupted_profile',
              id: profile.id,
              message: 'Removed corrupted profile',
            });
          } catch (error) {
            report.failed.push({
              type: 'corrupted_profile',
              id: profile.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Reset stuck sync items
      const stuckItems = await db.syncQueue
        .where('status')
        .equals('processing')
        .toArray();
      
      for (const item of stuckItems) {
        if (item.lastAttemptAt && Date.now() - item.lastAttemptAt > 5 * 60 * 1000) {
          try {
            await db.syncQueue.update(item.id, {
              status: 'pending',
              lastAttemptAt: undefined,
            });
            report.fixed.push({
              type: 'stuck_sync',
              id: item.id,
              message: 'Reset stuck sync operation',
            });
          } catch (error) {
            report.failed.push({
              type: 'stuck_sync',
              id: item.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

    } catch (error) {
      console.error('[Recovery] Repair failed:', error);
    }

    return report;
  }

  /**
   * Full database reset (nuclear option)
   */
  async resetDatabase(): Promise<void> {
    if (!confirm('Are you sure you want to reset all local data? This cannot be undone.')) {
      return;
    }

    try {
      await clearDatabase();
      console.log('[Recovery] Database reset complete');
    } catch (error) {
      console.error('[Recovery] Reset failed:', error);
      throw error;
    }
  }

  /**
   * Partial restore - restore specific entity from backup
   */
  async restoreEntity(entityType: string, backupData: string): Promise<void> {
    try {
      const data = JSON.parse(backupData);
      
      if (data.type !== entityType) {
        throw new Error(`Backup type mismatch: expected ${entityType}, got ${data.type}`);
      }

      // Clear existing data
      const table = db[entityType as keyof typeof db];
      if (!table) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      await table.clear();
      await table.bulkAdd(data.data);
      
      console.log(`[Recovery] Restored ${data.count} ${entityType} records`);
    } catch (error) {
      console.error('[Recovery] Partial restore failed:', error);
      throw error;
    }
  }

  /**
   * Recover from server (re-download all data)
   */
  async recoverFromServer(): Promise<void> {
    if (!confirm('This will replace all local data with server data. Continue?')) {
      return;
    }

    try {
      // Clear local database
      await clearDatabase();
      
      // TODO: Trigger full sync from server
      // This would be implemented in the sync service
      console.log('[Recovery] Initiated recovery from server');
    } catch (error) {
      console.error('[Recovery] Server recovery failed:', error);
      throw error;
    }
  }
}

// ==================== TYPES ====================

interface IntegrityReport {
  isHealthy: boolean;
  issues: IntegrityIssue[];
  stats: {
    profiles: number;
    matches: number;
    messages: number;
    jobs: number;
    swipes: number;
    achievements: number;
    pendingSync: number;
    total: number;
  };
}

interface IntegrityIssue {
  type: string;
  severity: 'error' | 'warning';
  count: number;
  message: string;
}

interface RepairReport {
  fixed: RepairAction[];
  failed: RepairAction[];
}

interface RepairAction {
  type: string;
  id: string;
  message?: string;
  error?: string;
}

// ==================== SINGLETON INSTANCES ====================

export const backupService = new BackupService();
export const recoveryService = new RecoveryService();

// ==================== AUTO-BACKUP SETUP ====================

/**
 * Set up automatic backups (runs every hour when app is active)
 */
export function setupAutoBackup(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Create backup every hour
  const interval = setInterval(() => {
    backupService.createAutoBackup();
  }, 60 * 60 * 1000); // 1 hour

  // Create initial backup
  backupService.createAutoBackup();

  // Cleanup function
  return () => {
    clearInterval(interval);
  };
}

/**
 * Set up automatic integrity checks (runs on app start and periodically)
 */
export function setupIntegrityCheck(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  // Run integrity check on app start
  recoveryService.checkIntegrity().then(report => {
    if (!report.isHealthy) {
      console.warn('[Recovery] Database integrity issues found:', report.issues);
      
      // Auto-repair if only warnings
      const hasErrors = report.issues.some(issue => issue.severity === 'error');
      if (!hasErrors) {
        recoveryService.repairDatabase().then(repairReport => {
          console.log('[Recovery] Auto-repair completed:', repairReport);
        });
      }
    } else {
      console.log('[Recovery] Database integrity OK');
    }
  });

  // Run integrity check every 6 hours
  const interval = setInterval(() => {
    recoveryService.checkIntegrity();
  }, 6 * 60 * 60 * 1000); // 6 hours

  return () => {
    clearInterval(interval);
  };
}

export default { backupService, recoveryService, setupAutoBackup, setupIntegrityCheck };
