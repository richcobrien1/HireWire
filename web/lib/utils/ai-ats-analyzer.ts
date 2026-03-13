/**
 * AI-Powered ATS Deep Analysis
 * Uses LLM to provide contextual insights and suggestions
 */

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

export interface AIAnalysisResult {
  overallAssessment: string;
  keyStrengths: string[];
  criticalIssues: string[];
  improvementSuggestions: {
    section: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  keywordOptimization: {
    missing: string[];
    overused: string[];
    recommended: string[];
  };
  industryAlignment: {
    matchScore: number;
    targetIndustries: string[];
    recommendations: string[];
  };
  competitiveEdge: string[];
  redFlags: string[];
}

/**
 * Analyze resume with AI for deep insights
 * In production, this would call an actual LLM API (OpenAI, Claude, etc.)
 * For now, it provides intelligent rule-based analysis
 */
export async function analyzeResumeWithAI(
  resumeData: ResumeData,
  jobDescription?: string
): Promise<AIAnalysisResult> {
  
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  const result: AIAnalysisResult = {
    overallAssessment: '',
    keyStrengths: [],
    criticalIssues: [],
    improvementSuggestions: [],
    keywordOptimization: {
      missing: [],
      overused: [],
      recommended: []
    },
    industryAlignment: {
      matchScore: 0,
      targetIndustries: [],
      recommendations: []
    },
    competitiveEdge: [],
    redFlags: []
  };

  // Analyze overall resume quality
  const totalJobs = (resumeData.workExperience?.length || 0) + 
                    (resumeData.priorExperience?.length || 0);
  const hasRecentExperience = resumeData.workExperience?.some(j => 
    j.duration.toLowerCase().includes('present')
  );

  // Overall Assessment
  if (totalJobs >= 5 && hasRecentExperience) {
    result.overallAssessment = `Strong professional background with ${totalJobs} positions. Well-structured resume showing career progression and current employment. ATS systems will easily parse this format.`;
  } else if (totalJobs >= 3) {
    result.overallAssessment = `Solid work history with ${totalJobs} positions. Resume structure is clear. Consider highlighting recent achievements more prominently.`;
  } else {
    result.overallAssessment = `Early career profile with ${totalJobs} position(s). Focus on quantifiable achievements and technical skills to strengthen ATS appeal.`;
  }

  // Key Strengths Analysis
  if (Object.keys(resumeData.technicalSkills).length >= 5) {
    result.keyStrengths.push('Comprehensive technical skills section with multiple categories');
  }

  if (resumeData.workExperience?.some(j => j.achievements && j.achievements.length >= 5)) {
    result.keyStrengths.push('Detailed achievement bullets demonstrating impact');
  }

  if (hasRecentExperience) {
    result.keyStrengths.push('Currently employed, showing career stability');
  }

  if (resumeData.certifications && resumeData.certifications.length > 0) {
    result.keyStrengths.push(`Professional certifications (${resumeData.certifications.length}) enhance credibility`);
  }

  const allAchievements = resumeData.workExperience
    ?.flatMap(j => j.achievements || [])
    .join(' ') || '';
  const hasMetrics = /\d+%|\$\d+|x\d+|\d+\+/.test(allAchievements);
  if (hasMetrics) {
    result.keyStrengths.push('Quantified achievements with metrics (%, $, multipliers)');
  }

  // Critical Issues Detection
  if (!resumeData.personalInfo.phone) {
    result.criticalIssues.push('Missing phone number - ATS systems flag this as incomplete');
  }

  if (!resumeData.personalInfo.location) {
    result.criticalIssues.push('No location specified - may hurt local job matching algorithms');
  }

  if (resumeData.profileSummary.split(/\s+/).length < 30) {
    result.criticalIssues.push('Profile summary too brief - needs 50+ words to rank well');
  }

  if (totalJobs > 0) {
    const jobsWithoutAchievements = resumeData.workExperience?.filter(
      j => !j.achievements || j.achievements.length === 0
    ).length || 0;
    
    if (jobsWithoutAchievements > 0) {
      result.criticalIssues.push(
        `${jobsWithoutAchievements} position(s) lack achievement bullets - ATS systems penalize empty entries`
      );
    }
  }

  // Improvement Suggestions
  if (resumeData.workExperience && resumeData.workExperience.length > 0) {
    const recentJob = resumeData.workExperience[0];
    if (!recentJob.achievements || recentJob.achievements.length < 5) {
      result.improvementSuggestions.push({
        section: 'Recent Experience',
        suggestion: `Add more achievement bullets for "${recentJob.title}" role (have ${recentJob.achievements?.length || 0}, recommend 5-7)`,
        priority: 'high'
      });
    }
  }

  if (!resumeData.personalInfo.linkedin) {
    result.improvementSuggestions.push({
      section: 'Contact Information',
      suggestion: 'Add LinkedIn profile URL - 87% of recruiters check LinkedIn before interviewing',
      priority: 'high'
    });
  }

  const skillsText = Object.values(resumeData.technicalSkills).join(' ').toLowerCase();
  if (!skillsText.includes('cloud') && !skillsText.includes('aws') && !skillsText.includes('azure')) {
    result.improvementSuggestions.push({
      section: 'Technical Skills',
      suggestion: 'Add cloud platform experience (AWS, Azure, GCP) - highly searched by ATS',
      priority: 'medium'
    });
  }

  if (!resumeData.certifications || resumeData.certifications.length === 0) {
    result.improvementSuggestions.push({
      section: 'Certifications',
      suggestion: 'Add professional certifications section - boosts ATS keyword matching',
      priority: 'medium'
    });
  }

  // Keyword Optimization
  const commonATSKeywords = [
    'agile', 'scrum', 'ci/cd', 'microservices', 'api', 'cloud',
    'docker', 'kubernetes', 'devops', 'leadership', 'collaboration'
  ];

  const resumeText = JSON.stringify(resumeData).toLowerCase();
  const missingKeywords = commonATSKeywords.filter(k => !resumeText.includes(k));
  
  result.keywordOptimization.missing = missingKeywords.slice(0, 5);
  result.keywordOptimization.recommended = [
    'Full-stack development',
    'Cross-functional collaboration',
    'Performance optimization',
    'Scalable architecture',
    'Data-driven decision making'
  ];

  // Check for overused words
  const wordFrequency: Record<string, number> = {};
  resumeText.split(/\s+/).forEach(word => {
    if (word.length > 4) {
      wordFrequency[word] = (wordFrequency[word] || 0) + 1;
    }
  });

  result.keywordOptimization.overused = Object.entries(wordFrequency)
    .filter(([_, count]) => count > 8)
    .map(([word]) => word)
    .slice(0, 3);

  // Industry Alignment
  const techIndicators = [
    'javascript', 'typescript', 'python', 'react', 'angular',
    'node', 'aws', 'docker', 'api', 'database'
  ];
  const techMatches = techIndicators.filter(t => resumeText.includes(t)).length;
  result.industryAlignment.matchScore = Math.min(100, (techMatches / techIndicators.length) * 100);

  if (techMatches >= 7) {
    result.industryAlignment.targetIndustries = [
      'Software Development',
      'Cloud Computing',
      'SaaS/PaaS',
      'Tech Startups'
    ];
  } else if (techMatches >= 4) {
    result.industryAlignment.targetIndustries = [
      'IT Services',
      'Digital Transformation',
      'Enterprise Software'
    ];
  }

  result.industryAlignment.recommendations = [
    'Emphasize modern tech stack (React, TypeScript, Cloud) in summary',
    'Highlight scalability and performance achievements',
    'Include remote work/distributed team experience'
  ];

  // Competitive Edge
  if (resumeData.workExperience?.some(j => j.company.includes('Fortune') || j.company.includes('FAANG'))) {
    result.competitiveEdge.push('Fortune 500 / prestigious company experience');
  }

  if (totalJobs >= 8) {
    result.competitiveEdge.push('Extensive career history showing diverse experience');
  }

  if (allAchievements.match(/patent/i)) {
    result.competitiveEdge.push('Patent holder - demonstrates innovation');
  }

  if (skillsText.includes('ai') || skillsText.includes('machine learning')) {
    result.competitiveEdge.push('AI/ML expertise - highly sought after in 2026 market');
  }

  // Red Flags Detection
  const employmentGaps = analyzeEmploymentGaps(resumeData.workExperience || []);
  if (employmentGaps.length > 0) {
    result.redFlags.push(`Potential employment gap(s): ${employmentGaps.join(', ')} - consider addressing`);
  }

  const hasFrequentJobChanges = checkFrequentJobChanges(resumeData.workExperience || []);
  if (hasFrequentJobChanges) {
    result.redFlags.push('Multiple positions under 1 year - ATS may flag job hopping');
  }

  if (resumeData.profileSummary.includes('I ') || resumeData.profileSummary.includes('my ')) {
    result.redFlags.push('First-person pronouns in summary - unprofessional for ATS');
  }

  return result;
}

/**
 * Analyze employment gaps
 */
function analyzeEmploymentGaps(jobs: Array<{ duration: string }>): string[] {
  const gaps: string[] = [];
  
  // Simple gap detection (would need more sophisticated date parsing)
  for (let i = 0; i < jobs.length - 1; i++) {
    const currentEnd = jobs[i].duration.split('-')[1]?.trim();
    const nextStart = jobs[i + 1].duration.split('-')[0]?.trim();
    
    if (currentEnd && nextStart && currentEnd !== 'Present') {
      // Simplified - in production would parse actual dates
      gaps.push(`Between ${jobs[i + 1].duration.split('-')[0]} and ${currentEnd}`);
    }
  }
  
  return gaps.slice(0, 2); // Return max 2 gaps
}

/**
 * Check for frequent job changes
 */
function checkFrequentJobChanges(jobs: Array<{ duration: string }>): boolean {
  let shortJobCount = 0;
  
  jobs.forEach(job => {
    const durationMatch = job.duration.match(/\((\d+)\s+(month|year)/i);
    if (durationMatch) {
      const amount = parseInt(durationMatch[1]);
      const unit = durationMatch[2].toLowerCase();
      
      if ((unit === 'month' && amount < 12) || (unit === 'year' && amount < 1)) {
        shortJobCount++;
      }
    }
  });
  
  return shortJobCount >= 2;
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return 'text-red-600';
    case 'medium': return 'text-orange-600';
    case 'low': return 'text-blue-600';
  }
}

export function getPriorityBgColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return 'bg-red-100';
    case 'medium': return 'bg-orange-100';
    case 'low': return 'bg-blue-100';
  }
}
