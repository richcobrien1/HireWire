/**
 * ATS (Applicant Tracking System) Compliance Checker
 * Analyzes resume data and provides compliance score and recommendations
 */

interface ATSCheckResult {
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
  passRate: 'excellent' | 'good' | 'fair' | 'poor';
}

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
  education: {
    degree: string;
    field: string;
    institution: string;
    note?: string;
  };
  certifications?: string[];
  coreCompetencies?: string;
}

/**
 * Check ATS compliance and return score with recommendations
 */
export function checkATSCompliance(data: ResumeData): ATSCheckResult {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // 1. Check contact information (critical)
  if (!data.personalInfo.name || data.personalInfo.name.length < 3) {
    issues.push('❌ Missing or invalid name');
    score -= 15;
  }

  if (!data.personalInfo.emails || data.personalInfo.emails.length === 0) {
    issues.push('❌ No email address found');
    score -= 15;
  }

  if (!data.personalInfo.phone) {
    issues.push('⚠️ No phone number');
    score -= 10;
    recommendations.push('Add a phone number for better ATS compatibility');
  }

  if (!data.personalInfo.location) {
    issues.push('⚠️ No location specified');
    score -= 5;
    recommendations.push('Include your city and state');
  }

  // 2. Check LinkedIn presence (important)
  if (!data.personalInfo.linkedin) {
    score -= 10;
    recommendations.push('Add LinkedIn profile URL for professional credibility');
  }

  // 3. Check profile summary
  if (!data.profileSummary || data.profileSummary.length < 50) {
    issues.push('⚠️ Profile summary is missing or too short');
    score -= 10;
    recommendations.push('Add a professional summary (100-200 words)');
  }

  // 4. Check work experience
  if (!data.workExperience || data.workExperience.length === 0) {
    issues.push('❌ No work experience listed');
    score -= 20;
  } else {
    // Check for proper date formatting
    const hasStandardDates = data.workExperience.every(job => 
      /\d{4}/.test(job.duration)
    );
    if (!hasStandardDates) {
      issues.push('⚠️ Inconsistent date formatting in work experience');
      score -= 5;
      recommendations.push('Use standard date format: "Month YYYY - Month YYYY"');
    }

    // Check for quantifiable achievements
    const hasAchievements = data.workExperience.some(job => 
      job.achievements && job.achievements.length > 0
    );
    if (!hasAchievements) {
      score -= 10;
      recommendations.push('Add quantifiable achievements (metrics, percentages, dollar amounts)');
    }

    // Check for keywords and action verbs
    const experienceText = data.workExperience
      .map(job => [
        job.description,
        ...(job.achievements || []),
        ...(job.projects || [])
      ].join(' '))
      .join(' ');

    const actionVerbs = [
      'developed', 'created', 'managed', 'led', 'implemented', 
      'designed', 'built', 'improved', 'increased', 'reduced'
    ];

    const hasActionVerbs = actionVerbs.some(verb => 
      experienceText.toLowerCase().includes(verb)
    );

    if (!hasActionVerbs) {
      score -= 5;
      recommendations.push('Use strong action verbs: developed, managed, led, implemented');
    }
  }

  // 5. Check technical skills
  const skillCount = Object.keys(data.technicalSkills || {}).length;
  if (skillCount === 0) {
    issues.push('❌ No technical skills listed');
    score -= 15;
  } else if (skillCount < 5) {
    score -= 5;
    recommendations.push('Add more relevant technical skills (aim for 10-15)');
  }

  // 6. Check education
  if (!data.education || !data.education.degree) {
    issues.push('⚠️ Education section incomplete');
    score -= 10;
  }

  // 7. Check for ATS-friendly formatting issues
  // (In a real implementation, this would analyze the HTML/text output)
  
  // Common ATS problems to check for:
  const commonIssues = [];
  
  // Check for excessive special characters
  const allText = JSON.stringify(data);
  if (/[😀-🙏🌀-🗿🚀-🛿✨★☆●○]/u.test(allText)) {
    commonIssues.push('⚠️ Contains emojis or special characters (may confuse ATS)');
    score -= 5;
    recommendations.push('Remove emojis and decorative characters');
  }

  issues.push(...commonIssues);

  // 8. Determine pass rate
  let passRate: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 90) passRate = 'excellent';
  else if (score >= 75) passRate = 'good';
  else if (score >= 60) passRate = 'fair';
  else passRate = 'poor';

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  // Add positive recommendations if score is high
  if (score >= 80) {
    recommendations.unshift('✅ Resume is well-structured for ATS systems');
  }

  return {
    score,
    issues,
    recommendations,
    passRate
  };
}

/**
 * Get color class based on ATS score
 */
export function getATSScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get progress bar color based on score
 */
export function getATSProgressColor(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-blue-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
}
