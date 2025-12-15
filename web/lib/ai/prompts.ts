/**
 * AI Prompt Templates
 * 
 * Centralized prompt management for consistent AI interactions
 */

import type { CareerContext, Match, Job, Profile, RAGContext } from '../types';

// ==================== SYSTEM PROMPTS ====================

export const SYSTEM_PROMPTS = {
  CAREER_COACH: `You are an expert career coach with 20+ years of experience helping professionals navigate their careers. You provide:
- Personalized, actionable advice based on each individual's unique situation
- Honest feedback that balances encouragement with realism
- Specific next steps rather than vague suggestions
- Evidence-based recommendations grounded in career development research
- Empathetic support that acknowledges career anxiety and challenges

Communication style:
- Direct and conversational
- Use "you" and "your" to make it personal
- Break complex advice into clear steps
- Ask clarifying questions when needed
- Celebrate wins and progress

Always ground your advice in the user's actual career context, skills, and goals provided in the conversation.`,

  MATCH_EXPLAINER: `You are a job matching expert who helps candidates understand why certain opportunities are good fits for them.

Your role:
- Explain match scores in clear, understandable terms
- Highlight specific skills and experiences that align with job requirements
- Identify growth opportunities in each role
- Point out potential concerns or misalignments honestly
- Help candidates make informed decisions about which roles to pursue

Communication style:
- Clear and objective
- Balance positives with areas for growth
- Use specific examples from their profile and the job description
- Provide context about the company and role when available
- End with a clear recommendation (pursue, consider, or pass)

Focus on helping the candidate see both the opportunity and the reality of each match.`,

  RESUME_ANALYZER: `You are a professional resume consultant who has reviewed thousands of resumes across all industries and career levels.

Your expertise:
- Identify specific ways to strengthen resume content
- Optimize for Applicant Tracking Systems (ATS)
- Ensure clarity, impact, and professional presentation
- Tailor feedback to the candidate's target roles
- Provide concrete examples of improvements

Communication style:
- Constructive and specific
- Focus on actionable changes
- Explain the "why" behind each suggestion
- Prioritize high-impact improvements first
- Use before/after examples when helpful

Your goal is to help candidates create resumes that get them interviews for their target roles.`,

  GENERAL_ASSISTANT: `You are HireWire's AI assistant, helping job seekers navigate their career journey.

You can help with:
- Career advice and planning
- Job search strategies
- Resume and application questions
- Interview preparation
- Understanding match scores
- Navigating the platform

Communication style:
- Friendly and helpful
- Concise but thorough
- Ask clarifying questions
- Provide specific guidance
- Direct users to appropriate resources

Always refer to the user's actual data (profile, matches, activity) when available to provide personalized help.`,
};

// ==================== CONTEXT BUILDERS ====================

/**
 * Build career context section for prompts
 */
export function buildCareerContextPrompt(profile: Profile, careerContext?: CareerContext): string {
  let prompt = `USER PROFILE:\n`;
  prompt += `- Name: ${profile.displayName}\n`;
  prompt += `- Location: ${profile.location || 'Not specified'}\n`;
  prompt += `- Bio: ${profile.bio || 'Not provided'}\n\n`;

  if (careerContext) {
    prompt += `CAREER CONTEXT:\n`;
    
    // Skills
    if (careerContext.skills && careerContext.skills.length > 0) {
      const topSkills = careerContext.skills.slice(0, 10);
      prompt += `- Top Skills: ${topSkills.map(s => `${s.name} (${s.yearsOfExperience}y, proficiency: ${s.proficiencyLevel}/5)`).join(', ')}\n`;
    }

    // Experience
    if (careerContext.experiences && careerContext.experiences.length > 0) {
      prompt += `- Experience:\n`;
      careerContext.experiences.forEach(exp => {
        prompt += `  * ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})\n`;
      });
    }

    // Career goals
    if (careerContext.careerGoals) {
      prompt += `- Career Goals: ${careerContext.careerGoals}\n`;
    }

    // Learning interests
    if (careerContext.learningInterests && careerContext.learningInterests.length > 0) {
      prompt += `- Learning Interests: ${careerContext.learningInterests.join(', ')}\n`;
    }

    // Work preferences
    if (careerContext.workEnvironmentPreferences && careerContext.workEnvironmentPreferences.length > 0) {
      prompt += `- Work Preferences: ${careerContext.workEnvironmentPreferences.join(', ')}\n`;
    }
  }

  return prompt;
}

/**
 * Build match context for explanations
 */
export function buildMatchContextPrompt(match: Match, job: Job): string {
  let prompt = `MATCH DETAILS:\n`;
  prompt += `- Overall Score: ${match.overallScore}%\n`;
  prompt += `- Match Status: ${match.status}\n\n`;

  prompt += `SCORE BREAKDOWN:\n`;
  prompt += `- Skills Match: ${match.scores.skillsMatch}%\n`;
  prompt += `- Career Fit: ${match.scores.careerFit}%\n`;
  prompt += `- Culture Fit: ${match.scores.cultureFit}%\n`;
  prompt += `- Learning Potential: ${match.scores.learningPotential}%\n`;
  prompt += `- Motivation Alignment: ${match.scores.motivationAlignment}%\n`;
  prompt += `- Experience Match: ${match.scores.experienceMatch}%\n\n`;

  prompt += `JOB DETAILS:\n`;
  prompt += `- Title: ${job.title}\n`;
  prompt += `- Company: ${job.companyName}\n`;
  prompt += `- Location: ${job.location}\n`;
  prompt += `- Salary Range: ${job.salaryRange || 'Not specified'}\n`;
  prompt += `- Work Type: ${job.workType}\n`;
  prompt += `- Description: ${job.description}\n\n`;

  if (job.requirements && job.requirements.length > 0) {
    prompt += `- Requirements:\n`;
    job.requirements.forEach(req => {
      prompt += `  * ${req}\n`;
    });
  }

  if (job.skills && job.skills.length > 0) {
    prompt += `- Required Skills: ${job.skills.join(', ')}\n`;
  }

  return prompt;
}

/**
 * Build RAG context section
 */
export function buildRAGContextPrompt(ragContext: RAGContext): string {
  let prompt = '';

  if (ragContext.careerContext.length > 0) {
    prompt += `RELEVANT CAREER CONTEXT (from vector search):\n`;
    ragContext.careerContext.forEach((source, idx) => {
      prompt += `[${idx + 1}] (relevance: ${source.relevanceScore.toFixed(2)}) ${source.content}\n`;
    });
    prompt += '\n';
  }

  if (ragContext.jobs.length > 0) {
    prompt += `RELEVANT JOBS:\n`;
    ragContext.jobs.forEach((source, idx) => {
      prompt += `[${idx + 1}] (relevance: ${source.relevanceScore.toFixed(2)}) ${source.content}\n`;
    });
    prompt += '\n';
  }

  if (ragContext.skills.length > 0) {
    prompt += `RELEVANT SKILLS & KNOWLEDGE:\n`;
    ragContext.skills.forEach((source, idx) => {
      prompt += `[${idx + 1}] (relevance: ${source.relevanceScore.toFixed(2)}) ${source.content}\n`;
    });
    prompt += '\n';
  }

  if (ragContext.conversationHistory.length > 0) {
    prompt += `CONVERSATION HISTORY:\n`;
    ragContext.conversationHistory.forEach((source) => {
      prompt += `${source.content}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}

// ==================== PROMPT TEMPLATES ====================

/**
 * Career advice prompt
 */
export function buildCareerAdvicePrompt(
  userMessage: string,
  profile: Profile,
  careerContext?: CareerContext,
  ragContext?: RAGContext
): string {
  let prompt = SYSTEM_PROMPTS.CAREER_COACH + '\n\n';
  prompt += buildCareerContextPrompt(profile, careerContext);
  
  if (ragContext) {
    prompt += '\n' + buildRAGContextPrompt(ragContext);
  }

  prompt += `\nUSER QUESTION:\n${userMessage}\n\n`;
  prompt += `Provide personalized career advice based on the user's profile and context. Be specific, actionable, and encouraging.`;

  return prompt;
}

/**
 * Match explanation prompt
 */
export function buildMatchExplanationPrompt(
  match: Match,
  job: Job,
  profile: Profile,
  careerContext?: CareerContext
): string {
  let prompt = SYSTEM_PROMPTS.MATCH_EXPLAINER + '\n\n';
  prompt += buildCareerContextPrompt(profile, careerContext);
  prompt += '\n' + buildMatchContextPrompt(match, job);

  prompt += `\nExplain this match to the candidate. Focus on:\n`;
  prompt += `1. Why the match score is ${match.overallScore}%\n`;
  prompt += `2. Specific strengths that align with the role\n`;
  prompt += `3. Growth opportunities this job offers\n`;
  prompt += `4. Any concerns or gaps to address\n`;
  prompt += `5. Clear recommendation on whether to pursue this opportunity\n`;

  return prompt;
}

/**
 * Resume analysis prompt
 */
export function buildResumeAnalysisPrompt(
  resumeContent: string,
  targetRoles?: string[],
  profile?: Profile
): string {
  let prompt = SYSTEM_PROMPTS.RESUME_ANALYZER + '\n\n';

  if (profile) {
    prompt += `CANDIDATE BACKGROUND:\n`;
    prompt += `- Name: ${profile.displayName}\n`;
    prompt += `- Current role level: ${profile.experience || 'Not specified'}\n\n`;
  }

  if (targetRoles && targetRoles.length > 0) {
    prompt += `TARGET ROLES:\n`;
    targetRoles.forEach(role => {
      prompt += `- ${role}\n`;
    });
    prompt += '\n';
  }

  prompt += `RESUME CONTENT:\n${resumeContent}\n\n`;

  prompt += `Analyze this resume and provide:\n`;
  prompt += `1. Overall assessment (score out of 100)\n`;
  prompt += `2. Section-by-section feedback\n`;
  prompt += `3. ATS optimization suggestions\n`;
  prompt += `4. Missing keywords for target roles\n`;
  prompt += `5. Specific improvements with examples\n\n`;
  prompt += `Structure your response as JSON matching the ResumeAnalysis interface.`;

  return prompt;
}

/**
 * Job comparison prompt
 */
export function buildJobComparisonPrompt(
  jobs: { job: Job; match?: Match }[],
  profile: Profile,
  careerContext?: CareerContext
): string {
  let prompt = SYSTEM_PROMPTS.MATCH_EXPLAINER + '\n\n';
  prompt += buildCareerContextPrompt(profile, careerContext);

  prompt += `\nJOBS TO COMPARE:\n`;
  jobs.forEach((item, idx) => {
    prompt += `\n[Job ${idx + 1}] ${item.job.title} at ${item.job.companyName}\n`;
    prompt += `- Match Score: ${item.match?.overallScore || 'N/A'}%\n`;
    prompt += `- Salary: ${item.job.salaryRange || 'Not specified'}\n`;
    prompt += `- Location: ${item.job.location}\n`;
    prompt += `- Work Type: ${item.job.workType}\n`;
    prompt += `- Description: ${item.job.description.substring(0, 200)}...\n`;
  });

  prompt += `\nCompare these jobs and provide:\n`;
  prompt += `1. Side-by-side comparison across key dimensions (compensation, growth, culture, work-life balance)\n`;
  prompt += `2. Which job is strongest in each dimension and why\n`;
  prompt += `3. Overall recommendation on which role to prioritize\n`;
  prompt += `4. Rationale for your recommendation based on the user's goals and context\n\n`;
  prompt += `Structure your response as JSON matching the JobComparison interface.`;

  return prompt;
}

/**
 * General query prompt
 */
export function buildGeneralQueryPrompt(
  userMessage: string,
  ragContext?: RAGContext
): string {
  let prompt = SYSTEM_PROMPTS.GENERAL_ASSISTANT + '\n\n';
  
  if (ragContext) {
    prompt += buildRAGContextPrompt(ragContext);
  }

  prompt += `\nUSER QUESTION:\n${userMessage}\n\n`;
  prompt += `Provide a helpful, accurate response. If the question is about something specific to the user (their matches, profile, etc.), use the provided context. If you don't have enough information, ask clarifying questions.`;

  return prompt;
}

// ==================== SUGGESTION PROMPTS ====================

/**
 * Generate career tip suggestions
 */
export function buildCareerTipPrompt(
  profile: Profile,
  careerContext: CareerContext,
  recentActivity: {
    swipes?: number;
    matches?: number;
    messages?: number;
  }
): string {
  let prompt = `Generate 3-5 personalized career tips for this user.\n\n`;
  prompt += buildCareerContextPrompt(profile, careerContext);

  prompt += `\nRECENT ACTIVITY:\n`;
  prompt += `- Swipes: ${recentActivity.swipes || 0}\n`;
  prompt += `- Matches: ${recentActivity.matches || 0}\n`;
  prompt += `- Messages: ${recentActivity.messages || 0}\n\n`;

  prompt += `Generate tips that are:\n`;
  prompt += `1. Specific to their career stage and goals\n`;
  prompt += `2. Actionable (can be done this week)\n`;
  prompt += `3. Relevant to their recent activity\n`;
  prompt += `4. Encouraging but realistic\n\n`;
  prompt += `Return as JSON array of AISuggestion objects.`;

  return prompt;
}

/**
 * Generate skill suggestions
 */
export function buildSkillSuggestionPrompt(
  careerContext: CareerContext,
  targetJobs: Job[]
): string {
  let prompt = `Analyze skill gaps and suggest learning priorities.\n\n`;
  
  prompt += `CURRENT SKILLS:\n`;
  careerContext.skills?.forEach(skill => {
    prompt += `- ${skill.name} (${skill.yearsOfExperience}y, level ${skill.proficiencyLevel}/5)\n`;
  });

  prompt += `\nTARGET JOBS:\n`;
  targetJobs.forEach(job => {
    prompt += `- ${job.title}: requires ${job.skills?.join(', ')}\n`;
  });

  prompt += `\nGenerate 3-5 skill learning suggestions that:\n`;
  prompt += `1. Fill gaps for target roles\n`;
  prompt += `2. Build on existing strengths\n`;
  prompt += `3. Are realistic to learn in 3-6 months\n`;
  prompt += `4. Include specific learning resources\n\n`;
  prompt += `Return as JSON array of AISuggestion objects.`;

  return prompt;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Truncate long text while preserving meaning
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format conversation history for context
 */
export function formatConversationHistory(messages: { role: string; content: string }[]): string {
  return messages
    .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Limit prompt tokens
 */
export function limitPromptTokens(prompt: string, maxTokens: number = 4000): string {
  const estimatedTokens = estimateTokens(prompt);
  if (estimatedTokens <= maxTokens) return prompt;

  const targetLength = maxTokens * 4; // Convert tokens back to chars
  return truncateText(prompt, targetLength);
}
