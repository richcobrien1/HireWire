-- Add career context fields to existing candidate_profiles table
-- Run this migration to add the human layer to profiles

ALTER TABLE candidate_profiles
    -- Past: Why I'm here
    ADD COLUMN past_motivations TEXT[],
    ADD COLUMN proudest_achievements TEXT[],
    ADD COLUMN lessons_learned TEXT,
    ADD COLUMN career_pivots TEXT,
    
    -- Present: What I want now
    ADD COLUMN current_interests TEXT[],
    ADD COLUMN ideal_work_environment TEXT,
    ADD COLUMN learning_priorities TEXT[],
    ADD COLUMN work_life_balance_needs TEXT,
    ADD COLUMN deal_breakers TEXT[],
    ADD COLUMN motivations TEXT[],
    
    -- Future: Where I'm going
    ADD COLUMN career_trajectory VARCHAR(50) CHECK (career_trajectory IN ('individual_contributor', 'management', 'leadership', 'entrepreneurship', 'exploring')),
    ADD COLUMN five_year_goals TEXT[],
    ADD COLUMN dream_companies TEXT[],
    ADD COLUMN industries_of_interest TEXT[],
    ADD COLUMN skills_to_develop TEXT[],
    ADD COLUMN side_projects_interests TEXT,
    ADD COLUMN long_term_vision TEXT,
    
    -- Enrichment metadata
    ADD COLUMN career_context_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN career_context_updated_at TIMESTAMP;

-- Create indexes for career context searches
CREATE INDEX idx_candidate_interests ON candidate_profiles USING GIN(current_interests);
CREATE INDEX idx_candidate_motivations ON candidate_profiles USING GIN(motivations);
CREATE INDEX idx_candidate_trajectory ON candidate_profiles(career_trajectory);
CREATE INDEX idx_candidate_skills_to_develop ON candidate_profiles USING GIN(skills_to_develop);

COMMENT ON COLUMN candidate_profiles.past_motivations IS 'What drove past career decisions';
COMMENT ON COLUMN candidate_profiles.current_interests IS 'What excites them about their work';
COMMENT ON COLUMN candidate_profiles.learning_priorities IS 'Skills/areas they want to develop';
COMMENT ON COLUMN candidate_profiles.motivations IS 'What drives them (impact, growth, money, flexibility)';
COMMENT ON COLUMN candidate_profiles.career_trajectory IS 'Career path preference';
COMMENT ON COLUMN candidate_profiles.five_year_goals IS 'Where they see themselves in 5 years';
