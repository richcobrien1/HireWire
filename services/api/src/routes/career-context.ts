import express, { Request, Response } from 'express';
import { requireAuth, requireCandidate, AuthRequest } from '../middleware/auth';
import { pool } from '../db/postgres';

const router = express.Router();

// Career context questionnaire - captures the human layer
router.post('/candidate/career-context', requireCandidate, async (req: Request, res: Response) => {
  const { userId } = (req as AuthRequest).user!;
  const {
    // Past
    past_motivations,
    proudest_achievements,
    lessons_learned,
    career_pivots,
    
    // Present
    current_interests,
    ideal_work_environment,
    learning_priorities,
    work_life_balance_needs,
    deal_breakers,
    motivations,
    
    // Future
    career_trajectory,
    five_year_goals,
    dream_companies,
    industries_of_interest,
    skills_to_develop,
    side_projects_interests,
    long_term_vision
  } = req.body;
  
  try {
    const result = await pool.query(`
      UPDATE candidate_profiles SET
        past_motivations = COALESCE($1, past_motivations),
        proudest_achievements = COALESCE($2, proudest_achievements),
        lessons_learned = COALESCE($3, lessons_learned),
        career_pivots = COALESCE($4, career_pivots),
        current_interests = COALESCE($5, current_interests),
        ideal_work_environment = COALESCE($6, ideal_work_environment),
        learning_priorities = COALESCE($7, learning_priorities),
        work_life_balance_needs = COALESCE($8, work_life_balance_needs),
        deal_breakers = COALESCE($9, deal_breakers),
        motivations = COALESCE($10, motivations),
        career_trajectory = COALESCE($11, career_trajectory),
        five_year_goals = COALESCE($12, five_year_goals),
        dream_companies = COALESCE($13, dream_companies),
        industries_of_interest = COALESCE($14, industries_of_interest),
        skills_to_develop = COALESCE($15, skills_to_develop),
        side_projects_interests = COALESCE($16, side_projects_interests),
        long_term_vision = COALESCE($17, long_term_vision),
        career_context_completed = true,
        career_context_updated_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $18
      RETURNING *
    `, [
      past_motivations, proudest_achievements, lessons_learned, career_pivots,
      current_interests, ideal_work_environment, learning_priorities, work_life_balance_needs,
      deal_breakers, motivations, career_trajectory, five_year_goals,
      dream_companies, industries_of_interest, skills_to_develop,
      side_projects_interests, long_term_vision, userId
    ]);
    
    res.json({
      success: true,
      profile: result.rows[0],
      message: 'Career context saved! This will help us find your perfect match.'
    });
  } catch (error) {
    console.error('Career context error:', error);
    res.status(500).json({ error: 'Failed to save career context' });
  }
});

// Get career context questionnaire template
router.get('/candidate/career-context/questions', requireCandidate, async (req: Request, res: Response) => {
  res.json({
    sections: [
      {
        id: 'past',
        title: 'Your Journey So Far',
        description: 'Help us understand what brought you here',
        questions: [
          {
            id: 'past_motivations',
            type: 'multi_text',
            question: 'What drove your most important career decisions?',
            placeholder: 'e.g., "Wanted to work on distributed systems", "Needed better work-life balance"',
            optional: true
          },
          {
            id: 'proudest_achievements',
            type: 'multi_text',
            question: 'What are you most proud of in your career?',
            placeholder: 'e.g., "Built a platform serving 10M users", "Led team through major migration"',
            optional: true
          },
          {
            id: 'lessons_learned',
            type: 'long_text',
            question: 'What important lessons have you learned?',
            placeholder: 'Share key insights from your career journey',
            optional: true
          }
        ]
      },
      {
        id: 'present',
        title: 'What Matters Now',
        description: 'What are you looking for in your next role?',
        questions: [
          {
            id: 'current_interests',
            type: 'multi_select',
            question: 'What excites you most about your work?',
            options: [
              'Solving complex technical problems',
              'Building products that help people',
              'Working with cutting-edge technology',
              'Mentoring and teaching others',
              'System design and architecture',
              'Data and analytics',
              'Developer tools and infrastructure',
              'AI/ML applications',
              'Security and privacy',
              'Performance optimization'
            ],
            allow_custom: true
          },
          {
            id: 'learning_priorities',
            type: 'multi_select',
            question: 'What do you want to learn or improve?',
            options: [
              'New programming languages',
              'System design skills',
              'Leadership and management',
              'Product thinking',
              'Communication skills',
              'Specific frameworks/tools',
              'Cloud infrastructure',
              'Machine learning',
              'Security practices',
              'Business strategy'
            ],
            allow_custom: true
          },
          {
            id: 'ideal_work_environment',
            type: 'long_text',
            question: 'Describe your ideal work environment',
            placeholder: 'Team size, pace, culture, collaboration style, autonomy level...',
            optional: true
          },
          {
            id: 'motivations',
            type: 'multi_select',
            question: 'What motivates you most?',
            options: [
              'Technical challenges',
              'Career growth',
              'Making an impact',
              'Financial compensation',
              'Work-life balance',
              'Learning opportunities',
              'Team collaboration',
              'Company mission',
              'Autonomy and ownership',
              'Recognition and visibility'
            ],
            max_selections: 3,
            required: true
          },
          {
            id: 'deal_breakers',
            type: 'multi_select',
            question: 'What are your non-negotiables?',
            options: [
              'Remote work',
              'No on-call',
              'No weekends',
              'Flexible hours',
              'Healthcare benefits',
              'Equity/stock options',
              'Learning budget',
              'Modern tech stack',
              'Small team (<20)',
              'Large company (1000+)'
            ],
            allow_custom: true,
            optional: true
          }
        ]
      },
      {
        id: 'future',
        title: 'Where You\'re Going',
        description: 'Your long-term vision and goals',
        questions: [
          {
            id: 'career_trajectory',
            type: 'single_select',
            question: 'Where do you see your career heading?',
            options: [
              { value: 'individual_contributor', label: 'Individual Contributor (Technical depth)' },
              { value: 'management', label: 'Management (Leading teams)' },
              { value: 'leadership', label: 'Leadership (Executive/Director level)' },
              { value: 'entrepreneurship', label: 'Entrepreneurship (Start my own company)' },
              { value: 'exploring', label: 'Exploring (Still figuring it out)' }
            ],
            required: true
          },
          {
            id: 'five_year_goals',
            type: 'multi_text',
            question: 'What are your 5-year goals?',
            placeholder: 'e.g., "Become a Staff Engineer", "Lead a product team", "Launch a startup"',
            optional: true
          },
          {
            id: 'skills_to_develop',
            type: 'multi_text',
            question: 'What skills do you want to develop?',
            placeholder: 'Technical skills, leadership skills, domain knowledge...',
            optional: true
          },
          {
            id: 'dream_companies',
            type: 'multi_text',
            question: 'Any dream companies you\'d love to work for?',
            placeholder: 'e.g., "Stripe", "Anthropic", "Early-stage AI startups"',
            optional: true
          },
          {
            id: 'long_term_vision',
            type: 'long_text',
            question: 'What\'s your ultimate career vision?',
            placeholder: 'Where do you want to be 10+ years from now?',
            optional: true
          }
        ]
      }
    ],
    metadata: {
      estimated_time: '5-7 minutes',
      skippable: true,
      impact: 'Completing this improves match quality by 40% and helps us find roles you\'ll actually love'
    }
  });
});

// Skip career context (but mark as acknowledged)
router.post('/candidate/career-context/skip', requireCandidate, async (req: Request, res: Response) => {
  const { userId } = (req as AuthRequest).user!;
  
  try {
    await pool.query(
      'UPDATE candidate_profiles SET career_context_completed = false WHERE user_id = $1',
      [userId]
    );
    
    res.json({
      success: true,
      message: 'You can always add career context later from your profile settings'
    });
  } catch (error) {
    console.error('Skip career context error:', error);
    res.status(500).json({ error: 'Failed to skip career context' });
  }
});

export default router;
