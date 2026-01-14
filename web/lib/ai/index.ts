/**
 * AI Service - RAG Client for HireWire Career Assistant
 * 
 * Handles communication with the AI Agent microservice including:
 * - Chat conversations with streaming
 * - Match explanations
 * - Resume analysis
 * - Career suggestions
 */

import type {
  AIConversation,
  AIMessage,
  AISuggestion,
  MatchExplanation,
  ResumeAnalysis,
  JobComparison,
  AIStreamChunk,
} from '../types';

const AI_API_BASE = process.env.NEXT_PUBLIC_AI_API_URL || 'http://localhost:8003';

export class AIService {
  private static instance: AIService;
  private abortControllers: Map<string, AbortController> = new Map();

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  // ==================== CHAT METHODS ====================

  /**
   * Start a new AI conversation
   */
  async startConversation(
    type: AIConversation['type'],
    metadata?: AIConversation['metadata']
  ): Promise<string> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ type, metadata }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start conversation: ${response.statusText}`);
      }

      const data = await response.json();
      return data.conversationId;
    } catch (error) {
      console.error('Error starting AI conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message with streaming response
   */
  async sendMessage(
    conversationId: string,
    message: string,
    onChunk: (chunk: string) => void,
    onComplete?: (fullMessage: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    const abortController = new AbortController();
    this.abortControllers.set(conversationId, abortController);

    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ conversationId, message }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullMessage = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          onComplete?.(fullMessage);
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onComplete?.(fullMessage);
              return;
            }

            try {
              const parsed: AIStreamChunk = JSON.parse(data);
              onChunk(parsed.content);
              fullMessage += parsed.content;
            } catch (e) {
              console.warn('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Message streaming aborted');
      } else {
        console.error('Error sending message:', error);
        onError?.(error as Error);
        throw error;
      }
    } finally {
      this.abortControllers.delete(conversationId);
    }
  }

  /**
   * Cancel streaming message
   */
  cancelMessage(conversationId: string): void {
    const controller = this.abortControllers.get(conversationId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(conversationId);
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string): Promise<{
    conversation: AIConversation;
    messages: AIMessage[];
  }> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/chat/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get conversation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting conversation:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for current user
   */
  async getConversations(type?: AIConversation['type']): Promise<AIConversation[]> {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);

      const response = await fetch(`${AI_API_BASE}/api/ai/chat?${params}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get conversations: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  /**
   * Rate a message
   */
  async rateMessage(
    messageId: string,
    feedback: AIMessage['feedback']
  ): Promise<void> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/chat/message/${messageId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(feedback),
      });

      if (!response.ok) {
        throw new Error(`Failed to rate message: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error rating message:', error);
      throw error;
    }
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/chat/${conversationId}/archive`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to archive conversation: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error archiving conversation:', error);
      throw error;
    }
  }

  // ==================== MATCH EXPLANATION ====================

  /**
   * Get AI explanation for a match
   */
  async explainMatch(matchId: string): Promise<MatchExplanation> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/explain/${matchId}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get match explanation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error explaining match:', error);
      throw error;
    }
  }

  /**
   * Compare multiple jobs
   */
  async compareJobs(jobIds: string[]): Promise<JobComparison> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ jobIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to compare jobs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error comparing jobs:', error);
      throw error;
    }
  }

  // ==================== RESUME ANALYSIS ====================

  /**
   * Analyze resume
   */
  async analyzeResume(
    resumeId: string,
    targetRoles?: string[]
  ): Promise<ResumeAnalysis> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/resume/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ resumeId, targetRoles }),
      });

      if (!response.ok) {
        throw new Error(`Failed to analyze resume: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  }

  /**
   * Get resume improvement suggestions
   */
  async getResumeSuggestions(resumeId: string): Promise<AISuggestion[]> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/resume/${resumeId}/suggestions`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get resume suggestions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting resume suggestions:', error);
      throw error;
    }
  }

  // ==================== SUGGESTIONS ====================

  /**
   * Get personalized suggestions
   */
  async getSuggestions(
    type?: AISuggestion['type'],
    limit: number = 10
  ): Promise<AISuggestion[]> {
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (type) params.append('type', type);

      const response = await fetch(`${AI_API_BASE}/api/ai/suggestions?${params}`, {
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get suggestions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting suggestions:', error);
      throw error;
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/suggestions/${suggestionId}/dismiss`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss suggestion: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
      throw error;
    }
  }

  /**
   * Mark suggestion action as taken
   */
  async takeSuggestionAction(suggestionId: string): Promise<void> {
    try {
      const response = await fetch(`${AI_API_BASE}/api/ai/suggestions/${suggestionId}/action`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to mark suggestion action: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error marking suggestion action:', error);
      throw error;
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Get auth token from store or localStorage
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Try to get from localStorage (set by auth slice)
    const authData = localStorage.getItem('hirewire-auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.state?.accessToken || null;
      } catch (e) {
        console.error('Failed to parse auth data:', e);
      }
    }
    
    return null;
  }

  /**
   * Check if AI service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${AI_API_BASE}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('AI service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const aiService = AIService.getInstance();

// ==================== HELPER FUNCTIONS ====================

/**
 * Format match explanation for display
 */
export function formatMatchExplanation(explanation: MatchExplanation): string {
  const { overallScore, recommendation, breakdown, nextSteps } = explanation;
  
  let formatted = `**Match Score: ${overallScore}%** (${recommendation.replace('_', ' ').toUpperCase()})\n\n`;
  formatted += `${explanation.explanation}\n\n`;
  
  formatted += '**Breakdown:**\n';
  breakdown.forEach(component => {
    formatted += `- **${component.component}** (${component.score}%): ${component.explanation}\n`;
  });
  
  if (nextSteps.length > 0) {
    formatted += '\n**Next Steps:**\n';
    nextSteps.forEach(step => {
      formatted += `- ${step}\n`;
    });
  }
  
  return formatted;
}

/**
 * Format resume analysis for display
 */
export function formatResumeAnalysis(analysis: ResumeAnalysis): string {
  const { overallScore, summary, sections, keywords, atsCompatibility } = analysis;
  
  let formatted = `**Overall Score: ${overallScore}/100**\n\n`;
  formatted += `${summary}\n\n`;
  
  formatted += '**Section Feedback:**\n';
  sections.forEach(section => {
    formatted += `- **${section.name}** (${section.score}/100): ${section.feedback}\n`;
  });
  
  formatted += `\n**ATS Compatibility: ${atsCompatibility.score}/100**\n`;
  if (atsCompatibility.issues.length > 0) {
    formatted += 'Issues:\n';
    atsCompatibility.issues.forEach(issue => {
      formatted += `- ${issue}\n`;
    });
  }
  
  formatted += `\n**Keywords Missing:** ${keywords.missing.join(', ')}\n`;
  formatted += `**Recommended:** ${keywords.recommended.join(', ')}\n`;
  
  return formatted;
}

/**
 * Parse streaming SSE data
 */
export function parseSSEChunk(data: string): AIStreamChunk | null {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.warn('Failed to parse SSE chunk:', e);
    return null;
  }
}
