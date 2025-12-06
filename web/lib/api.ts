// API client for HireWire backend services

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const MATCHING_ENGINE_URL = process.env.NEXT_PUBLIC_MATCHING_ENGINE_URL || 'http://localhost:8001';

export interface CareerContextData {
  // Career Goals
  short_term_goals?: string;
  long_term_goals?: string;
  dream_role?: string;
  
  // Motivations
  primary_motivations?: string[];
  deal_breakers?: string[];
  
  // Work Preferences
  work_style_preferences?: string[];
  company_culture_preferences?: string[];
  team_size_preference?: string;
  
  // Learning & Growth
  skills_to_develop?: string[];
  learning_style?: string;
  mentorship_importance?: number;
  
  // Values & Impact
  core_values?: string[];
  impact_areas?: string[];
  social_responsibility_importance?: number;
  
  // Career Trajectory
  career_change_openness?: number;
  industry_pivot_interest?: string[];
  leadership_interest?: number;
  
  // Location & Remote
  location_flexibility?: number;
  remote_preference?: string;
  relocation_willingness?: number;
}

export interface QuestionnaireResponse {
  candidateId: string;
  careerContext: CareerContextData;
}

class HireWireAPI {
  private async fetchAPI(endpoint: string, options: RequestInit = {}) {
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Questionnaire endpoints
  async submitQuestionnaire(candidateId: string, data: CareerContextData) {
    return this.fetchAPI('/api/onboarding/career-context', {
      method: 'POST',
      body: JSON.stringify({ candidateId, ...data }),
    });
  }

  async getCareerContext(candidateId: string) {
    return this.fetchAPI(`/api/candidates/${candidateId}/career-context`);
  }

  // Matching endpoints
  async getDailyMatches(candidateId: string) {
    return this.fetchAPI(`/api/matching/daily/${candidateId}`);
  }

  async getMatchScore(candidateId: string, jobId: string) {
    return this.fetchAPI('/api/matching/score', {
      method: 'POST',
      body: JSON.stringify({ candidateId, jobId }),
    });
  }

  async getMatchExplanation(candidateId: string, jobId: string) {
    const matchingUrl = `${MATCHING_ENGINE_URL}/api/explanations/explain`;
    const response = await fetch(matchingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, jobId }),
    });
    
    if (!response.ok) {
      throw new Error(`Matching Engine Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  async compareJobs(candidateId: string, jobId1: string, jobId2: string) {
    const matchingUrl = `${MATCHING_ENGINE_URL}/api/explanations/compare`;
    const response = await fetch(matchingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateId, jobId1, jobId2 }),
    });
    
    if (!response.ok) {
      throw new Error(`Matching Engine Error: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Resume upload
  async uploadResume(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('http://localhost:8000/api/parse', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Resume Parse Error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const api = new HireWireAPI();
