import express from 'express';
import { requireAuth, requireCandidate, AuthRequest } from '../middleware/auth';
import { pool } from '../db/postgres';

const router = express.Router();

// Get current user's profile
router.get('/me', requireAuth, async (req, res) => {
  const { userId, userType } = (req as AuthRequest).user!;
  
  try {
    if (userType === 'candidate') {
      const result = await pool.query(`
        SELECT 
          u.id, u.name, u.email, u.avatar_url, u.github_username,
          cp.*,
          (SELECT json_agg(json_build_object(
            'name', s.name,
            'proficiency', cs.proficiency_level,
            'years', cs.years_experience
          ))
          FROM candidate_skills cs
          JOIN skills s ON s.id = cs.skill_id
          WHERE cs.user_id = u.id) as skills
        FROM users u
        LEFT JOIN candidate_profiles cp ON cp.user_id = u.id
        WHERE u.id = $1
      `, [userId]);
      
      res.json(result.rows[0]);
    } else {
      const result = await pool.query(`
        SELECT u.*, c.*
        FROM users u
        LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.id = $1
      `, [userId]);
      
      res.json(result.rows[0]);
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update candidate profile
router.put('/candidate', requireCandidate, async (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const { 
    professional_summary, 
    years_experience, 
    target_salary_min, 
    target_salary_max,
    bio,
    location
  } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE candidate_profiles SET
        professional_summary = COALESCE($1, professional_summary),
        years_experience = COALESCE($2, years_experience),
        target_salary_min = COALESCE($3, target_salary_min),
        target_salary_max = COALESCE($4, target_salary_max),
        bio = COALESCE($5, bio),
        location = COALESCE($6, location),
        updated_at = NOW()
      WHERE user_id = $7
      RETURNING *
    `, [professional_summary, years_experience, target_salary_min, target_salary_max, bio, location, userId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
