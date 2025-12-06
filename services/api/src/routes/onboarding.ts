// services/api/src/routes/onboarding.ts

import express, { Request, Response } from 'express';
import multer from 'multer';
import { pool } from '../db/postgres';
import { requireAuth } from '../middleware/auth';
import FormData from 'form-data';
import fetch from 'node-fetch';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files allowed'));
    }
  }
});

// Upload and parse resume
router.post('/onboarding/candidate/upload-resume', 
  requireAuth, 
  upload.single('resume'), 
  async (req: Request, res: Response) => {
    const file = req.file;
    const userId = (req as any).user.userId;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    try {
      // Send to resume parser service
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype
      });
      
      const response = await fetch(`${process.env.RESUME_PARSER_URL}/parse-resume`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Resume parsing failed');
      }
      
      const profileData = await response.json();
      
      // Update candidate profile in PostgreSQL
      await pool.query(
        `UPDATE candidate_profiles SET 
          professional_summary = $1,
          years_experience = $2,
          target_salary_min = $3,
          target_salary_max = $4,
          resume_text = $5,
          onboarding_step = 'review'
        WHERE user_id = $6`,
        [
          profileData.summary,
          profileData.years_experience,
          profileData.target_salary ? profileData.target_salary - 20000 : null,
          profileData.target_salary ? profileData.target_salary + 20000 : null,
          JSON.stringify(profileData),
          userId
        ]
      );
      
      // If career context was extracted from resume, save it
      if (profileData.career_context) {
        const cc = profileData.career_context;
        await pool.query(`
          UPDATE candidate_profiles SET
            past_motivations = $1,
            proudest_achievements = $2,
            lessons_learned = $3,
            current_interests = $4,
            learning_priorities = $5,
            motivations = $6,
            career_trajectory = $7,
            five_year_goals = $8,
            skills_to_develop = $9,
            long_term_vision = $10,
            career_context_updated_at = NOW()
          WHERE user_id = $11
        `, [
          cc.past_motivations || [],
          cc.proudest_achievements || [],
          cc.lessons_learned,
          cc.current_interests || [],
          cc.learning_priorities || [],
          cc.motivations || [],
          cc.career_trajectory,
          cc.five_year_goals || [],
          cc.skills_to_develop || [],
          cc.long_term_vision,
          userId
        ]);
      }
      
      // Update user name if available
      if (profileData.name) {
        await pool.query(
          'UPDATE users SET name = $1 WHERE id = $2',
          [profileData.name, userId]
        );
      }
      
      // Add skills to database
      if (profileData.skills && profileData.skills.length > 0) {
        for (const skillName of profileData.skills) {
          // Ensure skill exists
          const skillResult = await pool.query(
            `INSERT INTO skills (name, category) 
            VALUES ($1, 'technical') 
            ON CONFLICT (name) DO NOTHING 
            RETURNING id`,
            [skillName]
          );
          
          const skillId = skillResult.rows[0]?.id || (await pool.query(
            'SELECT id FROM skills WHERE name = $1',
            [skillName]
          )).rows[0].id;
          
          // Link skill to candidate
          await pool.query(
            `INSERT INTO candidate_skills (user_id, skill_id, proficiency_level, years_experience) 
            VALUES ($1, $2, 'advanced', $3)
            ON CONFLICT (user_id, skill_id) DO NOTHING`,
            [userId, skillId, Math.min(profileData.years_experience || 1, 10)]
          );
        }
      }
      
      // Add work history
      if (profileData.work_history && profileData.work_history.length > 0) {
        for (const job of profileData.work_history) {
          await pool.query(
            `INSERT INTO candidate_work_history 
            (user_id, company, title, start_date, end_date, description) 
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId,
              job.company,
              job.title,
              job.start_date + '-01',
              job.end_date === 'present' ? null : job.end_date + '-01',
              job.description
            ]
          );
        }
      }
      
      // Add education
      if (profileData.education && profileData.education.length > 0) {
        for (const edu of profileData.education) {
          await pool.query(
            `INSERT INTO candidate_education 
            (user_id, school, degree, field, graduation_year) 
            VALUES ($1, $2, $3, $4, $5)`,
            [userId, edu.school, edu.degree, edu.field, edu.graduation_year]
          );
        }
      }
      
      res.json({ 
        success: true,
        profile: profileData,
        has_career_context: !!profileData.career_context,
        next_step: profileData.career_context ? 'review' : 'career_context'
      });
      
    } catch (error) {
      console.error('Resume upload error:', error);
      res.status(500).json({ error: 'Failed to process resume' });
    }
  }
);

// Parse LinkedIn URL
router.post('/onboarding/candidate/linkedin', requireAuth, async (req: Request, res: Response) => {
  const { url } = req.body;
  const userId = (req as any).user.userId;
  
  if (!url || !url.includes('linkedin.com')) {
    return res.status(400).json({ error: 'Valid LinkedIn URL required' });
  }
  
  // For now, just save the URL and prompt manual entry
  // In production, use LinkedIn API or scraping service
  await pool.query(
    'UPDATE candidate_profiles SET linkedin_url = $1 WHERE user_id = $2',
    [url, userId]
  );
  
  res.json({ 
    message: 'LinkedIn URL saved',
    next_step: 'manual_entry',
    suggestion: 'Please manually fill in your profile details for now. We\'ll add automatic LinkedIn import soon!'
  });
});

// Manual profile entry
router.post('/onboarding/candidate/manual', requireAuth, async (req: Request, res: Response) => {
  const { title, years_experience, skills, target_salary } = req.body;
  const userId = (req as any).user.userId;
  
  if (!title || !years_experience || !skills || skills.length === 0) {
    return res.status(400).json({ error: 'Title, experience, and at least one skill required' });
  }
  
  try {
    // Update profile
    await pool.query(
      `UPDATE candidate_profiles SET 
        years_experience = $1,
        target_salary_min = $2,
        target_salary_max = $3,
        onboarding_step = 'complete'
      WHERE user_id = $4`,
      [
        years_experience,
        target_salary - 20000,
        target_salary + 20000,
        userId
      ]
    );
    
    // Add primary track with title
    await pool.query(
      `INSERT INTO candidate_tracks (user_id, track_type, title, is_primary)
      VALUES ($1, 'individual_contributor', $2, true)`,
      [userId, title]
    );
    
    // Add skills
    for (const skillName of skills) {
      const skillResult = await pool.query(
        `INSERT INTO skills (name, category) 
        VALUES ($1, 'technical') 
        ON CONFLICT (name) DO NOTHING 
        RETURNING id`,
        [skillName]
      );
      
      const skillId = skillResult.rows[0]?.id || (await pool.query(
        'SELECT id FROM skills WHERE name = $1',
        [skillName]
      )).rows[0].id;
      
      await pool.query(
        `INSERT INTO candidate_skills (user_id, skill_id, proficiency_level, years_experience) 
        VALUES ($1, $2, 'advanced', $3)
        ON CONFLICT (user_id, skill_id) DO NOTHING`,
        [userId, skillId, Math.min(years_experience, 10)]
      );
    }
    
    res.json({ 
      success: true,
      next_step: 'matching'
    });
    
  } catch (error) {
    console.error('Manual entry error:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Company: Parse job description
router.post('/onboarding/company/parse-job', requireAuth, async (req: Request, res: Response) => {
  const { description } = req.body;
  const userId = (req as any).user.userId;
  const companyId = (req as any).user.companyId;
  
  if (!description) {
    return res.status(400).json({ error: 'Job description required' });
  }
  
  try {
    // Send to resume parser service
    const response = await fetch(`${process.env.RESUME_PARSER_URL}/extract-job-requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description })
    });
    
    if (!response.ok) {
      throw new Error('Job parsing failed');
    }
    
    const requirements = await response.json();
    
    // Create draft job posting
    const jobResult = await pool.query(
      `INSERT INTO jobs (
        company_id, title, description, min_experience, max_experience,
        salary_min, salary_max, remote_type, location, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft')
      RETURNING *`,
      [
        companyId,
        requirements.title,
        description,
        requirements.min_experience,
        requirements.max_experience,
        requirements.salary_min,
        requirements.salary_max,
        requirements.remote_type || 'hybrid',
        requirements.location
      ]
    );
    
    const job = jobResult.rows[0];
    
    // Add required skills
    if (requirements.required_skills) {
      for (const skillName of requirements.required_skills) {
        const skillResult = await pool.query(
          `INSERT INTO skills (name, category) 
          VALUES ($1, 'technical') 
          ON CONFLICT (name) DO NOTHING 
          RETURNING id`,
          [skillName]
        );
        
        const skillId = skillResult.rows[0]?.id || (await pool.query(
          'SELECT id FROM skills WHERE name = $1',
          [skillName]
        )).rows[0].id;
        
        await pool.query(
          `INSERT INTO job_skills (job_id, skill_id, required, importance)
          VALUES ($1, $2, true, 'high')`,
          [job.id, skillId]
        );
      }
    }
    
    // Add preferred skills
    if (requirements.preferred_skills) {
      for (const skillName of requirements.preferred_skills) {
        const skillResult = await pool.query(
          `INSERT INTO skills (name, category) 
          VALUES ($1, 'technical') 
          ON CONFLICT (name) DO NOTHING 
          RETURNING id`,
          [skillName]
        );
        
        const skillId = skillResult.rows[0]?.id || (await pool.query(
          'SELECT id FROM skills WHERE name = $1',
          [skillName]
        )).rows[0].id;
        
        await pool.query(
          `INSERT INTO job_skills (job_id, skill_id, required, importance)
          VALUES ($1, $2, false, 'medium')`,
          [job.id, skillId]
        );
      }
    }
    
    res.json({ 
      success: true,
      job,
      requirements,
      next_step: 'review'
    });
    
  } catch (error) {
    console.error('Job parsing error:', error);
    res.status(500).json({ error: 'Failed to parse job description' });
  }
});

// Finalize candidate onboarding
router.post('/onboarding/candidate/complete', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  
  try {
    // Mark onboarding complete
    await pool.query(
      `UPDATE candidate_profiles SET 
        onboarding_step = 'complete',
        onboarding_completed_at = NOW()
      WHERE user_id = $1`,
      [userId]
    );
    
    // Get profile for initial matching
    const profileResult = await pool.query(
      `SELECT cp.*, u.name, u.email 
      FROM candidate_profiles cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.user_id = $1`,
      [userId]
    );
    
    const profile = profileResult.rows[0];
    
    // Get candidate skills
    const skillsResult = await pool.query(
      `SELECT s.name, cs.proficiency_level, cs.years_experience
      FROM candidate_skills cs
      JOIN skills s ON s.id = cs.skill_id
      WHERE cs.user_id = $1`,
      [userId]
    );
    
    res.json({ 
      success: true,
      profile: {
        ...profile,
        skills: skillsResult.rows
      },
      next_step: 'dashboard',
      message: 'Profile complete! Let\'s find your matches...'
    });
    
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// Publish job and start matching
router.post('/onboarding/company/publish-job/:jobId', requireAuth, async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = (req as any).user.userId;
  const companyId = (req as any).user.companyId;
  
  try {
    // Verify job belongs to company
    const jobResult = await pool.query(
      'SELECT * FROM jobs WHERE id = $1 AND company_id = $2',
      [jobId, companyId]
    );
    
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Publish job
    await pool.query(
      `UPDATE jobs SET 
        status = 'active',
        published_at = NOW()
      WHERE id = $1`,
      [jobId]
    );
    
    res.json({ 
      success: true,
      next_step: 'matching',
      message: 'Job published! Finding candidates...'
    });
    
  } catch (error) {
    console.error('Publish job error:', error);
    res.status(500).json({ error: 'Failed to publish job' });
  }
});

export default router;
