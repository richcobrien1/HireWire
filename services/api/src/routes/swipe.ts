import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { pool } from '../db/postgres';

const router = express.Router();

// Swipe on a job/candidate
router.post('/', requireAuth, async (req, res) => {
  const { userId, userType } = (req as AuthRequest).user!;
  const { target_id, direction } = req.body; // direction: 'right' or 'left'
  
  if (!target_id || !direction) {
    return res.status(400).json({ error: 'target_id and direction required' });
  }
  
  try {
    // Record swipe
    const swipeResult = await pool.query(`
      INSERT INTO swipes (user_id, ${userType === 'candidate' ? 'job_id' : 'candidate_id'}, direction)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, target_id, direction]);
    
    const swipe = swipeResult.rows[0];
    
    // Check for match (both swiped right)
    if (direction === 'right') {
      const matchCheck = await pool.query(`
        SELECT * FROM swipes
        WHERE ${userType === 'candidate' ? 'user_id' : 'job_id'} = $1
          AND ${userType === 'candidate' ? 'job_id' : 'candidate_id'} = $2
          AND direction = 'right'
      `, [target_id, userId]);
      
      if (matchCheck.rows.length > 0) {
        // Create match!
        const matchResult = await pool.query(`
          INSERT INTO matches (${userType === 'candidate' ? 'candidate_id, job_id' : 'job_id, candidate_id'})
          VALUES ($1, $2)
          RETURNING *
        `, [userId, target_id]);
        
        return res.json({
          swipe,
          match: matchResult.rows[0],
          is_match: true
        });
      }
    }
    
    res.json({ swipe, is_match: false });
  } catch (error) {
    console.error('Swipe error:', error);
    res.status(500).json({ error: 'Failed to record swipe' });
  }
});

// Get matches
router.get('/matches', requireAuth, async (req, res) => {
  const { userId, userType } = (req as AuthRequest).user!;
  
  try {
    const result = await pool.query(`
      SELECT 
        m.*,
        ${userType === 'candidate' ? 
          'j.title as job_title, c.name as company_name, c.logo_url as company_logo' :
          'u.name as candidate_name, cp.professional_summary, cp.years_experience'
        }
      FROM matches m
      ${userType === 'candidate' ?
        'JOIN jobs j ON j.id = m.job_id JOIN companies c ON c.id = j.company_id' :
        'JOIN users u ON u.id = m.candidate_id JOIN candidate_profiles cp ON cp.user_id = m.candidate_id'
      }
      WHERE m.${userType === 'candidate' ? 'candidate_id' : 'job_id'} = $1
      ORDER BY m.created_at DESC
    `, [userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

export default router;
