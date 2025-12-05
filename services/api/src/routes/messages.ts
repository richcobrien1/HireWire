import express from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { pool } from '../db/postgres';

const router = express.Router();

// Send message (requires match)
router.post('/', requireAuth, async (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const { match_id, content } = req.body;
  
  if (!match_id || !content) {
    return res.status(400).json({ error: 'match_id and content required' });
  }
  
  try {
    // Verify match exists and user is part of it
    const matchCheck = await pool.query(
      'SELECT * FROM matches WHERE id = $1 AND (candidate_id = $2 OR job_id IN (SELECT id FROM jobs WHERE company_id = (SELECT company_id FROM users WHERE id = $2)))',
      [match_id, userId]
    );
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or unauthorized' });
    }
    
    // Create message
    const result = await pool.query(`
      INSERT INTO messages (match_id, sender_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [match_id, userId, content]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for a match
router.get('/match/:matchId', requireAuth, async (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const { matchId } = req.params;
  
  try {
    // Verify access to match
    const matchCheck = await pool.query(
      'SELECT * FROM matches WHERE id = $1 AND (candidate_id = $2 OR job_id IN (SELECT id FROM jobs WHERE company_id = (SELECT company_id FROM users WHERE id = $2)))',
      [matchId, userId]
    );
    
    if (matchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found or unauthorized' });
    }
    
    // Get messages
    const result = await pool.query(`
      SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.match_id = $1
      ORDER BY m.created_at ASC
    `, [matchId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

export default router;
