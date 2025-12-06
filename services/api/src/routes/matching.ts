import express from 'express';
import { requireAuth, requireCandidate, AuthRequest } from '../middleware/auth';
import { pool } from '../db/postgres';
import axios from 'axios';
import { logger } from '../utils/logger';

const router = express.Router();

const MATCHING_ENGINE_URL = process.env.MATCHING_ENGINE_URL || 'http://localhost:8001';

// Get daily matches for candidate (now using career-enhanced matching)
router.get('/daily', requireCandidate, async (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  
  try {
    // Get candidate profile ID
    const candidateResult = await pool.query(
      'SELECT id FROM candidate_profiles WHERE user_id = $1',
      [userId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    const candidateId = candidateResult.rows[0].id;

    // Call matching engine microservice
    try {
      const response = await axios.get(`${MATCHING_ENGINE_URL}/api/matching/daily/${candidateId}`, {
        timeout: 10000
      });
      
      res.json(response.data);
    } catch (matchingError) {
      // Fallback to basic skill matching if matching engine is unavailable
      logger.warn('Matching engine unavailable, falling back to basic matching');
      
      const result = await pool.query(`
        WITH candidate_skills AS (
          SELECT skill_id
          FROM candidate_skills
          WHERE user_id = $1
        ),
        job_matches AS (
          SELECT 
            j.*,
            c.name as company_name,
            c.logo_url as company_logo,
            COUNT(DISTINCT js.skill_id) as skill_overlap,
            COUNT(DISTINCT js.skill_id) FILTER (WHERE js.required = true) as required_skills_match
          FROM jobs j
          JOIN companies c ON c.id = j.company_id
          LEFT JOIN job_skills js ON js.job_id = j.id
          LEFT JOIN candidate_skills ON candidate_skills.skill_id = js.skill_id
          WHERE j.status = 'active'
            AND j.id NOT IN (
              SELECT job_id FROM swipes WHERE user_id = $1
            )
          GROUP BY j.id, c.id
          HAVING COUNT(DISTINCT js.skill_id) > 0
          ORDER BY skill_overlap DESC, required_skills_match DESC
          LIMIT 10
        )
        SELECT * FROM job_matches
      `, [userId]);
      
      res.json(result.rows);
    }
  } catch (error) {
    logger.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Get detailed match score for specific job
router.get('/score/:jobId', requireCandidate, async (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const jobId = parseInt(req.params.jobId);

  if (isNaN(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  try {
    // Get candidate profile ID
    const candidateResult = await pool.query(
      'SELECT id FROM candidate_profiles WHERE user_id = $1',
      [userId]
    );

    if (candidateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Candidate profile not found' });
    }

    const candidateId = candidateResult.rows[0].id;

    // Call matching engine
    const response = await axios.post(`${MATCHING_ENGINE_URL}/api/matching/score`, {
      candidateId,
      jobId
    }, {
      timeout: 5000
    });

    res.json(response.data);
  } catch (error) {
    logger.error('Get match score error:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    res.status(500).json({ error: 'Failed to calculate match score' });
  }
});

export default router;
