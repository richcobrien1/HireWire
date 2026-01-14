/**
 * Sync Debug Panel Component
 * Developer tool for inspecting sync state and queue
 * Created: December 15, 2025
 */

'use client';

import { useState, useEffect } from 'react';
import { useSyncStatus } from '@/lib/store';
import { db, debugDumpDB, debugSyncQueue, getDatabaseStats } from '@/lib/db';
import { syncService } from '@/lib/sync';
import { backupService, recoveryService } from '@/lib/backup';

export function SyncDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'status' | 'queue' | 'stats' | 'actions'>('status');
  const syncStatus = useSyncStatus();
  const [queueStats, setQueueStats] = useState({ pending: 0, processing: 0, failed: 0, completed: 0, total: 0 });
  const [dbStats, setDbStats] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
      const interval = setInterval(loadStats, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadStats = async () => {
    const queue = await debugSyncQueue();
    const stats = await getDatabaseStats();
    setQueueStats(queue);
    setDbStats(stats);
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg text-xs font-mono"
        title="Sync Debug Panel"
      >
        {isOpen ? '✕' : '⚙️ Sync'}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 w-96 max-h-[600px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <h3 className="text-sm font-semibold text-white">Sync Debug Panel</h3>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                syncStatus.isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {syncStatus.isOnline ? 'Online' : 'Offline'}
              </span>
              {syncStatus.isSyncing && (
                <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 animate-pulse">
                  Syncing...
                </span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {(['status', 'queue', 'stats', 'actions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-3 py-2 text-xs font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
            {activeTab === 'status' && (
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 mb-1">Last Sync</div>
                  <div className="text-white">
                    {syncStatus.lastSuccessfulSyncAt
                      ? new Date(syncStatus.lastSuccessfulSyncAt).toLocaleTimeString()
                      : 'Never'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-400 mb-1">Pending Operations</div>
                  <div className="text-white">{syncStatus.pendingCount}</div>
                </div>

                {syncStatus.errors.length > 0 && (
                  <div>
                    <div className="text-gray-400 mb-1">Recent Errors</div>
                    <div className="space-y-2">
                      {syncStatus.errors.slice(-3).map(error => (
                        <div key={error.id} className="p-2 bg-red-500/10 border border-red-500/30 rounded text-red-400">
                          <div className="font-semibold">{error.entity}</div>
                          <div className="text-xs">{error.error}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'queue' && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2 p-2 bg-gray-800 rounded">
                  <div>
                    <div className="text-gray-400 text-[10px]">Pending</div>
                    <div className="text-yellow-400 font-bold">{queueStats.pending}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[10px]">Processing</div>
                    <div className="text-blue-400 font-bold">{queueStats.processing}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[10px]">Failed</div>
                    <div className="text-red-400 font-bold">{queueStats.failed}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[10px]">Total</div>
                    <div className="text-white font-bold">{queueStats.total}</div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const queue = await db.syncQueue.toArray();
                    console.log('Sync Queue:', queue);
                    alert(`${queue.length} items in queue. Check console for details.`);
                  }}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Dump Queue to Console
                </button>
              </div>
            )}

            {activeTab === 'stats' && dbStats && (
              <div className="space-y-2">
                <div className="p-2 bg-gray-800 rounded">
                  <div className="text-gray-400 mb-2">IndexedDB Stats</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profiles</span>
                      <span className="text-white">{dbStats.profiles}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Matches</span>
                      <span className="text-white">{dbStats.matches}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Messages</span>
                      <span className="text-white">{dbStats.messages}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Jobs</span>
                      <span className="text-white">{dbStats.jobs}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Swipes</span>
                      <span className="text-white">{dbStats.swipes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Achievements</span>
                      <span className="text-white">{dbStats.achievements}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-gray-700 pt-1 mt-1">
                      <span className="text-gray-300">Total</span>
                      <span className="text-white">{dbStats.total}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const dump = await debugDumpDB();
                    console.log('Database Dump:', dump);
                    alert('Database dumped to console');
                  }}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Dump DB to Console
                </button>
              </div>
            )}

            {activeTab === 'actions' && (
              <div className="space-y-2">
                <button
                  onClick={() => syncService.sync()}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                  disabled={syncStatus.isSyncing}
                >
                  Force Sync Now
                </button>

                <button
                  onClick={() => backupService.exportToFile()}
                  className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Export Backup
                </button>

                <button
                  onClick={async () => {
                    const report = await recoveryService.checkIntegrity();
                    console.log('Integrity Report:', report);
                    alert(report.isHealthy ? 'Database is healthy!' : `Found ${report.issues.length} issues. Check console.`);
                  }}
                  className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                >
                  Check Integrity
                </button>

                <button
                  onClick={async () => {
                    const report = await recoveryService.repairDatabase();
                    console.log('Repair Report:', report);
                    alert(`Fixed: ${report.fixed.length}, Failed: ${report.failed.length}`);
                  }}
                  className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                >
                  Repair Database
                </button>

                <button
                  onClick={() => {
                    if (confirm('Clear all local data? This cannot be undone!')) {
                      db.delete().then(() => {
                        alert('Database cleared. Refresh the page.');
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  ⚠️ Clear Database
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SyncDebugPanel;
