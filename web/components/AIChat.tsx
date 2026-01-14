'use client';

/**
 * AI Chat Component
 * Real-time conversational interface with streaming responses
 */

import React, { useState, useRef, useEffect } from 'react';
import useAppStore, { useAIMessages, useIsAIStreaming } from '@/lib/store';
import type { AIConversation } from '@/lib/types';

interface AIChatProps {
  conversationId: string;
  className?: string;
}

export default function AIChat({ conversationId, className = '' }: AIChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const messages = useAIMessages(conversationId);
  const isStreaming = useIsAIStreaming();
  const { sendAIMessage, rateAIMessage } = useAppStore();
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Auto-focus input
  useEffect(() => {
    if (!isStreaming) {
      inputRef.current?.focus();
    }
  }, [isStreaming]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isStreaming) return;
    
    const messageText = input.trim();
    setInput('');
    
    try {
      await sendAIMessage(conversationId, messageText);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  const handleRate = async (messageId: string, helpful: boolean) => {
    try {
      await rateAIMessage(messageId, { helpful });
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };
  
  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="text-sm mt-2">Ask me anything about your career, matches, or resume!</p>
          </div>
        )}
        
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              {/* Message Content */}
              <div className="whitespace-pre-wrap break-words">
                {message.content}
                {message.streaming && (
                  <span className="inline-block ml-1 w-2 h-4 bg-current animate-pulse" />
                )}
              </div>
              
              {/* Timestamp */}
              <div
                className={`text-xs mt-1 ${
                  message.role === 'user'
                    ? 'text-blue-200'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              
              {/* Feedback Buttons (Assistant messages only) */}
              {message.role === 'assistant' && !message.streaming && (
                <div className="flex items-center gap-2 mt-2">
                  {!message.feedback && (
                    <>
                      <button
                        onClick={() => handleRate(message.id, true)}
                        className="text-xs px-2 py-1 rounded bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors"
                        title="Helpful"
                      >
                        👍 Helpful
                      </button>
                      <button
                        onClick={() => handleRate(message.id, false)}
                        className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors"
                        title="Not helpful"
                      >
                        👎 Not helpful
                      </button>
                    </>
                  )}
                  {message.feedback && (
                    <span className="text-xs text-gray-500">
                      {message.feedback.helpful ? '✓ Marked helpful' : '✗ Marked not helpful'}
                    </span>
                  )}
                </div>
              )}
              
              {/* Metadata (if available) */}
              {message.metadata?.modelUsed && (
                <div className="text-xs text-gray-500 mt-1">
                  Model: {message.metadata.modelUsed}
                  {message.metadata.tokensUsed && ` • ${message.metadata.tokensUsed} tokens`}
                </div>
              )}
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="border-t dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? "AI is responding..." : "Type your message..."}
            disabled={isStreaming}
            className="flex-1 resize-none rounded-lg border dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '200px',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </span>
            ) : (
              'Send'
            )}
          </button>
        </form>
        
        <div className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
