'use client';

import React, { useState } from 'react';
import { 
  matchResumeToJob, 
  getMatchScoreColor, 
  getMatchProgressColor 
} from '@/lib/utils/job-matcher';

interface JobMatcherProps {
  resumeData: any;
}

export default function JobMatcher({ resumeData }: JobMatcherProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [matchResult, setMatchResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    if (!jobDescription.trim()) return;

    setIsAnalyzing(true);
    
    // Simulate brief analysis delay for better UX
    setTimeout(() => {
      const result = matchResumeToJob(resumeData, jobDescription);
      setMatchResult(result);
      setIsAnalyzing(false);
    }, 800);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">🎯</div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Job Match Analyzer</h2>
          <p className="text-gray-600 text-sm">AI-powered compatibility score</p>
        </div>
      </div>

      {/* Job Description Input */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Paste Job Description
        </label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the full job description here to analyze your resume compatibility..."
          className="w-full h-40 p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none text-sm text-gray-900 bg-white"
        />
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!jobDescription.trim() || isAnalyzing}
        className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
          !jobDescription.trim() || isAnalyzing
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg'
        }`}
      >
        {isAnalyzing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Analyzing...
          </span>
        ) : (
          '🚀 Analyze Match Score'
        )}
      </button>

      {/* Results */}
      {matchResult && (
        <div className="mt-6 space-y-4 animate-fadeIn">
          {/* Score Gauge */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-300">
            <div className="text-center mb-4">
              <div className={`text-6xl font-bold ${getMatchScoreColor(matchResult.score)}`}>
                {matchResult.score}%
              </div>
              <div className="text-sm text-gray-600 mt-1 uppercase tracking-wide font-semibold">
                {matchResult.compatibilityLevel} Match
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${getMatchProgressColor(matchResult.score)} transition-all duration-1000 ease-out`}
                style={{ width: `${matchResult.score}%` }}
              ></div>
            </div>
          </div>

          {/* Strengths */}
          {matchResult.strengths.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                <span>✅</span> Your Strengths
              </h3>
              <ul className="space-y-1">
                {matchResult.strengths.map((strength: string, idx: number) => (
                  <li key={idx} className="text-sm text-green-700">
                    • {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Matched Skills */}
          {matchResult.matchedSkills.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-800 mb-2">
                🎯 Matched Skills ({matchResult.matchedSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchResult.matchedSkills.map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-xs font-semibold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {matchResult.missingSkills.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
              <h3 className="font-bold text-orange-800 mb-2">
                ⚠️ Skills to Add ({matchResult.missingSkills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {matchResult.missingSkills.slice(0, 10).map((skill: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-orange-200 text-orange-800 rounded-full text-xs font-semibold"
                  >
                    {skill}
                  </span>
                ))}
                {matchResult.missingSkills.length > 10 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-600 rounded-full text-xs">
                    +{matchResult.missingSkills.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Experience Analysis */}
          <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
            <h3 className="font-bold text-purple-800 mb-2">
              💼 Experience Analysis
            </h3>
            <div className="text-sm text-purple-700 space-y-1">
              <p>• Total Experience: <strong>{matchResult.experience.yearsOfExperience} years</strong></p>
              <p>• Relevant Experience: <strong>{matchResult.experience.hasRelevant ? 'Yes' : 'No'}</strong></p>
              {matchResult.experience.relevantRoles.length > 0 && (
                <p>• Matching Roles: <strong>{matchResult.experience.relevantRoles.join(', ')}</strong></p>
              )}
            </div>
          </div>

          {/* Recommendations */}
          {matchResult.recommendations.length > 0 && (
            <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
              <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <span>💡</span> Recommendations
              </h3>
              <ul className="space-y-1">
                {matchResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="text-sm text-yellow-700">
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
