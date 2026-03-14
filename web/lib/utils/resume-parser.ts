/**
 * Parse raw resume text into structured JSON data
 * Handles common resume formats and sections
 */

interface ParsedResume {
  personalInfo: {
    name: string;
    emails: string[];
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  profileSummary: string;
  technicalSkills: Record<string, string>;
  workExperience: Array<{
    title: string;
    company: string;
    location?: string;
    duration: string;
    description?: string;
    achievements?: string[];
  }>;
  priorExperience?: Array<{
    title: string;
    company: string;
    location?: string;
    duration: string;
    description?: string;
    achievements?: string[];
  }>;
  education: {
    degree: string;
    field: string;
    institution: string;
    note: string;
  };
  certifications?: string[];
  coreCompetencies?: string;
}

export function parseResumeText(text: string): Partial<ParsedResume> {
  const result: Partial<ParsedResume> = {
    personalInfo: {
      name: '',
      emails: [],
      phone: '',
      location: '',
      linkedin: '',
      github: ''
    },
    profileSummary: '',
    technicalSkills: {},
    workExperience: [],
    priorExperience: [],
    education: {
      degree: '',
      field: '',
      institution: '',
      note: ''
    },
    certifications: [],
    coreCompetencies: ''
  };

  // Extract email addresses
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = text.match(emailRegex) || [];
  if (result.personalInfo) {
    result.personalInfo.emails = [...new Set(emails)]; // Remove duplicates
  }

  // Extract phone numbers (US format with variations)
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch && result.personalInfo) {
    result.personalInfo.phone = phoneMatch[0].replace(/\s+/g, ' ').trim();
  }

  // Extract LinkedIn URL (handle both full URLs and short formats)
  const linkedinRegex = /(https?:\/\/)?(www\.)?(linkedin\.com\/in\/[\w-]+)/i;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch && result.personalInfo) {
    const linkedin = linkedinMatch[0];
    result.personalInfo.linkedin = linkedin.startsWith('http') ? linkedin : `https://${linkedin}`;
  }

  // Extract GitHub URL
  const githubRegex = /(https?:\/\/)?(www\.)?(github\.com\/[\w-]+)/i;
  const githubMatch = text.match(githubRegex);
  if (githubMatch && result.personalInfo) {
    const github = githubMatch[0];
    result.personalInfo.github = github.startsWith('http') ? github : `https://${github}`;
  }

  // Extract name (first non-empty line before the first section header)
  const lines = text.split('\n').map(l => l.trim());
  const firstDivider = lines.findIndex(l => /^_{5,}$/.test(l));
  const headerLines = firstDivider > 0 ? lines.slice(0, firstDivider) : lines.slice(0, 5);
  
  for (const line of headerLines) {
    // Name is usually first line, not an email/phone/url, reasonable length
    if (line.length > 0 && 
        line.length < 50 && 
        !line.includes('@') && 
        !line.includes('http') &&
        !line.includes('linkedin') &&
        !line.includes('github') &&
        !/\d{3}/.test(line) && // Not a phone number
        !result.personalInfo?.name) {
      result.personalInfo!.name = line;
      break;
    }
  }

  // Extract location (look for city, state, zip - typically in header)
  const locationRegex = /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*),?\s*([A-Z]{2})\s*(\d{5})?/;
  const locationMatch = headerLines.join('\n').match(locationRegex);
  if (locationMatch && result.personalInfo) {
    result.personalInfo.location = locationMatch[0].trim();
  }

  // Extract sections
  const sections = extractSections(text);
  
  // Parse profile/summary
  const summarySection = sections.find(s => 
    /summary|profile|objective/i.test(s.title)
  );
  if (summarySection) {
    result.profileSummary = summarySection.content.trim();
  }

  // Parse skills
  const skillsSection = sections.find(s => 
    /skills?|competencies|expertise/i.test(s.title)
  );
  if (skillsSection) {
    result.technicalSkills = parseSkills(skillsSection.content);
  }

  // Parse work experience
  const experienceSection = sections.find(s => 
    /experience|employment|work.*history/i.test(s.title) && !/prior|previous/i.test(s.title)
  );
  if (experienceSection) {
    result.workExperience = parseWorkExperience(experienceSection.content);
  }

  // Parse prior/previous experience
  const priorSection = sections.find(s => 
    /prior|previous|earlier/i.test(s.title)
  );
  if (priorSection) {
    result.priorExperience = parseWorkExperience(priorSection.content);
  }

  // Parse education
  const educationSection = sections.find(s => 
    /education|academic/i.test(s.title)
  );
  if (educationSection && result.education) {
    const eduData = parseEducation(educationSection.content);
    result.education = eduData;
  }

  // Parse certifications
  const certSection = sections.find(s => 
    /certif|credential|license/i.test(s.title)
  );
  if (certSection) {
    result.certifications = parseCertifications(certSection.content);
  }

  // Parse core competencies
  const compSection = sections.find(s => 
    /core.*competenc/i.test(s.title) || /key.*competenc/i.test(s.title)
  );
  if (compSection) {
    result.coreCompetencies = compSection.content.trim();
  }

  return result;
}

function extractSections(text: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  
  // Normalize line endings
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Try splitting by underscores first
  let parts = normalized.split(/_{20,}/);
  
  // Known section headers that should be recognized (with optional descriptive text after)
  const knownSections = /^(SUMMARY|PROFILE|OBJECTIVE|SKILLS?|TECHNICAL\s+SKILLS?|CORE\s+COMPETENCIES|EXPERIENCE|WORK\s+EXPERIENCE|EMPLOYMENT|PROFESSIONAL\s+EXPERIENCE|PRIOR\s+(IT\s+)?EXPERIENCE|PREVIOUS\s+EXPERIENCE|EDUCATION|ACADEMIC|CERTIFICATIONS?|CREDENTIALS?|LICENSES?|AWARDS?|PUBLICATIONS?|PROJECTS?|VOLUNTEER)(\s*[-–—:]\s*.+)?$/i;
  
  if (parts.length > 1) {
    // Has underscore dividers
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      
      const lines = part.split('\n');
      const title = lines[0].replace(/:$/, '').trim();
      const content = lines.slice(1).join('\n').replace(/([a-z,])\n\s{10,}([a-z])/g, '$1 $2').replace(/\s{2,}/g, ' ').trim();
      
      if (title && content) {
        sections.push({ title, content });
      }
    }
  } else {
    // No underscore dividers - parse by section headers
    const lines = normalized.split('\n');
    let currentSection: { title: string; content: string } | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Only match KNOWN section headers, not random all-caps text like company names
      if (knownSections.test(trimmed.replace(/:$/, ''))) {
        if (currentSection && currentSection.content) {
          sections.push(currentSection);
        }
        currentSection = { 
          title: trimmed.replace(/:$/, ''),
          content: '' 
        };
      } else if (currentSection && trimmed) {
        currentSection.content += line + '\n';
      }
    }
    
    if (currentSection && currentSection.content) {
      sections.push(currentSection);
    }
  }
  
  return sections;
}

function parseSkills(content: string): Record<string, string> {
  const skills: Record<string, string> = {};
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // Skip bullet points and clean up
    const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
    if (cleaned.length < 5) continue;
    
    // Handle format "Category: skills, skills, skills"
    const categoryMatch = cleaned.match(/^([^:]+):\s*(.+)$/);
    if (categoryMatch) {
      const category = categoryMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
      const skillList = categoryMatch[2].trim();
      
      // Only add if this category doesn't already exist (prevent duplicates)
      if (!skills[category]) {
        skills[category] = skillList;
      }
    }
    // Skip lines without a colon (avoid duplicating raw skill lists)
  }

  return skills;
}

function parseWorkExperience(content: string): Array<{
  title: string;
  company: string;
  location?: string;
  duration: string;
  description?: string;
  achievements?: string[];
}> {
  const jobs: Array<{
    title: string;
    company: string;
    location?: string;
    duration: string;
    description?: string;
    achievements?: string[];
  }> = [];

  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Pattern to detect section headers that shouldn't be treated as job data
  const sectionHeaderPattern = /^(SUMMARY|PROFILE|OBJECTIVE|SKILLS?|TECHNICAL\s+SKILLS?|CORE\s+COMPETENCIES|EXPERIENCE|WORK\s+EXPERIENCE|EMPLOYMENT|PROFESSIONAL\s+EXPERIENCE|PRIOR\s+(IT\s+)?EXPERIENCE|PREVIOUS\s+EXPERIENCE|EDUCATION|ACADEMIC|CERTIFICATIONS?|CREDENTIALS?|LICENSES?|AWARDS?|PUBLICATIONS?|PROJECTS?|VOLUNTEER)(\s*[-–—:]\s*.+)?$/i;
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    
    // Skip section headers
    if (sectionHeaderPattern.test(line)) {
      i++;
      continue;
    }
    
    // Skip bullets
    if (/^[-*•]/.test(line)) {
      i++;
      continue;
    }
    
    // Skip lines that ARE date ranges (prevent date from being treated as company name)
    // Date format: "Month Year to Month Year" or "Month Year - Present" etc.
    if (/^(January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{4})/i.test(line) && 
        /(to|–|—|-)\s*(present|\d{4}|January|February|March|April|May|June|July|August|September|October|November|December)/i.test(line)) {
      i++;
      continue;
    }
    
    // Look ahead up to 5 lines for a date pattern (year or "present")
    let hasDateAhead = false;
    let dateLineOffset = 0;
    for (let offset = 1; offset <= 5 && i + offset < lines.length; offset++) {
      if (/\d{4}|present/i.test(lines[i + offset]) && !/^[-*•]/.test(lines[i + offset])) {
        hasDateAhead = true;
        dateLineOffset = offset;
        break;
      }
    }
    
    if (hasDateAhead && !/^[-*•]/.test(line) && line.length > 0) {
      // This is a job block starting with company name
      const company = line;
      i++;
      
      // Next should be title
      const title = lines[i] || '';
      i++;
      
      // Skip employment type line if present (Full-time | Remote, Part-time, Contract, etc.)
      if (lines[i] && /full-time|part-time|contract|remote|hybrid|on-site/i.test(lines[i]) && !/\d{4}/.test(lines[i])) {
        i++;
      }
      
      // Capture location/metadata lines BEFORE date (can be "City, State" OR "Self-Employed | City, State")
      let location = '';
      if (lines[i] && !/\d{4}/.test(lines[i]) && 
          (/^[A-Z][a-z]+(?:[\s-][A-Z][a-z]+)*,\s*[A-Z]{2}$/i.test(lines[i]) || 
           lines[i].includes('|') ||
           /^self-employed|freelance|independent/i.test(lines[i]))) {
        location = lines[i]; // Capture the location
        i++;
      }
      
      // Get date/duration
      let duration = '';
      if (lines[i] && /\d{4}|present/i.test(lines[i])) {
        duration = lines[i];
        i++;
      }
      
      // Skip any additional metadata lines AFTER date (rare, but handle it)
      while (i < lines.length && 
             !/^[-*•]/.test(lines[i]) && 
             (lines[i].includes('|') || /^self-employed|freelance|independent/i.test(lines[i])) &&
             !/\d{4}/.test(lines[i]) &&
             !/job title:/i.test(lines[i])) {
        i++;
      }
      
      // Collect bullet point achievements
      const achievements: string[] = [];
      while (i < lines.length && /^[-*•]/.test(lines[i])) {
        const cleaned = lines[i].replace(/^[-*•]\s*/, '').trim();
        if (cleaned) {
          achievements.push(cleaned);
        }
        i++;
      }
      
      if (title && company) {
        jobs.push({ 
          title, 
          company, 
          location: location || undefined,
          duration, 
          achievements: achievements.length > 0 ? achievements : undefined 
        });
      }
    } else {
      i++;
    }
  }
  
  return jobs;
}

function parseEducation(content: string): {
  degree: string;
  field: string;
  institution: string;
  note: string;
} {
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  let degree = '';
  let field = '';
  let institution = '';
  const notes: string[] = [];

  for (const line of lines) {
    // Clean up bullets
    const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
    if (!cleaned) continue;
    
    // Look for degree patterns (Bachelor, Master, PhD, etc.)
    if (!degree && /bachelor|master|phd|doctorate|associate|B\.?B\.?A|B\.?S\.?|M\.?S\.?|M\.?B\.?A/i.test(cleaned)) {
      degree = cleaned;
    }
    // Look for university/college names
    else if (!institution && /(university|college|institute|school)/i.test(cleaned)) {
      institution = cleaned;
    }
    // Look for GPA
    else if (/GPA|grade point/i.test(cleaned)) {
      notes.push(cleaned);
    }
    // Other notable info
    else if (cleaned.length > 10 && cleaned !== degree && cleaned !== institution) {
      notes.push(cleaned);
    }
  }

  // Try to extract field from degree if it contains pipes or extra info
  if (degree.includes('|')) {
    const parts = degree.split('|');
    degree = parts[0].trim();
    if (parts[1]) {
      field = parts[1].trim();
    }
  }

  return { 
    degree, 
    field, 
    institution, 
    note: notes.join(' • ')
  };
}

function parseCertifications(content: string): string[] {
  const certifications: string[] = [];
  const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
  
  for (const line of lines) {
    // Clean up bullets
    const cleaned = line.replace(/^[•\-*\t]+\s*/, '').trim();
    if (cleaned.length > 3) {
      certifications.push(cleaned);
    }
  }
  
  return certifications;
}
