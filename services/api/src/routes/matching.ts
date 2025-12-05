import express from 'express';
import { requireAuth, requireCandidate, AuthRequest } from '../middleware/auth';
import { pool } from '../db/postgres';

const router = express.Router();

// Get daily matches for candidate
router.get('/daily', requireCandidate, async (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  
  try {
    // Get jobs that match candidate's skills (basic algorithm for now)
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
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

export default router;
