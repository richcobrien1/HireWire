import express, { Request, Response } from 'express';
import { logger } from '../index';
import axios from 'axios';

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MATCHING_ENGINE_URL = process.env.MATCHING_ENGINE_URL || 'http://localhost:8001';

interface MatchExplanationRequest {
  candidateId: number;
  jobId: number;
}

interface MatchExplanation {
  summary: string;
  strengths: string[];
  growth_areas: string[];
  career_fit_analysis: string;
  why_this_works: string;
  next_steps: string[];
}

// Generate AI explanation for a match
router.post('/explain', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobId } = req.body as MatchExplanationRequest;

    if (!candidateId || !jobId) {
      return res.status(400).json({ error: 'candidateId and jobId are required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI explanation service not configured' });
    }

    // Get match score from matching engine
    const matchResponse = await axios.post(`${MATCHING_ENGINE_URL}/api/matching/score`, {
      candidateId,
      jobId
    }, { timeout: 5000 });

    const matchData = matchResponse.data;

    // Create prompt for GPT-4
    const prompt = `You are a career counselor explaining why a candidate is a good match for a job.

Match Details:
- Job: ${matchData.job_title} at ${matchData.company_name}
- Overall Match Score: ${(matchData.overall_score * 100).toFixed(0)}%
- Recommendation: ${matchData.recommendation}

Component Scores:
- Skill Match: ${(matchData.breakdown.skill_match * 100).toFixed(0)}%
- Career Fit: ${(matchData.breakdown.career_fit * 100).toFixed(0)}%
- Culture Fit: ${(matchData.breakdown.culture_fit * 100).toFixed(0)}%
- Learning Opportunities: ${(matchData.breakdown.learning_opportunities * 100).toFixed(0)}%
- Motivation Alignment: ${(matchData.breakdown.motivation_alignment * 100).toFixed(0)}%
- Experience Match: ${(matchData.breakdown.experience_match * 100).toFixed(0)}%

Reasons:
- Career: ${matchData.reasons.career}
- Culture: ${matchData.reasons.culture}
- Learning: ${matchData.reasons.learning}
- Motivation: ${matchData.reasons.motivation}

Based on this data, provide a comprehensive match explanation in JSON format with the following structure:
{
  "summary": "2-3 sentence overview of why this is a good/great/excellent match",
  "strengths": ["3-5 bullet points highlighting the strongest aspects of this match"],
  "growth_areas": ["2-3 areas where the candidate would grow in this role"],
  "career_fit_analysis": "Paragraph explaining how this role fits the candidate's career trajectory and goals",
  "why_this_works": "Paragraph explaining the synergy between candidate motivations and job characteristics",
  "next_steps": ["3-4 actionable suggestions for the candidate to prepare for this opportunity"]
}

Be encouraging but honest. Focus on career growth, skill development, and cultural fit.`;

    // Call OpenAI API
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert career counselor helping candidates understand job matches.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const explanation: MatchExplanation = JSON.parse(
      openaiResponse.data.choices[0].message.content
    );

    // Return explanation with match data
    res.json({
      match: matchData,
      explanation
    });

  } catch (error) {
    logger.error('Match explanation error:', error);
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return res.status(404).json({ error: 'Match not found' });
      }
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: 'Matching engine unavailable' });
      }
    }
    
    res.status(500).json({ error: 'Failed to generate match explanation' });
  }
});

// Generate comparison between multiple jobs
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobIds } = req.body;

    if (!candidateId || !Array.isArray(jobIds) || jobIds.length < 2) {
      return res.status(400).json({ error: 'candidateId and at least 2 jobIds are required' });
    }

    if (jobIds.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 jobs can be compared at once' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI comparison service not configured' });
    }

    // Get match scores for all jobs
    const matchResponse = await axios.post(`${MATCHING_ENGINE_URL}/api/matching/batch`, {
      candidateId,
      jobIds
    }, { timeout: 10000 });

    const matches = matchResponse.data;

    // Create comparison prompt
    const jobComparisons = matches.map((m: any, idx: number) => `
Job ${idx + 1}: ${m.job_title} at ${m.company_name}
- Overall Score: ${(m.overall_score * 100).toFixed(0)}%
- Skill Match: ${(m.breakdown.skill_match * 100).toFixed(0)}%
- Career Fit: ${(m.breakdown.career_fit * 100).toFixed(0)}%
- Culture Fit: ${(m.breakdown.culture_fit * 100).toFixed(0)}%
- Learning: ${(m.breakdown.learning_opportunities * 100).toFixed(0)}%
- Career Reason: ${m.reasons.career}
- Culture Reason: ${m.reasons.culture}
- Learning Reason: ${m.reasons.learning}
`).join('\n');

    const prompt = `You are a career counselor helping a candidate compare multiple job opportunities.

Here are the candidate's matches:

${jobComparisons}

Provide a comparison analysis in JSON format:
{
  "best_overall": "Which job is the best overall match and why (2-3 sentences)",
  "best_for_career_growth": "Which job offers the most career growth and why",
  "best_for_skill_development": "Which job offers the best learning opportunities and why",
  "best_for_culture_fit": "Which job is the best cultural match and why",
  "trade_offs": ["3-4 key trade-offs the candidate should consider"],
  "recommendation": "Final recommendation with reasoning (paragraph)"
}

Be objective and help the candidate make an informed decision.`;

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert career counselor helping candidates compare job opportunities.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const comparison = JSON.parse(
      openaiResponse.data.choices[0].message.content
    );

    res.json({
      matches,
      comparison
    });

  } catch (error) {
    logger.error('Job comparison error:', error);
    res.status(500).json({ error: 'Failed to generate job comparison' });
  }
});

// Get career insights for candidate
router.post('/insights/:candidateId', async (req: Request, res: Response) => {
  try {
    const candidateId = parseInt(req.params.candidateId);

    if (isNaN(candidateId)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(503).json({ error: 'AI insights service not configured' });
    }

    // Get top matches for candidate
    const matchesResponse = await axios.get(
      `${MATCHING_ENGINE_URL}/api/matching/daily/${candidateId}`,
      { timeout: 10000 }
    );

    const matches = matchesResponse.data.slice(0, 5); // Top 5

    if (matches.length === 0) {
      return res.json({
        insights: {
          summary: 'No current matches available. Complete your career context profile to improve matching.',
          patterns: [],
          suggestions: [
            'Complete the career context questionnaire',
            'Add more skills to your profile',
            'Upload an updated resume'
          ]
        }
      });
    }

    // Analyze patterns
    const avgCareerFit = matches.reduce((sum: number, m: any) => sum + m.breakdown.career_fit, 0) / matches.length;
    const avgCultureFit = matches.reduce((sum: number, m: any) => sum + m.breakdown.culture_fit, 0) / matches.length;
    const avgLearning = matches.reduce((sum: number, m: any) => sum + m.breakdown.learning_opportunities, 0) / matches.length;

    const prompt = `You are a career coach analyzing a candidate's job match patterns.

Top 5 Matches:
${matches.map((m: any, idx: number) => `
${idx + 1}. ${m.job_title} at ${m.company_name} (${(m.overall_score * 100).toFixed(0)}% match)
   - Career Fit: ${(m.breakdown.career_fit * 100).toFixed(0)}%
   - Culture Fit: ${(m.breakdown.culture_fit * 100).toFixed(0)}%
   - Learning: ${(m.breakdown.learning_opportunities * 100).toFixed(0)}%
`).join('\n')}

Average Scores:
- Career Fit: ${(avgCareerFit * 100).toFixed(0)}%
- Culture Fit: ${(avgCultureFit * 100).toFixed(0)}%
- Learning Opportunities: ${(avgLearning * 100).toFixed(0)}%

Provide career insights in JSON format:
{
  "summary": "2-3 sentence overview of the candidate's match patterns",
  "patterns": ["3-4 key patterns you notice in their matches"],
  "strengths": ["2-3 strengths based on high-scoring areas"],
  "opportunities": ["2-3 areas for improvement based on low-scoring areas"],
  "suggestions": ["4-5 actionable suggestions to improve their matches and career prospects"]
}

Be constructive and actionable.`;

    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'You are an expert career coach providing personalized insights.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 1200
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    const insights = JSON.parse(
      openaiResponse.data.choices[0].message.content
    );

    res.json({
      insights,
      match_summary: {
        total_matches: matches.length,
        avg_career_fit: Math.round(avgCareerFit * 100),
        avg_culture_fit: Math.round(avgCultureFit * 100),
        avg_learning: Math.round(avgLearning * 100)
      }
    });

  } catch (error) {
    logger.error('Career insights error:', error);
    res.status(500).json({ error: 'Failed to generate career insights' });
  }
});

export default router;
