/**
 * Parse Markdown content and convert to resume data or HTML
 */

import { marked } from 'marked';

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

/**
 * Convert Markdown to HTML with custom styling
 */
export function markdownToHTML(markdown: string): string {
  // Configure marked options
  marked.setOptions({
    gfm: true, // GitHub Flavored Markdown
    breaks: true,
  });

  return marked(markdown) as string;
}

/**
 * Parse Markdown resume into structured data
 * Looks for common markdown patterns: # Headers, ## Sections, - bullets, etc.
 */
export function parseMarkdownResume(markdown: string): Partial<ParsedResume> {
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

  const lines = markdown.split('\n');
  
  // Extract emails
  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = markdown.match(emailRegex) || [];
  if (result.personalInfo) {
    result.personalInfo.emails = [...new Set(emails)];
  }

  // Extract phone
  const phoneRegex = /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const phoneMatch = markdown.match(phoneRegex);
  if (phoneMatch && result.personalInfo) {
    result.personalInfo.phone = phoneMatch[0];
  }

  // Extract LinkedIn
  const linkedinRegex = /\[.*?\]\((https?:\/\/(?:www\.)?linkedin\.com\/in\/[\w-]+)\)/i;
  const linkedinMatch = markdown.match(linkedinRegex);
  if (linkedinMatch && result.personalInfo) {
    result.personalInfo.linkedin = linkedinMatch[1];
  }

  // Extract GitHub
  const githubRegex = /\[.*?\]\((https?:\/\/(?:www\.)?github\.com\/[\w-]+)\)/i;
  const githubMatch = markdown.match(githubRegex);
  if (githubMatch && result.personalInfo) {
    result.personalInfo.github = githubMatch[1];
  }

  // Parse sections based on markdown headers
  let currentSection = '';
  let sectionContent = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect H1 (# Header) - usually the name
    if (line.startsWith('# ') && result.personalInfo && !result.personalInfo.name) {
      result.personalInfo.name = line.replace(/^#\s+/, '').trim();
      continue;
    }
    
    // Detect H2 (## Section) - section headers
    if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection && sectionContent) {
        processMarkdownSection(currentSection, sectionContent, result);
      }
      
      currentSection = line.replace(/^##\s+/, '').trim().toLowerCase();
      sectionContent = '';
      continue;
    }
    
    // Accumulate content for current section
    if (currentSection) {
      sectionContent += line + '\n';
    }
  }
  
  // Process last section
  if (currentSection && sectionContent) {
    processMarkdownSection(currentSection, sectionContent, result);
  }

  return result;
}

function processMarkdownSection(
  sectionName: string,
  content: string,
  result: Partial<ParsedResume>
) {
  const trimmed = content.trim();
  
  if (/summary|about|profile|objective/i.test(sectionName)) {
    result.profileSummary = trimmed;
  } else if (/skills?|technical|technologies/i.test(sectionName)) {
    result.technicalSkills = parseMarkdownSkills(trimmed);
  } else if (/^experience$/i.test(sectionName) || /work.*experience|employment/i.test(sectionName)) {
    result.workExperience = parseMarkdownExperience(trimmed);
  } else if (/prior.*experience|previous.*experience/i.test(sectionName)) {
    result.priorExperience = parseMarkdownExperience(trimmed);
  } else if (/education|academic/i.test(sectionName)) {
    if (result.education) {
      const eduData = parseMarkdownEducation(trimmed);
      result.education = eduData;
    }
  } else if (/certifications?|certificates?/i.test(sectionName)) {
    result.certifications = parseMarkdownCertifications(trimmed);
  } else if (/core.*competenc|key.*competenc/i.test(sectionName)) {
    result.coreCompetencies = trimmed;
  }
}

function parseMarkdownSkills(content: string): Record<string, string> {
  const skills: Record<string, string> = {};
  const lines = content.split('\n').filter(Boolean);
  
  let index = 1;
  for (const line of lines) {
    // Markdown bullets: - or * 
    const cleaned = line.replace(/^[-*]\s+/, '').trim();
    if (!cleaned) continue;
    
    // Check for "Category: skills" format
    const categoryMatch = cleaned.match(/^\*\*([^:*]+)\*\*:\s*(.+)$/);
    if (categoryMatch) {
      skills[categoryMatch[1].toLowerCase()] = categoryMatch[2];
    } else {
      skills[`skill${index}`] = cleaned;
      index++;
    }
  }
  
  return skills;
}

function parseMarkdownExperience(content: string): Array<{
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

  // Split by H3 headers (### Job Title) or by blank lines
  const jobBlocks = content.split(/(?=###\s)/);
  
  for (const block of jobBlocks) {
    if (!block.trim()) continue;
    
    const lines = block.split('\n').filter(Boolean);
    let title = '';
    let company = '';
    let duration = '';
    const achievements: string[] = [];
    
    for (const line of lines) {
      // H3 header - job title
      if (line.startsWith('### ')) {
        title = line.replace(/^###\s+/, '').trim();
      }
      // Bold text might be company: **Company Name**
      else if (line.includes('**') && !company) {
        company = line.replace(/\*\*/g, '').trim();
      }
      // Date patterns
      else if (/\d{4}/.test(line) && !duration) {
        duration = line.replace(/^[-*]\s+/, '').trim();
      }
      // Bullet points - achievements
      else if (line.match(/^[-*]\s+/)) {
        achievements.push(line.replace(/^[-*]\s+/, '').trim());
      }
    }
    
    if (title || company) {
      jobs.push({
        title: title || 'Position',
        company: company || 'Company',
        duration: duration || 'Dates',
        achievements: achievements.length > 0 ? achievements : undefined
      });
    }
  }
  
  return jobs;
}

function parseMarkdownEducation(content: string): {
  degree: string;
  field: string;
  institution: string;
  note: string;
} {
  const lines = content.split('\n').filter(Boolean);
  
  let degree = '';
  let field = '';
  let institution = '';
  let note = '';
  
  for (const line of lines) {
    const cleaned = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim();
    
    if (/bachelor|master|phd|doctorate|associate|B\.?S\.?|M\.?S\.?/i.test(cleaned)) {
      degree = cleaned;
    } else if (/university|college|institute|school/i.test(cleaned)) {
      institution = cleaned;
    } else if (cleaned && !note) {
      note = cleaned;
    }
  }
  
  return { degree, field, institution, note };
}

function parseMarkdownCertifications(content: string): string[] {
  const certifications: string[] = [];
  const lines = content.split('\n').filter(Boolean);
  
  for (const line of lines) {
    const cleaned = line.replace(/^[-*]\s+/, '').replace(/\*\*/g, '').trim();
    if (cleaned.length > 3) {
      certifications.push(cleaned);
    }
  }
  
  return certifications;
}
