/**
 * ATS Section-by-Section Checker
 * Detailed rules-based validation for each resume section
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

interface SectionResult {
  score: number; // 0-100
  maxScore: number;
  passed: boolean;
  issues: string[];
  recommendations: string[];
  warnings: string[];
}

export interface ATSSectionResults {
  contact: SectionResult;
  summary: SectionResult;
  skills: SectionResult;
  experience: SectionResult;
  education: SectionResult;
  certifications: SectionResult;
  formatting: SectionResult;
  overallScore: number;
  overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  readyForSubmission: boolean;
}

/**
 * Section 1: Contact Information
 * Weight: 15% of total score
 */
function checkContactSection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 0,
    maxScore: 100,
    passed: false,
    issues: [],
    recommendations: [],
    warnings: []
  };

  // Name (20 points)
  if (data.personalInfo.name && data.personalInfo.name.length >= 3) {
    result.score += 20;
  } else {
    result.issues.push('Name is missing or too short');
  }

  // Email (25 points)
  if (data.personalInfo.emails && data.personalInfo.emails.length > 0) {
    result.score += 25;
    // Validate email format
    const validEmails = data.personalInfo.emails.filter(e => 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
    );
    if (validEmails.length !== data.personalInfo.emails.length) {
      result.warnings.push('Some email addresses may be invalid');
      result.score -= 5;
    }
    if (data.personalInfo.emails.length > 1) {
      result.recommendations.push('Multiple emails detected - consider using only your primary professional email');
    }
  } else {
    result.issues.push('Email address is required');
  }

  // Phone (20 points)
  if (data.personalInfo.phone) {
    result.score += 20;
    // Check for standard format
    if (!/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(data.personalInfo.phone)) {
      result.warnings.push('Phone format may not be standard (use: 123-456-7890)');
      result.score -= 5;
    }
  } else {
    result.issues.push('Phone number is missing');
  }

  // Location (15 points)
  if (data.personalInfo.location) {
    result.score += 15;
    // Check if it's too detailed (full address = bad)
    if (data.personalInfo.location.split(',').length > 2) {
      result.warnings.push('Location too detailed - use City, State format only');
      result.score -= 5;
    }
  } else {
    result.recommendations.push('Add location (City, State) to improve local job matches');
  }

  // LinkedIn (10 points)
  if (data.personalInfo.linkedin) {
    result.score += 10;
    if (!data.personalInfo.linkedin.includes('linkedin.com')) {
      result.warnings.push('LinkedIn URL format may be incorrect');
    }
  } else {
    result.recommendations.push('Add LinkedIn profile to boost professional presence');
  }

  // GitHub (10 points bonus for technical roles)
  if (data.personalInfo.github) {
    result.score += 10;
  }

  result.passed = result.score >= 70;
  result.score = Math.min(result.score, 100); // Cap at 100

  return result;
}

/**
 * Section 2: Profile/Summary
 * Weight: 15% of total score
 */
function checkSummarySection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 0,
    maxScore: 100,
    passed: false,
    issues: [],
    recommendations: [],
    warnings: []
  };

  if (!data.profileSummary || data.profileSummary.trim().length < 10) {
    result.issues.push('Profile summary is missing or too short');
    result.recommendations.push('Add a 50-150 word summary highlighting your expertise');
    return result;
  }

  const wordCount = data.profileSummary.split(/\s+/).length;

  // Length check (30 points)
  if (wordCount >= 50 && wordCount <= 150) {
    result.score += 30;
  } else if (wordCount < 50) {
    result.issues.push(`Summary too short (${wordCount} words, need 50-150)`);
    result.score += Math.floor(wordCount / 50 * 30); // Partial credit
  } else if (wordCount > 150) {
    result.warnings.push(`Summary too long (${wordCount} words, ideal 50-150)`);
    result.score += 20; // Partial credit
  }

  // Keyword density (25 points)
  const technicalKeywords = [
    'experience', 'expert', 'senior', 'lead', 'developer', 'engineer',
    'manager', 'architect', 'specialist', 'professional', 'certified'
  ];
  const lowerSummary = data.profileSummary.toLowerCase();
  const keywordCount = technicalKeywords.filter(k => lowerSummary.includes(k)).length;
  
  if (keywordCount >= 3) {
    result.score += 25;
  } else {
    result.recommendations.push('Add more industry keywords (experience level, role types)');
    result.score += Math.floor(keywordCount / 3 * 25);
  }

  // Quantifiable achievements (20 points)
  const hasNumbers = /\d+/.test(data.profileSummary);
  if (hasNumbers) {
    result.score += 20;
  } else {
    result.recommendations.push('Include quantifiable achievements (years of experience, team size, etc.)');
  }

  // Cliché detection (15 points penalty)
  const cliches = [
    'team player', 'hard worker', 'go-getter', 'self-starter',
    'detail-oriented', 'results-driven', 'think outside the box'
  ];
  const foundCliches = cliches.filter(c => lowerSummary.includes(c));
  if (foundCliches.length > 0) {
    result.warnings.push(`Avoid clichés: ${foundCliches.join(', ')}`);
    result.score -= foundCliches.length * 5;
  }

  // Action verbs (10 points)
  const actionVerbs = ['led', 'managed', 'developed', 'designed', 'implemented', 'architected'];
  const hasActionVerbs = actionVerbs.some(v => lowerSummary.includes(v));
  if (hasActionVerbs) {
    result.score += 10;
  }

  // Professional tone (15 points)
  const hasFirstPerson = /\bi\b|\bmy\b|\bme\b/i.test(data.profileSummary);
  if (!hasFirstPerson) {
    result.score += 15;
  } else {
    result.warnings.push('Avoid first-person pronouns (I, my, me) - use third-person');
    result.score += 5; // Partial credit
  }

  result.passed = result.score >= 70;
  result.score = Math.max(0, Math.min(result.score, 100));

  return result;
}

/**
 * Section 3: Technical Skills
 * Weight: 20% of total score
 */
function checkSkillsSection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 0,
    maxScore: 100,
    passed: false,
    issues: [],
    recommendations: [],
    warnings: []
  };

  const skillCategories = Object.keys(data.technicalSkills || {});
  const totalSkills = Object.values(data.technicalSkills || {})
    .join(',')
    .split(',')
    .filter(s => s.trim().length > 0)
    .length;

  // Has skills section (20 points)
  if (skillCategories.length === 0) {
    result.issues.push('Technical skills section is empty or missing');
    result.recommendations.push('Add a skills section with categorized technical abilities');
    return result;
  } else {
    result.score += 20;
  }

  // Number of categories (25 points)
  if (skillCategories.length >= 5) {
    result.score += 25;
  } else if (skillCategories.length >= 3) {
    result.score += 15;
    result.recommendations.push('Consider adding more skill categories (Languages, Frameworks, Tools, etc.)');
  } else {
    result.score += 5;
    result.issues.push('Skills should be categorized (Languages, Frameworks, Tools, Databases, etc.)');
  }

  // Total skill count (30 points)
  if (totalSkills >= 15) {
    result.score += 30;
  } else if (totalSkills >= 10) {
    result.score += 20;
    result.recommendations.push(`Add more skills (have ${totalSkills}, ideal 15+)`);
  } else {
    result.score += 10;
    result.issues.push(`Too few skills listed (${totalSkills} found, need 15+)`);
  }

  // Format check (15 points)
  const allSkillsText = Object.values(data.technicalSkills).join(' ');
  const isCommaSeparated = allSkillsText.includes(',');
  if (isCommaSeparated) {
    result.score += 15;
  } else {
    result.warnings.push('Skills should be comma-separated for better ATS parsing');
    result.score += 5;
  }

  // No skill ratings/bars (10 points)
  const hasRatings = /\d+\/\d+|★|⭐|●|■/.test(allSkillsText);
  if (!hasRatings) {
    result.score += 10;
  } else {
    result.issues.push('Remove skill ratings/bars/stars - ATS cannot parse visual elements');
  }

  result.passed = result.score >= 70;
  result.score = Math.min(result.score, 100);

  return result;
}

/**
 * Section 4: Work Experience
 * Weight: 30% of total score
 */
function checkExperienceSection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 0,
    maxScore: 100,
    passed: false,
    issues: [],
    recommendations: [],
    warnings: []
  };

  const allExperience = [
    ...(data.workExperience || []),
    ...(data.priorExperience || [])
  ];

  if (allExperience.length === 0) {
    result.issues.push('No work experience found');
    return result;
  }

  result.score += 10; // Has experience

  // Number of positions (15 points)
  if (allExperience.length >= 3) {
    result.score += 15;
  } else {
    result.score += allExperience.length * 5;
    result.recommendations.push('Add more work experience entries if available');
  }

  let totalDateFormatScore = 0;
  let totalTitleScore = 0;
  let totalCompanyScore = 0;
  let totalAchievementsScore = 0;
  let totalActionVerbScore = 0;
  let totalQuantifiableScore = 0;

  const actionVerbs = [
    'led', 'managed', 'developed', 'designed', 'implemented', 'created',
    'built', 'architected', 'launched', 'optimized', 'improved', 'increased',
    'decreased', 'reduced', 'achieved', 'delivered', 'coordinated', 'directed'
  ];

  for (let i = 0; i < allExperience.length; i++) {
    const job = allExperience[i];

    // Date format consistency (10 points per job)
    if (job.duration) {
      const hasStandardFormat = /\w+\s+\d{4}\s*-\s*(\w+\s+\d{4}|present)/i.test(job.duration);
      if (hasStandardFormat) {
        totalDateFormatScore += 10;
      }
    }

    // Clear job title (10 points per job)
    if (job.title && job.title.length >= 3) {
      totalTitleScore += 10;
    }

    // Company name (10 points per job)
    if (job.company && job.company.length >= 2) {
      totalCompanyScore += 10;
    }

    // Has achievements (15 points per job)
    if (job.achievements && job.achievements.length > 0) {
      totalAchievementsScore += 15;

      // Check bullet count (3-6 is ideal)
      if (job.achievements.length < 3) {
        if (i === 0) { // Only warn for most recent job
          result.recommendations.push(`Job #${i + 1} (${job.title}): Add more achievements (have ${job.achievements.length}, ideal 3-6)`);
        }
      } else if (job.achievements.length > 6) {
        result.warnings.push(`Job #${i + 1}: Too many bullets (${job.achievements.length}). Keep to 3-6 most impactful`);
      }

      // Action verbs (10 points per job)
      const hasActionVerb = job.achievements.some(a => 
        actionVerbs.some(v => new RegExp(`\\b${v}\\b`, 'i').test(a))
      );
      if (hasActionVerb) {
        totalActionVerbScore += 10;
      }

      // Quantifiable achievements (10 points per job)
      const hasNumbers = job.achievements.some(a => /\d+/.test(a));
      if (hasNumbers) {
        totalQuantifiableScore += 10;
      }
    } else {
      if (i < 3) { // Warn for first 3 jobs only
        result.issues.push(`Job #${i + 1} (${job.title}): Missing achievements/bullets`);
      }
    }
  }

  // Calculate averages and add to score
  const jobCount = allExperience.length;
  result.score += Math.min(10, totalDateFormatScore / jobCount);
  result.score += Math.min(10, totalTitleScore / jobCount);
  result.score += Math.min(10, totalCompanyScore / jobCount);
  result.score += Math.min(20, totalAchievementsScore / jobCount);
  result.score += Math.min(15, totalActionVerbScore / jobCount);
  result.score += Math.min(15, totalQuantifiableScore / jobCount);

  result.passed = result.score >= 70;
  result.score = Math.min(result.score, 100);

  return result;
}

/**
 * Section 5: Education
 * Weight: 10% of total score
 */
function checkEducationSection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 0,
    maxScore: 100,
    passed: false,
    issues: [],
    recommendations: [],
    warnings: []
  };

  // Has degree (40 points)
  if (data.education.degree) {
    result.score += 40;
    
    // Check for standard degree format
    const hasStandardDegree = /bachelor|master|phd|doctorate|associate|B\.?S\.?|M\.?S\.?|M\.?B\.?A/i
      .test(data.education.degree);
    if (hasStandardDegree) {
      result.score += 10;
    } else {
      result.warnings.push('Degree format unclear - use standard terms (Bachelor of Science, Master of Arts, etc.)');
    }
  } else {
    result.issues.push('Degree information missing');
  }

  // Has field of study (20 points)
  if (data.education.field) {
    result.score += 20;
  } else {
    result.recommendations.push('Add field of study (e.g., Computer Science, Business Administration)');
  }

  // Has institution (30 points)
  if (data.education.institution) {
    result.score += 30;
  } else {
    result.issues.push('Institution name missing');
  }

  // GPA Note (bonus/warning)
  if (data.education.note) {
    const gpaMatch = data.education.note.match(/gpa[:\s]*([\d.]+)/i);
    if (gpaMatch) {
      const gpa = parseFloat(gpaMatch[1]);
      if (gpa >= 3.5) {
        result.score += 10; // Bonus
      } else if (gpa < 3.0) {
        result.warnings.push('Consider removing GPA if below 3.0');
      }
    }
  }

  result.passed = result.score >= 70;
  result.score = Math.min(result.score, 100);

  return result;
}

/**
 * Section 6: Certifications
 * Weight: 5% of total score
 */
function checkCertificationsSection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 50, // Default pass if no certs (optional section)
    maxScore: 100,
    passed: true,
    issues: [],
    recommendations: [],
    warnings: []
  };

  if (!data.certifications || data.certifications.length === 0) {
    result.recommendations.push('Add certifications if you have any (boosts ATS score)');
    return result;
  }

  // Has certifications (60 points)
  result.score = 60;

  // Number of certifications (20 points)
  if (data.certifications.length >= 3) {
    result.score += 20;
  } else {
    result.score += data.certifications.length * 7;
  }

  // Format check (20 points)
  const hasDates = data.certifications.some(c => /\d{4}/.test(c));
  if (hasDates) {
    result.score += 10;
  } else {
    result.recommendations.push('Include certification dates or "Valid through" dates');
  }

  const hasIssuer = data.certifications.some(c => 
    c.includes('-') || c.includes('by') || c.includes('from')
  );
  if (hasIssuer) {
    result.score += 10;
  } else {
    result.recommendations.push('Include issuing organization for each certification');
  }

  result.score = Math.min(result.score, 100);

  return result;
}

/**
 * Section 7: Formatting & Structure
 * Weight: 5% of total score
 */
function checkFormattingSection(data: ResumeData): SectionResult {
  const result: SectionResult = {
    score: 0,
    maxScore: 100,
    passed: false,
    issues: [],
    recommendations: [],
    warnings: []
  };

  // Standard sections present (40 points)
  let sectionsFound = 0;
  if (data.personalInfo.name) sectionsFound++;
  if (data.profileSummary) sectionsFound++;
  if (Object.keys(data.technicalSkills).length > 0) sectionsFound++;
  if (data.workExperience && data.workExperience.length > 0) sectionsFound++;
  if (data.education.degree) sectionsFound++;

  result.score += sectionsFound * 8; // 5 sections * 8 = 40

  // No special characters in critical fields (30 points)
  const criticalText = [
    data.personalInfo.name,
    ...data.workExperience.map(j => j.title),
    ...data.workExperience.map(j => j.company)
  ].join(' ');

  const hasProblematicChars = /[&<>«»™®©]/g.test(criticalText);
  if (!hasProblematicChars) {
    result.score += 30;
  } else {
    result.warnings.push('Remove special characters (™, ®, ©, &) - use "and" instead of "&"');
    result.score += 15;
  }

  // Consistent date format (30 points)
  const allDates = [
    ...data.workExperience.map(j => j.duration),
    ...(data.priorExperience || []).map(j => j.duration)
  ].filter(Boolean);

  if (allDates.length > 0) {
    const formats = new Set(allDates.map(d => {
      if (/\w+\s+\d{4}/.test(d)) return 'month-year';
      if (/\d{4}/.test(d)) return 'year';
      return 'other';
    }));
    
    if (formats.size === 1) {
      result.score += 30;
    } else {
      result.warnings.push('Inconsistent date formats - use same format throughout (e.g., "January 2020")');
      result.score += 10;
    }
  }

  result.passed = result.score >= 70;
  result.score = Math.min(result.score, 100);

  return result;
}

/**
 * Main section checker - analyzes all sections
 */
export function checkAllSections(data: ResumeData): ATSSectionResults {
  const contact = checkContactSection(data);
  const summary = checkSummarySection(data);
  const skills = checkSkillsSection(data);
  const experience = checkExperienceSection(data);
  const education = checkEducationSection(data);
  const certifications = checkCertificationsSection(data);
  const formatting = checkFormattingSection(data);

  // Weighted average
  const weights = {
    contact: 0.15,
    summary: 0.15,
    skills: 0.20,
    experience: 0.30,
    education: 0.10,
    certifications: 0.05,
    formatting: 0.05
  };

  const overallScore = Math.round(
    contact.score * weights.contact +
    summary.score * weights.summary +
    skills.score * weights.skills +
    experience.score * weights.experience +
    education.score * weights.education +
    certifications.score * weights.certifications +
    formatting.score * weights.formatting
  );

  // Determine grade
  let overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  if (overallScore >= 95) overallGrade = 'A+';
  else if (overallScore >= 90) overallGrade = 'A';
  else if (overallScore >= 85) overallGrade = 'B+';
  else if (overallScore >= 80) overallGrade = 'B';
  else if (overallScore >= 70) overallGrade = 'C';
  else if (overallScore >= 60) overallGrade = 'D';
  else overallGrade = 'F';

  // Ready for submission if overall >= 80 and no section below 60
  const readyForSubmission = overallScore >= 80 &&
    contact.score >= 60 &&
    summary.score >= 60 &&
    skills.score >= 60 &&
    experience.score >= 60 &&
    education.score >= 60;

  return {
    contact,
    summary,
    skills,
    experience,
    education,
    certifications,
    formatting,
    overallScore,
    overallGrade,
    readyForSubmission
  };
}

/**
 * Get color for score visualization
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-red-600';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-green-100';
  if (score >= 80) return 'bg-blue-100';
  if (score >= 70) return 'bg-yellow-100';
  if (score >= 60) return 'bg-orange-100';
  return 'bg-red-100';
}
