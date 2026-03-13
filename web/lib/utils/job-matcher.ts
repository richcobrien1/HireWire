/**
 * Job Match Scorer - AI-powered resume-to-job matching
 * Analyzes resume against job description and provides compatibility score
 */

interface JobMatchResult {
  score: number; // 0-100
  matchedSkills: string[];
  missingSkills: string[];
  experience: {
    hasRelevant: boolean;
    yearsOfExperience: number;
    relevantRoles: string[];
  };
  recommendations: string[];
  strengths: string[];
  compatibilityLevel: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ResumeData {
  personalInfo: any;
  profileSummary: string;
  technicalSkills: Record<string, string>;
  workExperience: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
    projects?: string[];
    achievements?: string[];
  }>;
  priorExperience?: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
    achievements?: string[];
  }>;
  education: any;
  certifications?: string[];
  coreCompetencies?: string;
}

/**
 * Extract skills from job description using keyword matching
 */
function extractJobSkills(jobDescription: string): string[] {
  const skills: string[] = [];
  const text = jobDescription.toLowerCase();

  // Common technical skills to look for
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'sql',
    'mongodb', 'postgresql', 'mysql', 'docker', 'kubernetes', 'aws', 'azure',
    'gcp', 'git', 'ci/cd', 'agile', 'scrum', 'rest api', 'graphql', 'html',
    'css', 'tailwind', 'bootstrap', 'sass', 'webpack', 'vite', 'next.js',
    'redux', 'terraform', 'jenkins', 'github actions', 'jira', 'figma',
    'leadership', 'communication', 'problem solving', 'team management',
    'microservices', 'serverless', 'redis', 'elasticsearch', 'kafka',
    'ai', 'machine learning', 'ml', 'artificial intelligence', 'llm',
    'openai', 'chatgpt', 'claude', 'prompt engineering', 'rag'
  ];

  for (const skill of commonSkills) {
    if (text.includes(skill.toLowerCase())) {
      skills.push(skill);
    }
  }

  // Extract years of experience mentioned
  const yearsMatch = text.match(/(\d+)\+?\s*years?/i);
  if (yearsMatch) {
    skills.push(`${yearsMatch[1]}+ years experience`);
  }

  // Extract degree requirements
  if (/bachelor|bs|ba|undergraduate/i.test(text)) {
    skills.push('Bachelor\'s Degree');
  }
  if (/master|ms|ma|graduate/i.test(text)) {
    skills.push('Master\'s Degree');
  }

  return [...new Set(skills)]; // Remove duplicates
}

/**
 * Extract skills from resume data
 */
function extractResumeSkills(data: ResumeData): string[] {
  const skills: string[] = [];

  // From technical skills section
  Object.values(data.technicalSkills || {}).forEach(skillValue => {
    const skillList = skillValue.toLowerCase().split(/[,;]/);
    skills.push(...skillList.map(s => s.trim()));
  });

  // From profile summary
  if (data.profileSummary) {
    skills.push(...data.profileSummary.toLowerCase().match(/\b[a-z][a-z.]+\b/g) || []);
  }

  // From work experience
  data.workExperience?.forEach(job => {
    if (job.description) {
      skills.push(...job.description.toLowerCase().match(/\b[a-z][a-z.]+\b/g) || []);
    }
    job.achievements?.forEach(achievement => {
      skills.push(...achievement.toLowerCase().match(/\b[a-z][a-z.]+\b/g) || []);
    });
    job.projects?.forEach(project => {
      skills.push(...project.toLowerCase().match(/\b[a-z][a-z.]+\b/g) || []);
    });
  });

  return [...new Set(skills)]; // Remove duplicates
}

/**
 * Calculate years of experience from work history
 */
function calculateYearsOfExperience(workExperience: any[]): number {
  let totalMonths = 0;

  for (const job of workExperience) {
    const duration = job.duration;
    
    // Parse date ranges like "Jan 2020 - Dec 2023" or "2020 - 2023"
    const yearMatch = duration.match(/(\d{4})\s*[-–]\s*(\d{4}|Present)/i);
    if (yearMatch) {
      const startYear = parseInt(yearMatch[1]);
      const endYear = yearMatch[2].toLowerCase() === 'present' ? new Date().getFullYear() : parseInt(yearMatch[2]);
      totalMonths += (endYear - startYear) * 12;
    }
  }

  return Math.round(totalMonths / 12);
}

/**
 * Match resume against job description and return compatibility score
 */
export function matchResumeToJob(
  resumeData: ResumeData,
  jobDescription: string
): JobMatchResult {
  // Extract skills from both sources
  const jobSkills = extractJobSkills(jobDescription);
  const resumeSkills = extractResumeSkills(resumeData);

  // Find matched and missing skills
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const jobSkill of jobSkills) {
    const isMatched = resumeSkills.some(resumeSkill => 
      resumeSkill.includes(jobSkill.toLowerCase()) ||
      jobSkill.toLowerCase().includes(resumeSkill)
    );

    if (isMatched) {
      matchedSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  }

  // Calculate skill match percentage (50% of total score)
  const skillMatchScore = jobSkills.length > 0 
    ? (matchedSkills.length / jobSkills.length) * 50
    : 0;

  // Experience analysis (30% of total score)
  const yearsOfExperience = calculateYearsOfExperience(resumeData.workExperience || []);
  const jobDescLower = jobDescription.toLowerCase();
  
  let experienceScore = 0;
  let hasRelevant = false;
  const relevantRoles: string[] = [];

  // Check if job titles match
  resumeData.workExperience?.forEach(job => {
    if (jobDescLower.includes(job.title.toLowerCase()) ||
        job.title.toLowerCase().split(' ').some(word => jobDescLower.includes(word))) {
      hasRelevant = true;
      relevantRoles.push(job.title);
    }
  });

  if (hasRelevant) experienceScore = 30;
  else if (yearsOfExperience >= 5) experienceScore = 20;
  else if (yearsOfExperience >= 2) experienceScore = 10;

  // Education match (10% of total score)
  let educationScore = 0;
  if (resumeData.education?.degree) {
    if (/master|ms|ma/i.test(resumeData.education.degree)) educationScore = 10;
    else if (/bachelor|bs|ba/i.test(resumeData.education.degree)) educationScore = 8;
  }

  // Profile summary relevance (10% of total score)
  let summaryScore = 0;
  if (resumeData.profileSummary) {
    const summaryWords = resumeData.profileSummary.toLowerCase().split(/\s+/);
    const jobWords = jobDescription.toLowerCase().split(/\s+/);
    const commonWords = summaryWords.filter(word => 
      word.length > 4 && jobWords.includes(word)
    ).length;
    summaryScore = Math.min(10, commonWords);
  }

  // Calculate total score
  const totalScore = Math.round(
    skillMatchScore + experienceScore + educationScore + summaryScore
  );

  // Generate recommendations
  const recommendations: string[] = [];
  const strengths: string[] = [];

  if (matchedSkills.length > 0) {
    strengths.push(`Strong skill match: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}`);
  }

  if (yearsOfExperience >= 5) {
    strengths.push(`Extensive experience: ${yearsOfExperience}+ years`);
  }

  if (hasRelevant) {
    strengths.push(`Relevant role experience: ${relevantRoles[0]}`);
  }

  if (missingSkills.length > 0) {
    recommendations.push(`Consider adding these skills: ${missingSkills.slice(0, 3).join(', ')}`);
  }

  if (!hasRelevant && resumeData.workExperience?.length > 0) {
    recommendations.push('Highlight transferable skills in your summary');
  }

  if (totalScore < 60) {
    recommendations.push('Tailor your resume to better match the job requirements');
    recommendations.push('Use keywords from the job description');
  }

  // Determine compatibility level
  let compatibilityLevel: 'excellent' | 'good' | 'fair' | 'poor';
  if (totalScore >= 80) compatibilityLevel = 'excellent';
  else if (totalScore >= 65) compatibilityLevel = 'good';
  else if (totalScore >= 50) compatibilityLevel = 'fair';
  else compatibilityLevel = 'poor';

  return {
    score: totalScore,
    matchedSkills,
    missingSkills,
    experience: {
      hasRelevant,
      yearsOfExperience,
      relevantRoles
    },
    recommendations,
    strengths,
    compatibilityLevel
  };
}

/**
 * Get color based on match score
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 65) return 'text-blue-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get progress bar color
 */
export function getMatchProgressColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 65) return 'bg-blue-500';
  if (score >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}
