'use client';

/**
 * AI Suggestions Widget
 * Displays personalized career tips and recommendations
 */

import React, { useEffect } from 'react';
import useAppStore, { useAISuggestions } from '@/lib/store';
import type { AISuggestion } from '@/lib/types';

export default function AISuggestionsWidget() {
  const suggestions = useAISuggestions();
  const { loadAISuggestions, dismissAISuggestion } = useAppStore();
  
  useEffect(() => {
    // Load suggestions on mount
    loadAISuggestions();
  }, []);
  
  const handleDismiss = async (suggestionId: string) => {
    try {
      await dismissAISuggestion(suggestionId);
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    }
  };
  
  const activeSuggestions = suggestions.filter(s => !s.dismissed);
  
  if (activeSuggestions.length === 0) {
    return null;
  }
  
  const getPriorityColor = (priority: AISuggestion['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400';
    }
  };
  
  const getTypeIcon = (type: AISuggestion['type']) => {
    switch (type) {
      case 'career_tip':
        return '💡';
      case 'job_recommendation':
        return '🎯';
      case 'skill_suggestion':
        return '📚';
      case 'interview_tip':
        return '🗣️';
      case 'resume_improvement':
        return '📝';
    }
  };
  
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <span>✨</span>
        AI Suggestions for You
      </h3>
      
      <div className="space-y-2">
        {activeSuggestions.slice(0, 5).map((suggestion) => (
          <div
            key={suggestion.id}
            className={`border rounded-lg p-4 ${getPriorityColor(suggestion.priority)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getTypeIcon(suggestion.type)}</span>
                  <h4 className="font-medium">{suggestion.title}</h4>
                </div>
                <p className="text-sm opacity-90">{suggestion.content}</p>
                
                {suggestion.metadata?.actionUrl && (
                  <a
                    href={suggestion.metadata.actionUrl}
                    className="text-sm font-medium underline mt-2 inline-block hover:opacity-80"
                  >
                    Take Action →
                  </a>
                )}
              </div>
              
              <button
                onClick={() => handleDismiss(suggestion.id)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
            
            <div className="flex items-center gap-3 mt-3 text-xs opacity-70">
              <span className="capitalize">{suggestion.priority} priority</span>
              <span>•</span>
              <span>{new Date(suggestion.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        ))}
      </div>
      
      {activeSuggestions.length > 5 && (
        <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          View all {activeSuggestions.length} suggestions →
        </button>
      )}
    </div>
  );
}
