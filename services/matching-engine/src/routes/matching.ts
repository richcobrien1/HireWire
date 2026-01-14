import express, { Request, Response } from 'express';
import { pool, neo4jDriver, redis } from '../db/connections';
import { logger } from '../index';
import axios from 'axios';

const router = express.Router();

interface CareerProfile {
  past_motivations: string[];
  proudest_achievements: string[];
  current_interests: string[];
  ideal_work_environment: string;
  learning_priorities: string[];
  deal_breakers: string[];
  motivations: string[];
  career_trajectory: string;
  five_year_goals: string[];
  dream_companies: string[];
  skills_to_develop: string[];
  long_term_vision: string;
  years_experience: number;
  current_title: string;
}

interface Job {
  id: number;
  title: string;
  description: string;
  required_skills: string[];
  nice_to_have_skills: string[];
  min_experience: number;
  max_experience: number;
  min_salary: number;
  max_salary: number;
  company_name: string;
  company_description: string;
}

interface MatchScore {
  candidate_id: number;
  job_id: number;
  job_title: string;
  company_name: string;
  overall_score: number;
  breakdown: {
    skill_match: number;
    career_fit: number;
    culture_fit: number;
    learning_opportunities: number;
    motivation_alignment: number;
    experience_match: number;
  };
  reasons: {
    career: string;
    culture: string;
    learning: string;
    motivation: string;
  };
  recommendation: string;
}

// Matching weights
const WEIGHTS = {
  skill_overlap: 0.30,
  career_fit: 0.25,
  culture_fit: 0.15,
  learning_opportunities: 0.15,
  motivation_alignment: 0.10,
  experience_level: 0.05
};

// Get candidate career profile
async function getCandidateProfile(candidateId: number): Promise<CareerProfile | null> {
  const result = await pool.query(`
    SELECT 
      cp.past_motivations,
      cp.proudest_achievements,
      cp.current_interests,
      cp.ideal_work_environment,
      cp.learning_priorities,
      cp.deal_breakers,
      cp.motivations,
      cp.career_trajectory,
      cp.five_year_goals,
      cp.dream_companies,
      cp.skills_to_develop,
      cp.long_term_vision,
      cp.years_experience,
      cp.title
    FROM candidate_profiles cp
    WHERE cp.id = $1
  `, [candidateId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    past_motivations: row.past_motivations || [],
    proudest_achievements: row.proudest_achievements || [],
    current_interests: row.current_interests || [],
    ideal_work_environment: row.ideal_work_environment || '',
    learning_priorities: row.learning_priorities || [],
    deal_breakers: row.deal_breakers || [],
    motivations: row.motivations || [],
    career_trajectory: row.career_trajectory || '',
    five_year_goals: row.five_year_goals || [],
    dream_companies: row.dream_companies || [],
    skills_to_develop: row.skills_to_develop || [],
    long_term_vision: row.long_term_vision || '',
    years_experience: row.years_experience || 0,
    current_title: row.title || ''
  };
}

// Get job opportunities
async function getJobOpportunities(jobId: number): Promise<Job | null> {
  const result = await pool.query(`
    SELECT 
      j.id,
      j.title,
      j.description,
      j.required_skills,
      j.nice_to_have_skills,
      j.min_experience,
      j.max_experience,
      j.min_salary,
      j.max_salary,
      c.name as company_name,
      c.description as company_description
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    WHERE j.id = $1
  `, [jobId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    required_skills: row.required_skills || [],
    nice_to_have_skills: row.nice_to_have_skills || [],
    min_experience: row.min_experience || 0,
    max_experience: row.max_experience || 20,
    min_salary: row.min_salary,
    max_salary: row.max_salary,
    company_name: row.company_name,
    company_description: row.company_description
  };
}

// Calculate skill overlap (simplified for now)
function calculateSkillOverlap(candidate: CareerProfile, job: Job): number {
  // This would integrate with existing skill matching logic
  // For now, return a placeholder that can be enhanced
  return 0.75;
}

// Calculate career fit using Neo4j
async function calculateCareerFit(candidate: CareerProfile, job: Job): Promise<{ score: number; reason: string }> {
  let score = 0.0;
  const reasons: string[] = [];

  // Check if job title aligns with 5-year goals
  const fiveYearGoals = candidate.five_year_goals;
  const jobTitle = job.title.toLowerCase();

  for (const goal of fiveYearGoals) {
    if (goal.toLowerCase().includes(jobTitle) || jobTitle.includes(goal.toLowerCase())) {
      score += 0.4;
      reasons.push(`Job title matches 5-year goal: ${goal}`);
      break;
    }
  }

  // Check trajectory alignment using Neo4j
  if (candidate.career_trajectory) {
    const session = neo4jDriver.session();
    try {
      const result = await session.run(`
        MATCH (t:CareerTrajectory {key: $trajectory})
        RETURN t.typical_roles as roles
      `, { trajectory: candidate.career_trajectory });

      if (result.records.length > 0) {
        const typicalRoles = result.records[0].get('roles') as string[];
        for (const role of typicalRoles) {
          if (role.toLowerCase().includes(jobTitle) || jobTitle.includes(role.toLowerCase())) {
            score += 0.3;
            reasons.push(`Aligns with ${candidate.career_trajectory} path`);
            break;
          }
        }
      }
    } finally {
      await session.close();
    }
  }

  // Check learning opportunities match skills to develop
  const skillsToDevelop = new Set(candidate.skills_to_develop);
  const niceToHave = new Set(job.nice_to_have_skills);
  const intersection = new Set([...skillsToDevelop].filter(x => niceToHave.has(x)));

  if (intersection.size > 0) {
    score += Math.min(0.3, intersection.size * 0.1);
    reasons.push(`Offers learning in ${intersection.size} desired skills`);
  }

  return { score: Math.min(score, 1.0), reason: reasons.join(' | ') || 'Limited career alignment' };
}

// Calculate culture fit (simplified - would use Qdrant in production)
function calculateCultureFit(candidate: CareerProfile, job: Job): { score: number; reason: string } {
  const idealEnv = candidate.ideal_work_environment.toLowerCase();
  const companyDesc = job.company_description.toLowerCase();

  if (!idealEnv) {
    return { score: 0.5, reason: 'No culture preference specified' };
  }

  // Simple keyword matching (would be semantic search in production)
  const keywords = idealEnv.split(' ').filter(w => w.length > 4);
  let matches = 0;
  
  for (const keyword of keywords) {
    if (companyDesc.includes(keyword)) {
      matches++;
    }
  }

  const score = Math.min(matches / Math.max(keywords.length, 1), 1.0);
  return { score, reason: score > 0.6 ? 'Strong culture alignment' : 'Moderate culture fit' };
}

// Calculate learning opportunities
function calculateLearningOpportunities(candidate: CareerProfile, job: Job): { score: number; reason: string } {
  let score = 0.0;
  const reasons: string[] = [];

  const skillsToDevelop = new Set(candidate.skills_to_develop);
  const requiredSkills = new Set(job.required_skills);
  const niceToHave = new Set(job.nice_to_have_skills);

  const learningOpportunities = new Set([...requiredSkills, ...niceToHave].filter(s => skillsToDevelop.has(s)));

  if (learningOpportunities.size > 0) {
    score = Math.min(learningOpportunities.size * 0.25, 1.0);
    reasons.push(`Learn ${learningOpportunities.size} desired skills`);
  }

  // Check for growth opportunity
  const currentTitle = candidate.current_title.toLowerCase();
  const jobTitleLower = job.title.toLowerCase();

  if (jobTitleLower.includes('senior') && !currentTitle.includes('senior')) {
    score += 0.2;
    reasons.push('Step up to senior role');
  } else if (jobTitleLower.includes('staff') || jobTitleLower.includes('principal')) {
    score += 0.2;
    reasons.push('Advanced IC opportunity');
  }

  return { score: Math.min(score, 1.0), reason: reasons.join(' | ') || 'Limited learning opportunities' };
}

// Calculate motivation alignment
function calculateMotivationAlignment(candidate: CareerProfile, job: Job): { score: number; reason: string } {
  const motivations = candidate.motivations;

  if (motivations.length === 0) {
    return { score: 0.5, reason: 'No motivations specified' };
  }

  let score = 0.0;
  const matched: string[] = [];

  const jobDescription = job.description.toLowerCase();
  const companyDescription = job.company_description.toLowerCase();

  const motivationKeywords: Record<string, string[]> = {
    'Technical challenges': ['complex', 'challenging', 'scale', 'distributed', 'architecture'],
    'Career growth': ['growth', 'mentorship', 'learning', 'development', 'advance'],
    'Making an impact': ['impact', 'users', 'mission', 'change', 'difference'],
    'Work-life balance': ['balance', 'flexible', 'remote', 'hours', 'pto'],
    'Team collaboration': ['team', 'collaborative', 'agile', 'pair programming'],
    'Company mission': ['mission', 'vision', 'purpose', 'values'],
    'Autonomy and ownership': ['ownership', 'autonomy', 'independent', 'self-directed'],
    'Financial compensation': ['competitive', 'equity', 'stock', 'options', 'benefits']
  };

  for (const motivation of motivations) {
    const keywords = motivationKeywords[motivation] || [];
    for (const keyword of keywords) {
      if (jobDescription.includes(keyword) || companyDescription.includes(keyword)) {
        score += 0.3;
        matched.push(motivation);
        break;
      }
    }
  }

  return {
    score: Math.min(score, 1.0),
    reason: matched.length > 0 ? `Aligns with: ${matched.join(', ')}` : 'Limited motivation match'
  };
}

// Main matching function
async function calculateMatchScore(candidateId: number, jobId: number): Promise<MatchScore | null> {
  // Check cache first
  const cacheKey = `career:match_breakdown:${candidateId}:${jobId}`;
  const cached = await redis.get(cacheKey);
  
  if (cached) {
    logger.info(`Cache hit for match ${candidateId}-${jobId}`);
    return JSON.parse(cached);
  }

  // Fetch data
  const [candidate, job] = await Promise.all([
    getCandidateProfile(candidateId),
    getJobOpportunities(jobId)
  ]);

  if (!candidate || !job) return null;

  // Calculate component scores
  const skillScore = calculateSkillOverlap(candidate, job);
  const careerFit = await calculateCareerFit(candidate, job);
  const cultureFit = calculateCultureFit(candidate, job);
  const learningOps = calculateLearningOpportunities(candidate, job);
  const motivationAlign = calculateMotivationAlignment(candidate, job);

  // Experience match
  const expDiff = Math.abs(candidate.years_experience - job.min_experience);
  const experienceScore = Math.max(0, 1 - (expDiff / 10));

  // Weighted total
  const totalScore = (
    skillScore * WEIGHTS.skill_overlap +
    careerFit.score * WEIGHTS.career_fit +
    cultureFit.score * WEIGHTS.culture_fit +
    learningOps.score * WEIGHTS.learning_opportunities +
    motivationAlign.score * WEIGHTS.motivation_alignment +
    experienceScore * WEIGHTS.experience_level
  );

  const result: MatchScore = {
    candidate_id: candidateId,
    job_id: jobId,
    job_title: job.title,
    company_name: job.company_name,
    overall_score: Math.round(totalScore * 1000) / 1000,
    breakdown: {
      skill_match: Math.round(skillScore * 1000) / 1000,
      career_fit: Math.round(careerFit.score * 1000) / 1000,
      culture_fit: Math.round(cultureFit.score * 1000) / 1000,
      learning_opportunities: Math.round(learningOps.score * 1000) / 1000,
      motivation_alignment: Math.round(motivationAlign.score * 1000) / 1000,
      experience_match: Math.round(experienceScore * 1000) / 1000
    },
    reasons: {
      career: careerFit.reason,
      culture: cultureFit.reason,
      learning: learningOps.reason,
      motivation: motivationAlign.reason
    },
    recommendation: getRecommendation(totalScore)
  };

  // Cache for 30 minutes
  await redis.setex(cacheKey, 1800, JSON.stringify(result));

  return result;
}

function getRecommendation(score: number): string {
  if (score >= 0.85) return '🔥 Excellent match - Highly recommended';
  if (score >= 0.70) return '✅ Strong match - Good fit';
  if (score >= 0.55) return '👍 Moderate match - Worth considering';
  return '🤔 Weak match - May not be ideal';
}

// Routes

// POST /api/matching/score - Calculate match score for candidate-job pair
router.post('/score', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobId } = req.body;

    if (!candidateId || !jobId) {
      return res.status(400).json({ error: 'candidateId and jobId are required' });
    }

    const score = await calculateMatchScore(candidateId, jobId);

    if (!score) {
      return res.status(404).json({ error: 'Candidate or job not found' });
    }

    res.json(score);
  } catch (error) {
    logger.error('Match score calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

// POST /api/matching/batch - Calculate scores for multiple job IDs
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { candidateId, jobIds } = req.body;

    if (!candidateId || !Array.isArray(jobIds)) {
      return res.status(400).json({ error: 'candidateId and jobIds array are required' });
    }

    const scores = await Promise.all(
      jobIds.map(jobId => calculateMatchScore(candidateId, jobId))
    );

    const validScores = scores.filter(s => s !== null) as MatchScore[];
    validScores.sort((a, b) => b.overall_score - a.overall_score);

    res.json(validScores);
  } catch (error) {
    logger.error('Batch match calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate batch matches' });
  }
});

// GET /api/matching/daily/:candidateId - Get daily matches for candidate
router.get('/daily/:candidateId', async (req: Request, res: Response) => {
  try {
    const candidateId = parseInt(req.params.candidateId);

    if (isNaN(candidateId)) {
      return res.status(400).json({ error: 'Invalid candidate ID' });
    }

    // Get active jobs that candidate hasn't swiped on
    const jobsResult = await pool.query(`
      SELECT j.id
      FROM jobs j
      WHERE j.status = 'active'
        AND j.id NOT IN (
          SELECT job_id FROM swipes WHERE user_id = (
            SELECT user_id FROM candidate_profiles WHERE id = $1
          )
        )
      LIMIT 50
    `, [candidateId]);

    const jobIds = jobsResult.rows.map(row => row.id);

    if (jobIds.length === 0) {
      return res.json([]);
    }

    // Calculate scores for all jobs
    const scores = await Promise.all(
      jobIds.map(jobId => calculateMatchScore(candidateId, jobId))
    );

    const validScores = scores.filter(s => s !== null) as MatchScore[];
    validScores.sort((a, b) => b.overall_score - a.overall_score);

    // Return top 10
    res.json(validScores.slice(0, 10));
  } catch (error) {
    logger.error('Daily matches error:', error);
    res.status(500).json({ error: 'Failed to fetch daily matches' });
  }
});

export default router;
