/**
 * ATS Final Verifier - Comprehensive Pre-Submission Check
 * Combines rules-based checking + AI analysis for final readiness assessment
 */

import { checkAllSections, ATSSectionResults } from './ats-section-checker';
import { analyzeResumeWithAI, AIAnalysisResult } from './ai-ats-analyzer';

interface ResumeData {
  personalInfo: {
    name: string;
    emails: string[];
    phone: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
  profileSummary: string;
  technicalSkills: Record<string, string>;
  workExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
    achievements?: string[];
  }>;
  priorExperience?: Array<{
    title: string;
    company: string;
    duration: string;
    achievements?: string[];
  }>;
  education: {
    degree: string;
    field: string;
    institution: string;
    note?: string;
  };
  certifications?: string[];
  coreCompetencies?: string;
}

export interface FinalVerificationResult {
  // Overall Status
  overallStatus: 'READY' | 'NEEDS_WORK' | 'CRITICAL_ISSUES';
  readinessScore: number; // 0-100
  confidence: 'high' | 'medium' | 'low';
  
  // Section Analysis
  sectionAnalysis: ATSSectionResults;
  
  // AI Insights
  aiAnalysis: AIAnalysisResult;
  
  // Pre-Submission Checklist
  checklist: {
    item: string;
    checked: boolean;
    severity: 'critical' | 'important' | 'recommended';
  }[];
  
  // Final Recommendations
  mustFixBeforeSubmitting: string[];
  stronglyRecommended: string[];
  niceToHave: string[];
  
  // Prediction
  estimatedATSPassRate: number; // 0-100
  estimatedRecruitersReached: number;
  estimatedInterviewChance: number; // 0-100
}

/**
 * Run comprehensive final verification
 */
export async function runFinalVerification(
  resumeData: ResumeData,
  jobDescription?: string
): Promise<FinalVerificationResult> {
  
  // Run both analyzers in parallel
  const [sectionAnalysis, aiAnalysis] = await Promise.all([
    Promise.resolve(checkAllSections(resumeData)),
    analyzeResumeWithAI(resumeData, jobDescription)
  ]);

  // Build pre-submission checklist
  const checklist = buildChecklist(resumeData, sectionAnalysis);
  
  // Calculate readiness score (weighted combination)
  const readinessScore = Math.round(
    (sectionAnalysis.overallScore * 0.60) + // 60% from rules
    (aiAnalysis.industryAlignment.matchScore * 0.25) + // 25% from AI
    (checklist.filter(c => c.checked).length / checklist.length * 100 * 0.15) // 15% from checklist
  );

  // Determine overall status
  let overallStatus: 'READY' | 'NEEDS_WORK' | 'CRITICAL_ISSUES';
  if (readinessScore >= 85 && sectionAnalysis.readyForSubmission) {
    overallStatus = 'READY';
  } else if (readinessScore >= 70 || aiAnalysis.criticalIssues.length === 0) {
    overallStatus = 'NEEDS_WORK';
  } else {
    overallStatus = 'CRITICAL_ISSUES';
  }

  // Calculate confidence
  let confidence: 'high' | 'medium' | 'low';
  const criticalPassed = sectionAnalysis.contact.passed && 
                        sectionAnalysis.experience.passed &&
                        sectionAnalysis.skills.passed;
  if (criticalPassed && readinessScore >= 80) {
    confidence = 'high';
  } else if (readinessScore >= 65) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  // Categorize recommendations
  const mustFixBeforeSubmitting: string[] = [];
  const stronglyRecommended: string[] = [];
  const niceToHave: string[] = [];

  // From AI critical issues
  aiAnalysis.criticalIssues.forEach(issue => {
    mustFixBeforeSubmitting.push(issue);
  });

  // From section analysis
  if (!sectionAnalysis.contact.passed) {
    sectionAnalysis.contact.issues.forEach(issue => {
      mustFixBeforeSubmitting.push(`[Contact] ${issue}`);
    });
  }

  if (!sectionAnalysis.experience.passed) {
    sectionAnalysis.experience.issues.slice(0, 2).forEach(issue => {
      mustFixBeforeSubmitting.push(`[Experience] ${issue}`);
    });
  }

  // High priority AI suggestions
  aiAnalysis.improvementSuggestions
    .filter(s => s.priority === 'high')
    .forEach(s => {
      stronglyRecommended.push(`[${s.section}] ${s.suggestion}`);
    });

  // Medium priority
  aiAnalysis.improvementSuggestions
    .filter(s => s.priority === 'medium')
    .slice(0, 3)
    .forEach(s => {
      stronglyRecommended.push(`[${s.section}] ${s.suggestion}`);
    });

  // Low priority
  aiAnalysis.improvementSuggestions
    .filter(s => s.priority === 'low')
    .forEach(s => {
      niceToHave.push(`[${s.section}] ${s.suggestion}`);
    });

  // Add section recommendations
  [
    sectionAnalysis.contact,
    sectionAnalysis.summary,
    sectionAnalysis.skills,
    sectionAnalysis.experience,
    sectionAnalysis.education
  ].forEach((section, idx) => {
    const sectionName = ['Contact', 'Summary', 'Skills', 'Experience', 'Education'][idx];
    section.recommendations.slice(0, 2).forEach(rec => {
      niceToHave.push(`[${sectionName}] ${rec}`);
    });
  });

  // Calculate predictions
  const estimatedATSPassRate = calculateATSPassRate(sectionAnalysis, aiAnalysis);
  const estimatedRecruitersReached = Math.round(estimatedATSPassRate * 0.75); // 75% of pass rate
  const estimatedInterviewChance = calculateInterviewChance(
    readinessScore,
    aiAnalysis.keyStrengths.length,
    aiAnalysis.redFlags.length
  );

  return {
    overallStatus,
    readinessScore,
    confidence,
    sectionAnalysis,
    aiAnalysis,
    checklist,
    mustFixBeforeSubmitting: mustFixBeforeSubmitting.slice(0, 5), // Top 5
    stronglyRecommended: stronglyRecommended.slice(0, 5),
    niceToHave: niceToHave.slice(0, 5),
    estimatedATSPassRate,
    estimatedRecruitersReached,
    estimatedInterviewChance
  };
}

/**
 * Build pre-submission checklist
 */
function buildChecklist(
  resumeData: ResumeData,
  sectionAnalysis: ATSSectionResults
): Array<{
  item: string;
  checked: boolean;
  severity: 'critical' | 'important' | 'recommended';
}> {
  return [
    {
      item: 'Contact information complete (name, email, phone, location)',
      checked: sectionAnalysis.contact.score >= 80,
      severity: 'critical'
    },
    {
      item: 'Professional summary 50-150 words with keywords',
      checked: sectionAnalysis.summary.score >= 70,
      severity: 'critical'
    },
    {
      item: 'Technical skills categorized and comprehensive (15+ skills)',
      checked: sectionAnalysis.skills.score >= 75,
      severity: 'critical'
    },
    {
      item: 'Each job has 3-6 achievement bullets',
      checked: sectionAnalysis.experience.score >= 75,
      severity: 'critical'
    },
    {
      item: 'Achievements include quantifiable metrics (%, $, numbers)',
      checked: sectionAnalysis.experience.score >= 80,
      severity: 'important'
    },
    {
      item: 'Consistent date format throughout (Month YYYY)',
      checked: sectionAnalysis.formatting.score >= 80,
      severity: 'important'
    },
    {
      item: 'Education section complete (degree, field, institution)',
      checked: sectionAnalysis.education.score >= 70,
      severity: 'important'
    },
    {
      item: 'LinkedIn profile URL included',
      checked: !!resumeData.personalInfo.linkedin,
      severity: 'important'
    },
    {
      item: 'No first-person pronouns (I, me, my) in summary or bullets',
      checked: !(/\bi\b|\bmy\b|\bme\b/i.test(resumeData.profileSummary)),
      severity: 'important'
    },
    {
      item: 'Action verbs used to start achievement bullets',
      checked: sectionAnalysis.experience.score >= 70,
      severity: 'important'
    },
    {
      item: 'No special characters or graphics (™, ®, ©, images)',
      checked: sectionAnalysis.formatting.score >= 85,
      severity: 'recommended'
    },
    {
      item: 'Certifications included (if applicable)',
      checked: (resumeData.certifications?.length || 0) > 0,
      severity: 'recommended'
    },
    {
      item: 'GitHub profile included (for technical roles)',
      checked: !!resumeData.personalInfo.github,
      severity: 'recommended'
    },
    {
      item: 'Resume optimized for target industry keywords',
      checked: sectionAnalysis.skills.score >= 80,
      severity: 'recommended'
    },
    {
      item: 'Total length 1-2 pages (not too long or short)',
      checked: (resumeData.workExperience?.length || 0) >= 3 && 
               (resumeData.workExperience?.length || 0) <= 8,
      severity: 'recommended'
    }
  ];
}

/**
 * Calculate estimated ATS pass rate
 */
function calculateATSPassRate(
  sectionAnalysis: ATSSectionResults,
  aiAnalysis: AIAnalysisResult
): number {
  let passRate = sectionAnalysis.overallScore;

  // Boost for strengths
  passRate += aiAnalysis.keyStrengths.length * 2;

  // Penalty for critical issues
  passRate -= aiAnalysis.criticalIssues.length * 5;

  // Penalty for red flags
  passRate -= aiAnalysis.redFlags.length * 3;

  return Math.max(0, Math.min(100, passRate));
}

/**
 * Calculate interview chance
 */
function calculateInterviewChance(
  readinessScore: number,
  strengthsCount: number,
  redFlagsCount: number
): number {
  let chance = readinessScore * 0.7;

  // Boost for competitive edge
  chance += strengthsCount * 3;

  // Penalty for red flags
  chance -= redFlagsCount * 5;

  // Cap between 5% and 95%
  return Math.max(5, Math.min(95, Math.round(chance)));
}

/**
 * Get status color
 */
export function getStatusColor(status: 'READY' | 'NEEDS_WORK' | 'CRITICAL_ISSUES'): string {
  switch (status) {
    case 'READY': return 'text-green-600';
    case 'NEEDS_WORK': return 'text-yellow-600';
    case 'CRITICAL_ISSUES': return 'text-red-600';
  }
}

export function getStatusBgColor(status: 'READY' | 'NEEDS_WORK' | 'CRITICAL_ISSUES'): string {
  switch (status) {
    case 'READY': return 'bg-green-100';
    case 'NEEDS_WORK': return 'bg-yellow-100';
    case 'CRITICAL_ISSUES': return 'bg-red-100';
  }
}

export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high': return 'text-green-600';
    case 'medium': return 'text-blue-600';
    case 'low': return 'text-orange-600';
  }
}
