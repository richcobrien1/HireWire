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
    duration: string;
    description?: string;
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
  
  console.log('[Parser] ===== SECTIONS EXTRACTED =====');
  console.log('[Parser] Total sections found:', sections.length);
  sections.forEach((section, i) => {
    console.log(`[Parser] Section ${i}: "${section.title}" (${section.content.length} chars)`);
    console.log(`[Parser] Content preview:`, section.content.substring(0, 100));
  });

  // Parse profile/summary - Match SUMMARY, PROFILE, etc.
  const summarySection = sections.find(s => 
    /summary|profile|objective/i.test(s.title)
  );
  console.log('[Parser] Summary section found?', !!summarySection);
  if (summarySection) {
    console.log('[Parser] Summary title:', summarySection.title);
    console.log('[Parser] Summary content length:', summarySection.content.length);
    console.log('[Parser] Summary content:', summarySection.content.substring(0, 200));
    result.profileSummary = summarySection.content.trim();
  }

  // Parse skills - Match SKILLS, TECHNICAL SKILLS, etc.
  const skillsSection = sections.find(s => 
    /skills?|competencies|expertise/i.test(s.title)
  );
  console.log('[Parser] Skills section found?', !!skillsSection);
  if (skillsSection) {
    console.log('[Parser] Skills title:', skillsSection.title);
    console.log('[Parser] Skills content length:', skillsSection.content.length);
    console.log('[Parser] Skills content preview:', skillsSection.content.substring(0, 200));
    result.technicalSkills = parseSkills(skillsSection.content);
    console.log('[Parser] Parsed skills count:', Object.keys(result.technicalSkills).length);
    console.log('[Parser] Parsed skills:', Object.keys(result.technicalSkills));
  }

  // Parse work experience - Match EXPERIENCE, WORK EXPERIENCE, etc.
  const experienceSection = sections.find(s => 
    /experience|employment|work.*history/i.test(s.title) && !/prior|previous/i.test(s.title)
  );
  console.log('[Parser] Work Experience section found?', !!experienceSection);
  if (experienceSection) {
    console.log('[Parser] Work Experience title:', experienceSection.title);
    console.log('[Parser] Work Experience content length:', experienceSection.content.length);
    console.log('[Parser] Work Experience content preview:', experienceSection.content.substring(0, 200));
    result.workExperience = parseWorkExperience(experienceSection.content);
    console.log('[Parser] Parsed work experience jobs:', result.workExperience.length);
  }

  // Parse prior/previous experience - Match PRIOR IT EXPERIENCE, etc.
  const priorSection = sections.find(s => 
    /prior|previous|earlier/i.test(s.title)
  );
  console.log('[Parser] Prior Experience section found?', !!priorSection);
  if (priorSection) {
    console.log('[Parser] Prior Experience title:', priorSection.title);
    console.log('[Parser] Prior Experience content length:', priorSection.content.length);
    console.log('[Parser] Prior Experience content preview:', priorSection.content.substring(0, 300));
    result.priorExperience = parseWorkExperience(priorSection.content);
    console.log('[Parser] Parsed prior experience jobs:', result.priorExperience.length);
    if (result.priorExperience.length > 0) {
      console.log('[Parser] First prior job:', result.priorExperience[0]);
    }
  }

  // Parse education - Match EDUCATION
  const educationSection = sections.find(s => 
    /education|academic/i.test(s.title)
  );
  console.log('[Parser] Education section found?', !!educationSection);
  if (educationSection) {
    console.log('[Parser] Education title:', educationSection.title);
    console.log('[Parser] Education content:', educationSection.content);
  }
  if (educationSection && result.education) {
    const eduData = parseEducation(educationSection.content);
    result.education = eduData;
  }

  // Parse certifications - Match CERTIFICATIONS
  const certSection = sections.find(s => 
    /certif|credential|license/i.test(s.title)
  );
  console.log('[Parser] Certifications section found?', !!certSection);
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
  const lines = text.split('\n');
  
  let currentSection: { title: string; content: string } | null = null;
  // Match section headers: all caps, 3+ letters, may have spaces/slashes/ampersands/dashes
  const sectionHeaderRegex = /^([A-Z][A-Z\s&/\-]{2,})$/;
  // Skip underscore divider lines
  const dividerRegex = /^_{5,}$/;

  console.log('[extractSections] Processing', lines.length, 'lines');

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip divider lines
    if (dividerRegex.test(trimmed)) {
      console.log('[extractSections] Skipping divider line');
      continue;
    }
    
    // Check if this is a section header (all caps, reasonable length)
    if (sectionHeaderRegex.test(trimmed) && trimmed.length < 100) {
      if (currentSection) {
        console.log('[extractSections] Saving section:', currentSection.title, 'with', currentSection.content.length, 'chars');
        sections.push(currentSection);
      }
      console.log('[extractSections] Found new section header:', trimmed);
      currentSection = { title: trimmed, content: '' };
    } else if (currentSection && trimmed) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    console.log('[extractSections] Saving final section:', currentSection.title, 'with', currentSection.content.length, 'chars');
    sections.push(currentSection);
  }

  console.log('[extractSections] Total sections extracted:', sections.length);
  
  // Unwrap hard-wrapped lines within each section's content
  sections.forEach(section => {
    // Join lines that are split mid-word (lowercase to lowercase continuation)
    // But preserve intentional line breaks (bullets, blank lines, etc.)
    section.content = section.content
      .replace(/([a-z,])\s*\n\s+([a-z])/g, '$1 $2')  // Join wrapped lines (indented continuation)
      .replace(/\s{2,}/g, ' ')  // Clean up excessive spaces
      .trim();
  });
  
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
  duration: string;
  description?: string;
  achievements?: string[];
}> {
  const jobs: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
    achievements?: string[];
  }> = [];

  const lines = content.split('\n').map(l => l.trim());
  
  let currentJob: any = null;
  let previousLineWasBullet = false;
  
  const saveCurrentJob = () => {
    if (currentJob && currentJob.title && currentJob.company) {
      jobs.push({
        title: currentJob.title,
        company: currentJob.company,
        duration: currentJob.duration || 'Dates not specified',
        achievements: currentJob.achievements.length > 0 ? currentJob.achievements : undefined
      });
    }
  };
  
  const isSkipableLine = (line: string) => {
    return line.startsWith('Tech Stack:') || 
           line.startsWith('Development Tools:') || 
           line.startsWith('DevOps:') || 
           line.startsWith('Tools:');
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line) {
      previousLineWasBullet = false;
      continue;
    }
    
    const isBullet = line.match(/^[•\-*\t]/);
    const nextLine = i + 1 < lines.length ? lines[i + 1] : '';
    const hasDatePattern = /\d{4}|present|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(line);
    
    // Skip tech stack lines
    if (isSkipableLine(line)) {
      continue;
    }
    
    // Check for explicit "Job Title:" or "Title:" pattern
    if (/^(job\s+)?title:\s*/i.test(line)) {
      saveCurrentJob();
      
      const titleValue = line.replace(/^(job\s+)?title:\s*/i, '').trim();
      currentJob = {
        title: titleValue,
        company: '',
        duration: '',
        achievements: []
      };
      previousLineWasBullet = false;
      continue;
    }
    
    // Check for explicit "Company:" pattern
    if (currentJob && /^company:\s*/i.test(line)) {
      currentJob.company = line.replace(/^company:\s*/i, '').trim();
      previousLineWasBullet = false;
      continue;
    }
    
    // Detect new job: non-bullet line after we've collected bullets for current job
    // This indicates a new job title is starting
    if (!isBullet && 
        currentJob && 
        currentJob.achievements.length > 0 && 
        previousLineWasBullet &&
        !line.includes('|') &&
        !hasDatePattern &&
        line.length < 100) {
      
      // Save the previous job
      saveCurrentJob();
      
      // Start new job
      currentJob = {
        title: line,
        company: '',
        duration: '',
        achievements: []
      };
      previousLineWasBullet = false;
      continue;
    }
    
    // If no current job and not a bullet, start first job
    if (!currentJob && !isBullet && !isSkipableLine(line) && !hasDatePattern) {
      currentJob = {
        title: line,
        company: '',
        duration: '',
        achievements: []
      };
      previousLineWasBullet = false;
      continue;
    }
    
    if (!currentJob) {
      previousLineWasBullet = !!isBullet;
      continue;
    }
    
    // Line with pipe separator = company line (PRIORITIZE THIS CHECK)
    // This handles formats like: "TekSystems (Pfizer Corporation) | San Diego, CA"
    if (!currentJob.company && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      currentJob.company = parts[0];
      previousLineWasBullet = false;
      continue;
    }
    
    // Bullet point (achievement)
    if (isBullet) {
      const cleaned = line.replace(/^[•\-*\t]+\s*/, '').trim();
      if (cleaned.length > 0 && !isSkipableLine(cleaned)) {
        currentJob.achievements.push(cleaned);
      }
      previousLineWasBullet = true;
      continue;
    }
    
    // Line with date = duration (only if we have a title already)
    if (currentJob.title && !currentJob.duration && hasDatePattern) {
      currentJob.duration = line;
      previousLineWasBullet = false;
      continue;
    }
    
    // If we have title but no company, non-bullet, non-date line = company
    if (currentJob.title && !currentJob.company && !isBullet && !hasDatePattern) {
      currentJob.company = line;
      previousLineWasBullet = false;
      continue;
    }
    
    previousLineWasBullet = !!isBullet;
  }
  
  // Save the last job
  saveCurrentJob();

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
