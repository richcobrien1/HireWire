/**
 * HireWire Type Definitions
 * Maps frontend state to backend data models
 * Created: December 15, 2025
 */

// ==================== USER & AUTHENTICATION ====================

export interface User {
  id: string;
  email: string;
  role: 'candidate' | 'company' | 'recruiter';
  createdAt: number;
  lastLoginAt: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ==================== CANDIDATE PROFILE ====================

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  title?: string;
  summary?: string;
  
  // Experience
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: Skill[];
  
  // Career context (17 fields)
  careerContext: CareerContext;
  
  // Metadata
  validationScore: number;
  profileCompleteness: number;
  avatarUrl?: string;
  resumeUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  
  // Sync metadata
  createdAt: number;
  updatedAt: number;
  lastSyncedAt: number;
  version: number;
  syncStatus: SyncStatus;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  title: string;
  location?: string;
  startDate: string; // ISO date
  endDate?: string; // ISO date or null for current
  isCurrent: boolean;
  description?: string;
  technologies: string[];
  achievements: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: number;
  achievements: string[];
}

export interface Skill {
  name: string;
  category: 'language' | 'framework' | 'tool' | 'soft-skill' | 'domain';
  proficiency: 'learning' | 'working' | 'expert';
  yearsOfExperience?: number;
  lastUsed?: string; // ISO date
  verified: boolean;
}

// ==================== CAREER CONTEXT ====================

export interface CareerContext {
  // Past reflection
  pastMotivations?: string[];
  proudestAchievements?: string[];
  lessonsLearned?: string;
  careerPivots?: string;
  
  // Present priorities
  currentInterests?: string[];
  idealWorkEnvironment?: string;
  learningPriorities?: string[];
  dealBreakers?: string[];
  primaryMotivations?: string[];
  
  // Future vision
  careerTrajectory?: string;
  fiveYearGoals?: string[];
  dreamCompanies?: string[];
  skillsToDevelop?: string[];
  longTermVision?: string;
  
  // Additional fields from questionnaire
  shortTermGoals?: string;
  longTermGoals?: string;
  dreamRole?: string;
  workStylePreferences?: string[];
  companyCulturePreferences?: string[];
  teamSizePreference?: string;
  learningStyle?: string;
  mentorshipImportance?: number;
  coreValues?: string[];
  impactAreas?: string[];
  socialResponsibilityImportance?: number;
  careerChangeOpenness?: number;
  industryPivotInterest?: string[];
  leadershipInterest?: number;
  locationFlexibility?: number;
  remotePreference?: string;
  relocationWillingness?: number;
}

// ==================== JOB & COMPANY ====================

export interface Job {
  id: string;
  companyId: string;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  
  // Details
  location: string;
  remoteType: 'remote' | 'hybrid' | 'onsite';
  employmentType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'staff' | 'principal' | 'executive';
  
  // Compensation
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  equity?: string;
  benefits: string[];
  
  // Requirements
  requiredSkills: string[];
  preferredSkills: string[];
  educationRequirement?: string;
  yearsExperienceMin?: number;
  yearsExperienceMax?: number;
  
  // Career context
  growthOpportunities?: string[];
  learningOpportunities?: string[];
  teamCulture?: string;
  impactAreas?: string[];
  
  // Metadata
  status: 'draft' | 'active' | 'paused' | 'closed';
  viewCount: number;
  applicationCount: number;
  postedAt: number;
  expiresAt?: number;
  
  // Sync metadata
  lastSyncedAt: number;
  syncStatus: SyncStatus;
}

export interface Company {
  id: string;
  name: string;
  description: string;
  industry: string;
  size: string; // e.g., '1-10', '11-50', '51-200', etc.
  founded?: number;
  
  // Contact
  website?: string;
  logoUrl?: string;
  location: string;
  
  // Culture
  culture: string[];
  values: string[];
  perks: string[];
  
  // Metadata
  activeJobs: number;
  createdAt: number;
  updatedAt: number;
}

// ==================== MATCHING & SWIPING ====================

export interface Match {
  id: string;
  candidateId: string;
  jobId: string;
  
  // Match details
  matchScore: number; // 0-100
  matchBreakdown: MatchBreakdown;
  explanation?: string;
  
  // Status
  candidateSwipe?: 'left' | 'right';
  companySwipe?: 'left' | 'right';
  status: 'pending' | 'matched' | 'rejected' | 'expired';
  
  // Timestamps
  createdAt: number;
  matchedAt?: number;
  expiresAt?: number;
  
  // Populated data (for UI)
  job?: Job;
  company?: Company;
  candidate?: Profile;
  
  // Sync metadata
  lastSyncedAt: number;
  syncStatus: SyncStatus;
}

export interface MatchBreakdown {
  skillsMatch: number; // 0-30 (weighted 30%)
  careerFit: number; // 0-25 (weighted 25%)
  cultureFit: number; // 0-15 (weighted 15%)
  learningOpportunity: number; // 0-15 (weighted 15%)
  motivationAlignment: number; // 0-10 (weighted 10%)
  experienceLevel: number; // 0-5 (weighted 5%)
}

export interface SwipeHistory {
  id: string;
  userId: string;
  targetId: string;
  targetType: 'job' | 'candidate';
  direction: 'left' | 'right';
  timestamp: number;
  
  // Sync metadata
  synced: boolean;
  syncedAt?: number;
  localId?: string; // Temporary ID before server assigns
}

export interface DailyMatchSet {
  date: string; // YYYY-MM-DD
  matches: Match[];
  totalCount: number;
  viewedCount: number;
  swipedCount: number;
}

// ==================== MESSAGING ====================

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  recipientId: string;
  content: string;
  
  // Metadata
  timestamp: number;
  readAt?: number;
  deliveredAt?: number;
  
  // Attachments (future)
  attachments?: Attachment[];
  
  // Sync metadata
  localId?: string; // Temp ID before server sync
  syncStatus: SyncStatus;
  retryCount: number;
}

export interface Conversation {
  matchId: string;
  match: Match;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
  lastActivityAt: number;
  
  // UI state
  isTyping?: boolean;
  draftMessage?: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'file' | 'link';
  url: string;
  name: string;
  size?: number;
  mimeType?: string;
}

// ==================== GAMIFICATION ====================

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'profile' | 'matching' | 'social' | 'milestone';
  xpReward: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface UnlockedAchievement {
  achievementId: string;
  userId: string;
  unlockedAt: number;
  achievement?: Achievement; // Populated
  
  // Sync
  synced: boolean;
  syncedAt?: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  requirement: QuestRequirement;
  reward: QuestReward;
  expiresAt: number;
}

export interface QuestRequirement {
  action: 'swipe' | 'match' | 'message' | 'profile_update' | 'login';
  target: number;
  current: number;
}

export interface QuestReward {
  xp: number;
  credits?: number;
  achievement?: string;
}

export interface GamificationState {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  achievements: UnlockedAchievement[];
  activeQuests: Quest[];
  streak: number;
  lastActiveDate: string; // YYYY-MM-DD
}

// ==================== USER PREFERENCES ====================

export interface UserPreferences {
  userId: string;
  
  // UI preferences
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  
  // Notification preferences
  notifications: {
    email: NotificationSettings;
    push: NotificationSettings;
    inApp: NotificationSettings;
  };
  
  // Job preferences
  jobPreferences: {
    remoteType: ('remote' | 'hybrid' | 'onsite')[];
    locations: string[];
    salaryMin?: number;
    experienceLevels: string[];
    industries: string[];
  };
  
  // Privacy
  privacy: {
    profileVisibility: 'public' | 'private' | 'connections-only';
    showOnlineStatus: boolean;
    showReadReceipts: boolean;
  };
  
  // Updated
  updatedAt: number;
}

export interface NotificationSettings {
  newMatch: boolean;
  newMessage: boolean;
  profileView: boolean;
  achievement: boolean;
  questComplete: boolean;
  dailyReminder: boolean;
}

// ==================== SYNC & STORAGE ====================

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'conflict' | 'error';

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity: 'profile' | 'message' | 'swipe' | 'preference' | 'achievement';
  entityId: string;
  payload: any;
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Retry logic
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  nextRetryAt?: number;
  
  // Status
  status: 'pending' | 'processing' | 'failed' | 'completed';
  error?: string;
}

export interface SyncMetadata {
  key: string;
  value: any;
  updatedAt: number;
}

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  lastSuccessfulSyncAt: number | null;
  pendingCount: number;
  failedCount: number;
  errors: SyncError[];
  progress?: SyncProgress;
}

export interface SyncError {
  id: string;
  entity: string;
  entityId: string;
  operation: string;
  error: string;
  timestamp: number;
  retryable: boolean;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  current?: string; // Current entity being synced
}

// ==================== UI STATE ====================

export interface UIState {
  // Theme
  theme: 'light' | 'dark';
  
  // Modals
  modals: {
    [key: string]: boolean;
  };
  
  // Notifications (toast)
  notifications: UINotification[];
  
  // Loading states
  loading: {
    [key: string]: boolean;
  };
  
  // Navigation
  currentRoute?: string;
  previousRoute?: string;
}

export interface UINotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number; // ms, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  createdAt: number;
}

// ==================== API RESPONSES ====================

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ==================== WEBSOCKET EVENTS ====================

export type WebSocketEvent = 
  | { type: 'match.new'; data: Match }
  | { type: 'match.expired'; data: { matchId: string } }
  | { type: 'message.new'; data: Message }
  | { type: 'message.read'; data: { messageId: string; readAt: number } }
  | { type: 'profile.viewed'; data: { viewerId: string; viewedAt: number } }
  | { type: 'achievement.unlocked'; data: UnlockedAchievement }
  | { type: 'sync.required'; data: { entities: string[] } }
  | { type: 'typing.start'; data: { matchId: string; userId: string } }
  | { type: 'typing.stop'; data: { matchId: string; userId: string } }
  | { type: 'ai.message'; data: AIMessage }
  | { type: 'ai.suggestion'; data: AISuggestion };

// ==================== AI & RAG ====================

export interface AIConversation {
  id: string;
  userId: string;
  type: 'career_coach' | 'match_explainer' | 'resume_feedback' | 'general';
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'archived';
  metadata?: {
    jobId?: string;
    matchId?: string;
    resumeId?: string;
    context?: Record<string, any>;
  };
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    contextUsed?: string[];
    modelUsed?: string;
    tokensUsed?: number;
    ragSources?: RAGSource[];
  };
  feedback?: {
    helpful: boolean;
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
  };
  streaming?: boolean;
}

export interface AISuggestion {
  id: string;
  userId: string;
  type: 'career_tip' | 'job_recommendation' | 'skill_suggestion' | 'interview_tip' | 'resume_improvement';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  actionTaken: boolean;
  metadata?: {
    relatedJobId?: string;
    relatedSkillId?: string;
    relatedMatchId?: string;
    actionUrl?: string;
  };
}

export interface RAGSource {
  id: string;
  type: 'career_context' | 'job_description' | 'skill' | 'conversation_history' | 'resume';
  content: string;
  relevanceScore: number;
  metadata?: Record<string, any>;
}

export interface QueryIntent {
  type: 'career_advice' | 'match_question' | 'resume_feedback' | 'job_inquiry' | 'general';
  entities: {
    jobId?: string;
    skillName?: string;
    companyName?: string;
    role?: string;
  };
  complexity: 'simple' | 'complex' | 'multi_turn';
  confidence: number;
}

export interface RAGContext {
  careerContext: RAGSource[];
  jobs: RAGSource[];
  skills: RAGSource[];
  conversationHistory: RAGSource[];
  resume?: RAGSource;
}

export interface MatchExplanation {
  matchId: string;
  overallScore: number;
  explanation: string;
  breakdown: {
    component: string;
    score: number;
    explanation: string;
    strengths: string[];
    improvements: string[];
  }[];
  recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
  nextSteps: string[];
}

export interface ResumeAnalysis {
  resumeId: string;
  overallScore: number;
  summary: string;
  sections: {
    name: string;
    score: number;
    feedback: string;
    suggestions: string[];
  }[];
  keywords: {
    present: string[];
    missing: string[];
    recommended: string[];
  };
  atsCompatibility: {
    score: number;
    issues: string[];
    fixes: string[];
  };
}

export interface JobComparison {
  jobs: {
    jobId: string;
    title: string;
    company: string;
    matchScore: number;
  }[];
  comparison: {
    category: string;
    winner: string;
    reasoning: string;
  }[];
  recommendation: string;
  rationale: string;
}

export interface AIStreamChunk {
  id: string;
  conversationId: string;
  content: string;
  done: boolean;
  metadata?: {
    tokensUsed?: number;
    modelUsed?: string;
  };
}

// ==================== CONFLICT RESOLUTION ====================

export interface Conflict<T = any> {
  id: string;
  entity: string;
  entityId: string;
  localVersion: T;
  serverVersion: T;
  localUpdatedAt: number;
  serverUpdatedAt: number;
  strategy: ConflictStrategy;
  resolvedVersion?: T;
  resolvedAt?: number;
}

export type ConflictStrategy = 
  | 'local-wins' 
  | 'server-wins' 
  | 'merge-fields' 
  | 'manual' 
  | 'keep-both';

// ==================== INDEXEDDB TYPES ====================

export interface DBSchema {
  profiles: Profile;
  matches: Match;
  messages: Message;
  jobs: Job;
  swipes: SwipeHistory;
  achievements: UnlockedAchievement;
  conversations: Conversation;
  syncQueue: SyncQueueItem;
  metadata: SyncMetadata;
  preferences: UserPreferences;
}

// ==================== UTILITY TYPES ====================

export type Timestamp = number; // Unix timestamp in milliseconds

export type ISO8601Date = string; // YYYY-MM-DD

export type ISO8601DateTime = string; // YYYY-MM-DDTHH:mm:ss.sssZ

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// ==================== EXPORT ALL ====================

export type {
  // Add any additional exports here
};
