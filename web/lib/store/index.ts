/**
 * Zustand Store - Global State Management
 * HireWire Application Store
 * Created: December 15, 2025
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type {
  User,
  Profile,
  Match,
  Message,
  Conversation,
  SwipeHistory,
  SyncState,
  UIState,
  UINotification,
  UnlockedAchievement,
  GamificationState,
  UserPreferences,
  AIConversation,
  AIMessage,
  AISuggestion,
} from '../types';
import { db, queueSync } from '../db';
import { aiService } from '../ai';

// ==================== STORE INTERFACE ====================

interface AppStore {
  // ==================== AUTH STATE ====================
  auth: {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
  };
  
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  
  // ==================== PROFILE STATE ====================
  profile: {
    current: Profile | null;
    isLoading: boolean;
    error: string | null;
  };
  
  setProfile: (profile: Profile) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // ==================== MATCHES STATE ====================
  matches: {
    daily: Match[];
    history: Match[];
    currentIndex: number;
    isLoading: boolean;
    error: string | null;
  };
  
  setDailyMatches: (matches: Match[]) => void;
  nextMatch: () => void;
  previousMatch: () => void;
  swipeMatch: (matchId: string, direction: 'left' | 'right') => Promise<void>;
  refreshMatches: () => Promise<void>;
  
  // ==================== MESSAGES STATE ====================
  conversations: {
    list: Conversation[];
    active: Conversation | null;
    isLoading: boolean;
    error: string | null;
  };
  
  setConversations: (conversations: Conversation[]) => void;
  setActiveConversation: (matchId: string | null) => void;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  
  // ==================== GAMIFICATION STATE ====================
  gamification: GamificationState | null;
  
  setGamification: (state: GamificationState) => void;
  unlockAchievement: (achievementId: string) => Promise<void>;
  addXP: (amount: number) => void;
  
  // ==================== AI STATE ====================
  ai: {
    conversations: AIConversation[];
    activeConversationId: string | null;
    messages: Record<string, AIMessage[]>;
    isStreaming: boolean;
    streamingConversationId: string | null;
    suggestions: AISuggestion[];
    isLoading: boolean;
    error: string | null;
  };
  
  startAIConversation: (type: AIConversation['type'], metadata?: AIConversation['metadata']) => Promise<string>;
  sendAIMessage: (conversationId: string, content: string) => Promise<void>;
  getAIConversation: (conversationId: string) => Promise<void>;
  rateAIMessage: (messageId: string, feedback: AIMessage['feedback']) => Promise<void>;
  archiveAIConversation: (conversationId: string) => Promise<void>;
  loadAISuggestions: () => Promise<void>;
  dismissAISuggestion: (suggestionId: string) => Promise<void>;
  
  // ==================== SYNC STATE ====================
  sync: SyncState;
  
  setSyncStatus: (status: Partial<SyncState>) => void;
  startSync: () => Promise<void>;
  
  // ==================== UI STATE ====================
  ui: UIState;
  
  setTheme: (theme: 'light' | 'dark') => void;
  showNotification: (notification: Omit<UINotification, 'id' | 'createdAt'>) => void;
  dismissNotification: (id: string) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  setLoading: (key: string, loading: boolean) => void;
  
  // ==================== PREFERENCES STATE ====================
  preferences: UserPreferences | null;
  
  setPreferences: (preferences: UserPreferences) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

// ==================== INITIAL STATE ====================

const initialAuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const initialProfileState = {
  current: null,
  isLoading: false,
  error: null,
};

const initialMatchesState = {
  daily: [],
  history: [],
  currentIndex: 0,
  isLoading: false,
  error: null,
};

const initialConversationsState = {
  list: [],
  active: null,
  isLoading: false,
  error: null,
};

const initialSyncState: SyncState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  pendingCount: 0,
  failedCount: 0,
  errors: [],
};

const initialUIState: UIState = {
  theme: 'dark',
  modals: {},
  notifications: [],
  loading: {},
};

const initialAIState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  isStreaming: false,
  streamingConversationId: null,
  suggestions: [],
  isLoading: false,
  error: null,
};

// ==================== STORE IMPLEMENTATION ====================

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // ==================== AUTH ====================
        auth: initialAuthState,
        
        setUser: (user) => set((state) => {
          state.auth.user = user;
          state.auth.isAuthenticated = user !== null;
        }),
        
        setTokens: (accessToken, refreshToken) => set((state) => {
          state.auth.accessToken = accessToken;
          // Store refresh token in localStorage separately (more secure)
          if (typeof window !== 'undefined') {
            localStorage.setItem('hirewire_refresh_token', refreshToken);
          }
        }),
        
        clearAuth: () => set((state) => {
          state.auth = initialAuthState;
          state.profile = initialProfileState;
          state.matches = initialMatchesState;
          state.conversations = initialConversationsState;
          state.gamification = null;
          state.preferences = null;
          
          // Clear tokens from localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('hirewire_refresh_token');
          }
        }),
        
        // ==================== PROFILE ====================
        profile: initialProfileState,
        
        setProfile: (profile) => set((state) => {
          state.profile.current = profile;
          // Save to IndexedDB
          db.profiles.put(profile);
        }),
        
        updateProfile: async (updates) => {
          const { profile } = get();
          if (!profile.current) return;
          
          const updatedProfile = { ...profile.current, ...updates, updatedAt: Date.now() };
          
          set((state) => {
            state.profile.current = updatedProfile;
          });
          
          // Save to IndexedDB
          await db.profiles.put(updatedProfile);
          
          // Queue for server sync
          await queueSync({
            operation: 'update',
            entity: 'profile',
            entityId: updatedProfile.id,
            payload: updates,
            priority: 'critical',
            maxAttempts: 5,
          });
        },
        
        refreshProfile: async () => {
          const { auth } = get();
          if (!auth.user) return;
          
          set((state) => {
            state.profile.isLoading = true;
          });
          
          try {
            // Try to load from IndexedDB first
            const cachedProfile = await db.profiles.where('userId').equals(auth.user!.id).first();
            
            if (cachedProfile) {
              set((state) => {
                state.profile.current = cachedProfile;
                state.profile.isLoading = false;
              });
            }
            
            // TODO: Fetch from API in background and update
          } catch (error) {
            set((state) => {
              state.profile.error = error instanceof Error ? error.message : 'Failed to load profile';
              state.profile.isLoading = false;
            });
          }
        },
        
        // ==================== MATCHES ====================
        matches: initialMatchesState,
        
        setDailyMatches: (matches) => set((state) => {
          state.matches.daily = matches;
          state.matches.currentIndex = 0;
          // Save to IndexedDB
          db.matches.bulkPut(matches);
        }),
        
        nextMatch: () => set((state) => {
          if (state.matches.currentIndex < state.matches.daily.length - 1) {
            state.matches.currentIndex++;
          }
        }),
        
        previousMatch: () => set((state) => {
          if (state.matches.currentIndex > 0) {
            state.matches.currentIndex--;
          }
        }),
        
        swipeMatch: async (matchId, direction) => {
          const { auth } = get();
          if (!auth.user) return;
          
          const swipe: Omit<SwipeHistory, 'id'> = {
            userId: auth.user.id,
            targetId: matchId,
            targetType: 'job',
            direction,
            timestamp: Date.now(),
            synced: false,
          };
          
          // Save swipe to IndexedDB
          await db.swipes.add(swipe as any);
          
          // Queue for sync
          await queueSync({
            operation: 'create',
            entity: 'swipe',
            entityId: matchId,
            payload: swipe,
            priority: 'high',
            maxAttempts: 5,
          });
          
          // Move to next match
          get().nextMatch();
        },
        
        refreshMatches: async () => {
          const { auth } = get();
          if (!auth.user) return;
          
          set((state) => {
            state.matches.isLoading = true;
          });
          
          try {
            // Load from IndexedDB
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const matches = await db.matches
              .where('candidateId')
              .equals(auth.user!.id)
              .and(m => m.createdAt >= today.getTime())
              .toArray();
            
            set((state) => {
              state.matches.daily = matches;
              state.matches.isLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.matches.error = error instanceof Error ? error.message : 'Failed to load matches';
              state.matches.isLoading = false;
            });
          }
        },
        
        // ==================== MESSAGES ====================
        conversations: initialConversationsState,
        
        setConversations: (conversations) => set((state) => {
          state.conversations.list = conversations;
          // Save to IndexedDB
          db.conversations.bulkPut(conversations);
        }),
        
        setActiveConversation: (matchId) => set((state) => {
          state.conversations.active = matchId 
            ? state.conversations.list.find(c => c.matchId === matchId) || null
            : null;
        }),
        
        sendMessage: async (matchId, content) => {
          const { auth } = get();
          if (!auth.user) return;
          
          const tempId = `temp-${Date.now()}`;
          const message: Omit<Message, 'id'> & { id: string; localId: string } = {
            id: tempId,
            localId: tempId,
            matchId,
            senderId: auth.user.id,
            recipientId: '', // Will be filled by server
            content,
            timestamp: Date.now(),
            syncStatus: 'pending',
            retryCount: 0,
          };
          
          // Save to IndexedDB
          await db.messages.add(message);
          
          // Queue for sync
          await queueSync({
            operation: 'create',
            entity: 'message',
            entityId: tempId,
            payload: message,
            priority: 'critical',
            maxAttempts: 5,
          });
          
          // Update UI optimistically
          set((state) => {
            const conversation = state.conversations.list.find(c => c.matchId === matchId);
            if (conversation) {
              conversation.messages.push(message as Message);
              conversation.lastActivityAt = Date.now();
              conversation.lastMessage = message as Message;
            }
          });
        },
        
        markAsRead: async (messageId) => {
          const readAt = Date.now();
          
          // Update IndexedDB
          await db.messages.update(messageId, { readAt });
          
          // Queue for sync
          await queueSync({
            operation: 'update',
            entity: 'message',
            entityId: messageId,
            payload: { readAt },
            priority: 'high',
            maxAttempts: 3,
          });
        },
        
        // ==================== GAMIFICATION ====================
        gamification: null,
        
        setGamification: (state) => set((draft) => {
          draft.gamification = state;
        }),
        
        unlockAchievement: async (achievementId) => {
          const { auth } = get();
          if (!auth.user) return;
          
          const unlock: Omit<UnlockedAchievement, 'achievement'> = {
            achievementId,
            userId: auth.user.id,
            unlockedAt: Date.now(),
            synced: false,
          };
          
          // Save to IndexedDB
          await db.achievements.add(unlock);
          
          // Queue for sync
          await queueSync({
            operation: 'create',
            entity: 'achievement',
            entityId: achievementId,
            payload: unlock,
            priority: 'medium',
            maxAttempts: 3,
          });
          
          // Update gamification state
          set((state) => {
            if (state.gamification) {
              state.gamification.achievements.push(unlock);
            }
          });
          
          // Show notification
          get().showNotification({
            type: 'success',
            title: 'Achievement Unlocked! 🎉',
            message: `You've unlocked a new achievement!`,
            duration: 5000,
          });
        },
        
        addXP: (amount) => set((state) => {
          if (state.gamification) {
            state.gamification.xp += amount;
            
            // Check for level up
            while (state.gamification.xp >= state.gamification.xpToNextLevel) {
              state.gamification.level++;
              state.gamification.xp -= state.gamification.xpToNextLevel;
              state.gamification.xpToNextLevel = Math.floor(state.gamification.xpToNextLevel * 1.5);
              
              // Show level up notification
              get().showNotification({
                type: 'success',
                title: `Level Up! 🚀`,
                message: `You've reached level ${state.gamification.level}!`,
                duration: 5000,
              });
            }
          }
        }),
        
        // ==================== SYNC ====================
        sync: initialSyncState,
        
        setSyncStatus: (status) => set((state) => {
          Object.assign(state.sync, status);
        }),
        
        startSync: async () => {
          const { sync } = get();
          if (sync.isSyncing || !sync.isOnline) return;
          
          set((state) => {
            state.sync.isSyncing = true;
          });
          
          try {
            // TODO: Implement actual sync logic
            // This will be handled by the sync service
            
            set((state) => {
              state.sync.lastSyncAt = Date.now();
              state.sync.lastSuccessfulSyncAt = Date.now();
              state.sync.isSyncing = false;
            });
          } catch (error) {
            set((state) => {
              state.sync.isSyncing = false;
              state.sync.errors.push({
                id: `error-${Date.now()}`,
                entity: 'sync',
                entityId: 'global',
                operation: 'sync',
                error: error instanceof Error ? error.message : 'Sync failed',
                timestamp: Date.now(),
                retryable: true,
              });
            });
          }
        },
        
        // ==================== UI ====================
        ui: initialUIState,
        
        setTheme: (theme) => set((state) => {
          state.ui.theme = theme;
          // Update document class for CSS
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', theme === 'dark');
          }
        }),
        
        showNotification: (notification) => set((state) => {
          const fullNotification: UINotification = {
            ...notification,
            id: `notification-${Date.now()}`,
            createdAt: Date.now(),
          };
          
          state.ui.notifications.push(fullNotification);
          
          // Auto-dismiss after duration
          if (fullNotification.duration && fullNotification.duration > 0) {
            setTimeout(() => {
              get().dismissNotification(fullNotification.id);
            }, fullNotification.duration);
          }
        }),
        
        dismissNotification: (id) => set((state) => {
          state.ui.notifications = state.ui.notifications.filter(n => n.id !== id);
        }),
        
        openModal: (modalId) => set((state) => {
          state.ui.modals[modalId] = true;
        }),
        
        closeModal: (modalId) => set((state) => {
          state.ui.modals[modalId] = false;
        }),
        
        setLoading: (key, loading) => set((state) => {
          state.ui.loading[key] = loading;
        }),
        
        // ==================== AI ====================
        ai: initialAIState,
        
        startAIConversation: async (type, metadata) => {
          set((state) => { state.ai.isLoading = true; state.ai.error = null; });
          
          try {
            const conversationId = await aiService.startConversation(type, metadata);
            
            // Create conversation in IndexedDB
            const conversation: AIConversation = {
              id: conversationId,
              userId: get().auth.user?.id || '',
              type,
              title: `${type.replace('_', ' ')} conversation`,
              createdAt: new Date(),
              updatedAt: new Date(),
              lastMessageAt: new Date(),
              messageCount: 0,
              status: 'active',
              metadata,
            };
            
            await db.aiConversations.add(conversation);
            
            set((state) => {
              state.ai.conversations.push(conversation);
              state.ai.activeConversationId = conversationId;
              state.ai.messages[conversationId] = [];
              state.ai.isLoading = false;
            });
            
            return conversationId;
          } catch (error) {
            set((state) => {
              state.ai.error = error instanceof Error ? error.message : 'Failed to start conversation';
              state.ai.isLoading = false;
            });
            throw error;
          }
        },
        
        sendAIMessage: async (conversationId, content) => {
          const userMessage: AIMessage = {
            id: `msg_${Date.now()}`,
            conversationId,
            role: 'user',
            content,
            timestamp: new Date(),
          };
          
          // Add user message immediately
          await db.aiMessages.add(userMessage);
          set((state) => {
            if (!state.ai.messages[conversationId]) {
              state.ai.messages[conversationId] = [];
            }
            state.ai.messages[conversationId].push(userMessage);
            state.ai.isStreaming = true;
            state.ai.streamingConversationId = conversationId;
          });
          
          // Create assistant message placeholder
          const assistantMessageId = `msg_${Date.now() + 1}`;
          let assistantContent = '';
          
          const assistantMessage: AIMessage = {
            id: assistantMessageId,
            conversationId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            streaming: true,
          };
          
          await db.aiMessages.add(assistantMessage);
          set((state) => {
            state.ai.messages[conversationId].push(assistantMessage);
          });
          
          try {
            // Stream response
            await aiService.sendMessage(
              conversationId,
              content,
              (chunk: string) => {
                assistantContent += chunk;
                set((state) => {
                  const messages = state.ai.messages[conversationId];
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.id === assistantMessageId) {
                    lastMessage.content = assistantContent;
                  }
                });
              },
              async (fullMessage: string) => {
                // Update final message in DB
                await db.aiMessages.update(assistantMessageId, {
                  content: fullMessage,
                  streaming: false,
                });
                
                // Update conversation
                await db.aiConversations.update(conversationId, {
                  lastMessageAt: new Date(),
                  updatedAt: new Date(),
                  messageCount: get().ai.messages[conversationId].length,
                });
                
                set((state) => {
                  const messages = state.ai.messages[conversationId];
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.id === assistantMessageId) {
                    lastMessage.streaming = false;
                  }
                  state.ai.isStreaming = false;
                  state.ai.streamingConversationId = null;
                });
              },
              (error: Error) => {
                set((state) => {
                  state.ai.error = error.message;
                  state.ai.isStreaming = false;
                  state.ai.streamingConversationId = null;
                });
              }
            );
          } catch (error) {
            set((state) => {
              state.ai.error = error instanceof Error ? error.message : 'Failed to send message';
              state.ai.isStreaming = false;
              state.ai.streamingConversationId = null;
            });
            throw error;
          }
        },
        
        getAIConversation: async (conversationId) => {
          set((state) => { state.ai.isLoading = true; });
          
          try {
            const conversation = await db.aiConversations.get(conversationId);
            const messages = await db.aiMessages.where('conversationId').equals(conversationId).toArray();
            
            if (conversation) {
              set((state) => {
                const existing = state.ai.conversations.find(c => c.id === conversationId);
                if (!existing) {
                  state.ai.conversations.push(conversation);
                }
                state.ai.messages[conversationId] = messages;
                state.ai.activeConversationId = conversationId;
                state.ai.isLoading = false;
              });
            }
          } catch (error) {
            set((state) => {
              state.ai.error = error instanceof Error ? error.message : 'Failed to load conversation';
              state.ai.isLoading = false;
            });
            throw error;
          }
        },
        
        rateAIMessage: async (messageId, feedback) => {
          try {
            await aiService.rateMessage(messageId, feedback);
            await db.aiMessages.update(messageId, { feedback });
            
            set((state) => {
              // Update message in state
              for (const conversationId in state.ai.messages) {
                const message = state.ai.messages[conversationId].find(m => m.id === messageId);
                if (message) {
                  message.feedback = feedback;
                  break;
                }
              }
            });
          } catch (error) {
            console.error('Failed to rate message:', error);
            throw error;
          }
        },
        
        archiveAIConversation: async (conversationId) => {
          try {
            await aiService.archiveConversation(conversationId);
            await db.aiConversations.update(conversationId, { status: 'archived' });
            
            set((state) => {
              const conversation = state.ai.conversations.find(c => c.id === conversationId);
              if (conversation) {
                conversation.status = 'archived';
              }
              if (state.ai.activeConversationId === conversationId) {
                state.ai.activeConversationId = null;
              }
            });
          } catch (error) {
            console.error('Failed to archive conversation:', error);
            throw error;
          }
        },
        
        loadAISuggestions: async () => {
          try {
            const suggestions = await aiService.getSuggestions();
            await db.aiSuggestions.bulkPut(suggestions);
            
            set((state) => {
              state.ai.suggestions = suggestions;
            });
          } catch (error) {
            console.error('Failed to load suggestions:', error);
            throw error;
          }
        },
        
        dismissAISuggestion: async (suggestionId) => {
          try {
            await aiService.dismissSuggestion(suggestionId);
            await db.aiSuggestions.update(suggestionId, { dismissed: true });
            
            set((state) => {
              state.ai.suggestions = state.ai.suggestions.filter(s => s.id !== suggestionId);
            });
          } catch (error) {
            console.error('Failed to dismiss suggestion:', error);
            throw error;
          }
        },
        
        // ==================== PREFERENCES ====================
        preferences: null,
        
        setPreferences: (preferences) => set((state) => {
          state.preferences = preferences;
          // Save to IndexedDB
          db.preferences.put(preferences);
        }),
        
        updatePreferences: async (updates) => {
          const { preferences, auth } = get();
          if (!preferences || !auth.user) return;
          
          const updatedPreferences = {
            ...preferences,
            ...updates,
            updatedAt: Date.now(),
          };
          
          set((state) => {
            state.preferences = updatedPreferences;
          });
          
          // Save to IndexedDB
          await db.preferences.put(updatedPreferences);
          
          // Queue for sync
          await queueSync({
            operation: 'update',
            entity: 'preference',
            entityId: auth.user.id,
            payload: updates,
            priority: 'low',
            maxAttempts: 3,
          });
        },
      })),
      {
        name: 'hirewire-storage',
        storage: createJSONStorage(() => localStorage),
        // Only persist user preferences and theme
        partialize: (state) => ({
          auth: {
            accessToken: state.auth.accessToken,
          },
          ui: {
            theme: state.ui.theme,
          },
        }),
      }
    ),
    {
      name: 'HireWireStore',
    }
  )
);

// ==================== SELECTORS ====================

// Auth selectors
export const useUser = () => useAppStore((state) => state.auth.user);
export const useIsAuthenticated = () => useAppStore((state) => state.auth.isAuthenticated);

// Profile selectors
export const useProfile = () => useAppStore((state) => state.profile.current);

// Matches selectors
export const useDailyMatches = () => useAppStore((state) => state.matches.daily);
export const useCurrentMatch = () => {
  const matches = useAppStore((state) => state.matches.daily);
  const index = useAppStore((state) => state.matches.currentIndex);
  return matches[index] || null;
};

// Conversations selectors
export const useConversations = () => useAppStore((state) => state.conversations.list);
export const useActiveConversation = () => useAppStore((state) => state.conversations.active);

// Sync selectors
export const useSyncStatus = () => useAppStore((state) => state.sync);
export const useIsOnline = () => useAppStore((state) => state.sync.isOnline);

// UI selectors
export const useTheme = () => useAppStore((state) => state.ui.theme);
export const useNotifications = () => useAppStore((state) => state.ui.notifications);

// Gamification selectors
export const useGamification = () => useAppStore((state) => state.gamification);
export const useLevel = () => useAppStore((state) => state.gamification?.level || 1);
export const useXP = () => useAppStore((state) => state.gamification?.xp || 0);

// AI selectors
export const useAIConversations = () => useAppStore((state) => state.ai.conversations);
export const useActiveAIConversation = () => {
  const conversations = useAppStore((state) => state.ai.conversations);
  const activeId = useAppStore((state) => state.ai.activeConversationId);
  return conversations.find(c => c.id === activeId) || null;
};
export const useAIMessages = (conversationId: string) => useAppStore((state) => state.ai.messages[conversationId] || []);
export const useIsAIStreaming = () => useAppStore((state) => state.ai.isStreaming);
export const useAISuggestions = () => useAppStore((state) => state.ai.suggestions);

export default useAppStore;
