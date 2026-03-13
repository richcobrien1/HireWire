'use client';

import React, { useEffect, useState } from 'react';
import { checkAllSections, getScoreColor, getScoreBgColor } from '@/lib/utils/ats-section-checker';
import { analyzeResumeWithAI, getPriorityColor, getPriorityBgColor } from '@/lib/utils/ai-ats-analyzer';
import { runFinalVerification, getStatusColor, getStatusBgColor, getConfidenceColor } from '@/lib/utils/ats-final-verifier';

interface ATSCheckerProps {
  resumeData: any;
}

export default function ATSChecker({ resumeData }: ATSCheckerProps) {
  const [activeTab, setActiveTab] = useState<'sections' | 'ai' | 'final'>('sections');
  const [sectionResults, setSectionResults] = useState<any>(null);
  const [aiResults, setAIResults] = useState<any>(null);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Check if resume has meaningful data
  const hasMinimumData = () => {
    // Check for basic contact info
    const hasName = resumeData.personalInfo?.name && 
                    resumeData.personalInfo.name !== 'Your Name' &&
                    resumeData.personalInfo.name.length > 2;
    
    const hasEmail = resumeData.personalInfo?.emails && 
                     resumeData.personalInfo.emails.length > 0;
    
    // Check for at least some content
    const hasSkills = Object.keys(resumeData.technicalSkills || {}).length > 0;
    const hasExperience = (resumeData.workExperience?.length || 0) > 0;
    const hasSummary = resumeData.profileSummary && 
                       resumeData.profileSummary !== 'Click "Import Text/File" to load your resume' &&
                       resumeData.profileSummary.length > 20;
    
    // Need at least name + email + one section with content
    return hasName && hasEmail && (hasSkills || hasExperience || hasSummary);
  };

  const dataReady = hasMinimumData();

  useEffect(() => {
    if (dataReady) {
      analyzeSections();
    }
  }, [resumeData, dataReady]);

  const analyzeSections = () => {
    const results = checkAllSections(resumeData);
    setSectionResults(results);
  };

  const runAIAnalysis = async () => {
    setLoading(true);
    setActiveTab('ai');
    try {
      const results = await analyzeResumeWithAI(resumeData);
      setAIResults(results);
    } catch (error) {
      console.error('AI Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const runFinalCheck = async () => {
    setLoading(true);
    setActiveTab('final');
    try {
      const results = await runFinalVerification(resumeData);
      setFinalResults(results);
    } catch (error) {
      console.error('Final verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="text-4xl">🤖</div>
          <div>
            <h2 className="text-2xl font-bold">ATS Compliance Analysis</h2>
            <p className="text-blue-100 text-sm">3-Tier Verification System</p>
          </div>
        </div>
      </div>

      {/* Waiting State - No Resume Data */}
      {!dataReady && (
        <div className="p-12 text-center">
          <div className="text-8xl mb-6 animate-pulse">📄</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            Waiting for Resume Import
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Click the <span className="font-semibold text-blue-600">"📥 Import Text/File"</span> button 
            above to upload your resume and start ATS compliance analysis.
          </p>
          <div className="bg-blue-50 rounded-lg p-6 max-w-lg mx-auto border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">What this analysis will provide:</h4>
            <ul className="text-sm text-blue-800 space-y-2 text-left">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📊</span>
                <span><strong>Section-by-Section Analysis</strong> - Detailed scoring for each resume section with specific improvement recommendations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">🧠</span>
                <span><strong>AI Deep Analysis</strong> - Intelligent insights on strengths, weaknesses, and competitive positioning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✅</span>
                <span><strong>Final Verification</strong> - Comprehensive readiness check with submission readiness score</span>
              </li>
            </ul>
          </div>
          <div className="mt-6 text-xs text-gray-500">
            <p>Supports .txt, .md, and .docx formats • Completely private • No data stored</p>
          </div>
        </div>
      )}

      {/* Tab Navigation - Only show when data is ready */}
      {dataReady && (
        <>
          <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('sections')}
          className={`flex-1 py-3 px-4 font-semibold ${
            activeTab === 'sections'
              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          📊 Section Analysis
        </button>
        <button
          onClick={() => {
            if (!aiResults) runAIAnalysis();
            else setActiveTab('ai');
          }}
          className={`flex-1 py-3 px-4 font-semibold ${
            activeTab === 'ai'
              ? 'bg-purple-50 text-purple-600 border-b-2 border-purple-600'
              : 'text-gray-600 hover:bg-gray50'
          }`}
        >
          🧠 AI Deep Analysis
        </button>
        <button
          onClick={() => {
            if (!finalResults) runFinalCheck();
            else setActiveTab('final');
          }}
          className={`flex-1 py-3 px-4 font-semibold ${
            activeTab === 'final'
              ? 'bg-green-50 text-green-600 border-b-2 border-green-600'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          ✅ Final Verification
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Analyzing resume...</span>
          </div>
        )}

        {!loading && activeTab === 'sections' && sectionResults && (
          <SectionAnalysis results={sectionResults} />
        )}

        {!loading && activeTab === 'ai' && aiResults && (
          <AIAnalysis results={aiResults} />
        )}

        {!loading && activeTab === 'final' && finalResults && (
          <FinalVerification results={finalResults} />
        )}
      </div>
      </>
      )}
    </div>
  );
}

// Section Analysis Component
function SectionAnalysis({ results }: { results: any }) {
  const sections = [
    { key: 'contact', name: 'Contact Information', icon: '📧', weight: '15%' },
    { key: 'summary', name: 'Profile Summary', icon: '📝', weight: '15%' },
    { key: 'skills', name: 'Technical Skills', icon: '⚙️', weight: '20%' },
    { key: 'experience', name: 'Work Experience', icon: '💼', weight: '30%' },
    { key: 'education', name: 'Education', icon: '🎓', weight: '10%' },
    { key: 'certifications', name: 'Certifications', icon: '🏅', weight: '5%' },
    { key: 'formatting', name: 'Formatting', icon: '📐', weight: '5%' }
  ];

  return (
    <div className="space-y-4">
      {/* Overall Score */}
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border-2 border-blue-300">
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-6xl font-bold ${getScoreColor(results.overallScore)}`}>
              {results.overallScore}
            </div>
            <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold">
              Grade: {results.overallGrade}
            </div>
          </div>
          <div className="text-7xl">
            {results.overallGrade === 'A+' && '🌟'}
            {results.overallGrade === 'A' && '✨'}
            {results.overallGrade.startsWith('B') && '👍'}
            {results.overallGrade === 'C' && '⚠️'}
            {results.overallGrade === 'D' && '😐'}
            {results.overallGrade === 'F' && '❌'}
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded-lg">
          <p className="text-sm font-semibold text-gray-700">
            {results.readyForSubmission ? (
              <span className="text-green-600">✅ Ready for submission!</span>
            ) : (
              <span className="text-orange-600">⚠️ Needs improvements before submitting</span>
            )}
          </p>
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="space-y-3">
        {sections.map((section) => {
          const sectionData = results[section.key];
          if (!sectionData) return null;

          return (
            <details key={section.key} className="group">
              <summary className={`cursor-pointer list-none p-4 rounded-lg border-2 ${getScoreBgColor(sectionData.score)} border-gray-200 hover:border-gray-300 transition-colors`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-800">{section.name}</div>
                      <div className="text-xs text-gray-500">Weight: {section.weight}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-3xl font-bold ${getScoreColor(sectionData.score)}`}>
                      {sectionData.score}
                    </div>
                    <div className="text-gray-400 group-open:rotate-90 transition-transform">▶</div>
                  </div>
                </div>
              </summary>

              <div className="mt-2 p-4 bg-gray-50 rounded-lg space-y-3">
                {sectionData.issues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-800 text-sm mb-2">❌ Issues:</h4>
                    <ul className="space-y-1">
                      {sectionData.issues.map((issue: string, idx: number) => (
                        <li key={idx} className="text-sm text-red-700">• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sectionData.warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-orange-800 text-sm mb-2">⚠️ Warnings:</h4>
                    <ul className="space-y-1">
                      {sectionData.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="text-sm text-orange-700">• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {sectionData.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-800 text-sm mb-2">💡 Recommendations:</h4>
                    <ul className="space-y-1">
                      {sectionData.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="text-sm text-blue-700">• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// AI Analysis Component
function AIAnalysis({ results }: { results: any }) {
  return (
    <div className="space-y-4">
      {/* Overall Assessment */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-300">
        <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
          <span className="text-2xl">🧠</span>
          AI Overall Assessment
        </h3>
        <p className="text-gray-700 leading-relaxed">{results.overallAssessment}</p>
      </div>

      {/* Key Strengths */}
      {results.keyStrengths.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
          <h4 className="font-bold text-green-800 mb-3">💪 Key Strengths</h4>
          <ul className="space-y-2">
            {results.keyStrengths.map((strength: string, idx: number) => (
              <li key={idx} className="text-sm text-green-700 flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critical Issues */}
      {results.criticalIssues.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
          <h4 className="font-bold text-red-800 mb-3">🚨 Critical Issues</h4>
          <ul className="space-y-2">
            {results.criticalIssues.map((issue: string, idx: number) => (
              <li key={idx} className="text-sm text-red-700">• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Suggestions */}
      {results.improvementSuggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h4 className="font-bold text-blue-800 mb-3">🎯 Improvement Suggestions</h4>
          <div className="space-y-2">
            {results.improvementSuggestions.map((sugg: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2">
                <span className={`text-xs px-2 py-1 rounded font-semibold ${getPriorityBgColor(sugg.priority)} ${getPriorityColor(sugg.priority)}`}>
                  {sugg.priority.toUpperCase()}
                </span>
                <div>
                  <div className="text-xs font-semibold text-gray-600">[{sugg.section}]</div>
                  <div className="text-sm text-gray-700">{sugg.suggestion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive Edge */}
      {results.competitiveEdge.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-500">
          <h4 className="font-bold text-yellow-800 mb-3">⭐ Competitive Edge</h4>
          <ul className="space-y-1">
            {results.competitiveEdge.map((edge: string, idx: number) => (
              <li key={idx} className="text-sm text-yellow-700">• {edge}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Red Flags */}
      {results.redFlags.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <h4 className="font-bold text-orange-800 mb-3">🚩 Potential Red Flags</h4>
          <ul className="space-y-1">
            {results.redFlags.map((flag: string, idx: number) => (
              <li key={idx} className="text-sm text-orange-700">• {flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Final Verification Component
function FinalVerification({ results }: { results: any }) {
  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`rounded-lg p-6 border-2 ${getStatusBgColor(results.overallStatus)} ${results.overallStatus === 'READY' ? 'border-green-400' : results.overallStatus === 'NEEDS_WORK' ? 'border-yellow-400' : 'border-red-400'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className={`text-5xl font-bold ${getStatusColor(results.overallStatus)}`}>
              {results.overallStatus.replace('_', ' ')}
            </div>
            <div className={`text-sm font-semibold mt-1 ${getConfidenceColor(results.confidence)}`}>
              {results.confidence.toUpperCase()} CONFIDENCE
            </div>
          </div>
          <div className="text-7xl">
            {results.overallStatus === 'READY' && '🚀'}
            {results.overallStatus === 'NEEDS_WORK' && '🔧'}
            {results.overallStatus === 'CRITICAL_ISSUES' && '⛔'}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{results.readinessScore}</div>
            <div className="text-xs text-gray-600">Readiness Score</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{results.estimatedATSPassRate}%</div>
            <div className="text-xs text-gray-600">Est. ATS Pass Rate</div>
          </div>
          <div className="bg-white rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{results.estimatedInterviewChance}%</div>
            <div className="text-xs text-gray-600">Interview Chance</div>
          </div>
        </div>
      </div>

      {/* Must Fix */}
      {results.mustFixBeforeSubmitting.length > 0 && (
        <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-600">
          <h4 className="font-bold text-red-900 mb-3 flex items-center gap-2">
            <span>🚫</span>
            Must Fix Before Submitting
          </h4>
          <ul className="space-y-2">
            {results.mustFixBeforeSubmitting.map((item: string, idx: number) => (
              <li key={idx} className="text-sm text-red-800">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Strongly Recommended */}
      {results.stronglyRecommended.length > 0 && (
        <div className="bg-orange-50 rounded-lg p-4 border-l-4 border-orange-500">
          <h4 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
            <span>⚡</span>
            Strongly Recommended
          </h4>
          <ul className="space-y-2">
            {results.stronglyRecommended.map((item: string, idx: number) => (
              <li key={idx} className="text-sm text-orange-800">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Nice to Have */}
      {results.niceToHave.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
          <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span>💡</span>
            Nice to Have
          </h4>
          <ul className="space-y-1">
            {results.niceToHave.map((item: string, idx: number) => (
              <li key={idx} className="text-sm text-blue-700">• {item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-bold text-gray-900 mb-3">📋 Pre-Submission Checklist</h4>
        <div className="space-y-2">
          {results.checklist.map((item: any, idx: number) => (
            <div key={idx} className="flex items-start gap-2">
              <div className={`mt-0.5 ${item.checked ? 'text-green-600' : 'text-gray-400'}`}>
                {item.checked ? '✅' : '☐'}
              </div>
              <div className="flex-1">
                <div className="text-sm text-gray-800">{item.item}</div>
                <div className={`text-xs ${item.severity === 'critical' ? 'text-red-600' : item.severity === 'important' ? 'text-orange-600' : 'text-blue-600'}`}>
                  {item.severity}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
