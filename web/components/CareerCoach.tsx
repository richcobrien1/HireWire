'use client';

/**
 * Career Coach Component
 * AI-powered career guidance and advice
 */

import React, { useState, useEffect } from 'react';
import useAppStore, { useAIConversations, useProfile } from '@/lib/store';
import AIChat from './AIChat';
import type { AIConversation } from '@/lib/types';

export default function CareerCoach() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  const conversations = useAIConversations();
  const profile = useProfile();
  const { startAIConversation, getAIConversation } = useAppStore();
  
  // Filter career coach conversations
  const careerConversations = conversations.filter(c => c.type === 'career_coach' && c.status === 'active');
  
  // Load last active conversation
  useEffect(() => {
    if (careerConversations.length > 0 && !activeConversationId) {
      const lastConversation = careerConversations.sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      )[0];
      setActiveConversationId(lastConversation.id);
      getAIConversation(lastConversation.id);
    }
  }, [careerConversations.length, activeConversationId]);
  
  const handleStartNewConversation = async () => {
    setIsCreating(true);
    
    try {
      const conversationId = await startAIConversation('career_coach', {
        profileId: profile?.id,
        context: 'career_guidance',
      });
      setActiveConversationId(conversationId);
    } catch (error) {
      console.error('Failed to start conversation:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    await getAIConversation(conversationId);
  };
  
  return (
    <div className="flex h-full">
      {/* Sidebar - Conversation List */}
      <div className="w-64 border-r dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <button
            onClick={handleStartNewConversation}
            disabled={isCreating}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isCreating ? 'Starting...' : '+ New Conversation'}
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {careerConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No conversations yet
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {careerConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    activeConversationId === conversation.id
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : ''
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {conversation.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(conversation.lastMessageAt).toLocaleDateString()} • {conversation.messageCount} messages
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <>
            {/* Header */}
            <div className="border-b dark:border-gray-700 p-4">
              <h2 className="text-xl font-bold">Career Coach</h2>
              <p className="text-sm text-gray-500 mt-1">
                Get personalized career advice and guidance
              </p>
            </div>
            
            {/* Chat */}
            <AIChat conversationId={activeConversationId} className="flex-1" />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-4">💼</div>
              <h3 className="text-2xl font-bold mb-2">Welcome to Career Coach</h3>
              <p className="text-gray-500 mb-6">
                Get personalized career advice powered by AI. Ask me about:
              </p>
              <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2 mb-6">
                <li>✓ Career progression and next steps</li>
                <li>✓ Skill development recommendations</li>
                <li>✓ Interview preparation</li>
                <li>✓ Salary negotiation strategies</li>
                <li>✓ Work-life balance and career transitions</li>
              </ul>
              <button
                onClick={handleStartNewConversation}
                disabled={isCreating}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {isCreating ? 'Starting...' : 'Start Your First Conversation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
