-- HireWire Database Schema - Migration 001
-- PostgreSQL Initial Schema
-- Created: December 5, 2025

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- =============================================================================
-- USERS & AUTHENTICATION
-- =============================================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('candidate', 'company', 'recruiter', 'admin')),
    
    -- OAuth fields
    google_id VARCHAR(255) UNIQUE,
    github_id VARCHAR(255) UNIQUE,
    linkedin_id VARCHAR(255) UNIQUE,
    
    -- Status
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_premium BOOLEAN DEFAULT FALSE,
    premium_until TIMESTAMP,
    
    -- Gamification
    xp_points INT DEFAULT 0,
    level INT DEFAULT 1,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_premium ON users(is_premium, premium_until);
CREATE INDEX idx_users_created ON users(created_at);

CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- =============================================================================
-- SKILLS (shared master list)
-- =============================================================================

CREATE TABLE skills (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    aliases TEXT[],
    is_verified BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_skills_name ON skills(name);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_usage ON skills(usage_count DESC);

-- =============================================================================
-- CANDIDATE PROFILES
-- =============================================================================

CREATE TABLE candidate_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    headline VARCHAR(255),
    bio TEXT,
    location VARCHAR(255),
    timezone VARCHAR(50),
    
    -- Experience
    years_experience INT,
    current_title VARCHAR(255),
    current_company VARCHAR(255),
    
    -- Job preferences
    preferred_locations TEXT[],
    salary_min INT,
    salary_max INT,
    equity_preference VARCHAR(20) CHECK (equity_preference IN ('required', 'nice_to_have', 'not_interested')),
    
    -- Availability
    availability VARCHAR(20) CHECK (availability IN ('immediate', '2_weeks', '1_month', '3_months', 'passive')),
    work_authorization TEXT[],
    requires_sponsorship BOOLEAN DEFAULT FALSE,
    
    -- Culture preferences
    preferred_company_size TEXT[],
    preferred_pace VARCHAR(20) CHECK (preferred_pace IN ('fast', 'balanced', 'relaxed')),
    remote_preference VARCHAR(20) CHECK (remote_preference IN ('remote_only', 'hybrid', 'office', 'flexible')),
    
    -- Validation
    validation_score DECIMAL(5,2) DEFAULT 0 CHECK (validation_score BETWEEN 0 AND 100),
    github_username VARCHAR(255),
    linkedin_url TEXT,
    portfolio_url TEXT,
    
    -- Resume
    resume_url TEXT,
    resume_parsed JSONB,
    
    -- Metadata
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_candidate_user ON candidate_profiles(user_id);
CREATE INDEX idx_candidate_validation ON candidate_profiles(validation_score DESC);
CREATE INDEX idx_candidate_salary ON candidate_profiles(salary_min, salary_max);
CREATE INDEX idx_candidate_availability ON candidate_profiles(availability);
CREATE INDEX idx_candidate_locations ON candidate_profiles USING GIN(preferred_locations);

CREATE TABLE candidate_tracks (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    track_name VARCHAR(100) NOT NULL,
    track_type VARCHAR(50) NOT NULL CHECK (track_type IN ('primary', 'secondary', 'exploring')),
    
    skills JSONB NOT NULL,
    relevant_experience TEXT,
    key_projects JSONB,
    
    ai_suggested BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (candidate_profile_id, track_name)
);

CREATE INDEX idx_tracks_candidate ON candidate_tracks(candidate_profile_id);
CREATE INDEX idx_tracks_type ON candidate_tracks(track_type);

CREATE TABLE candidate_skills (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id BIGINT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    
    proficiency VARCHAR(20) CHECK (proficiency IN ('Expert', 'Working', 'Learning')),
    years_experience INT,
    last_used DATE,
    
    validated BOOLEAN DEFAULT FALSE,
    validation_source VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (candidate_profile_id, skill_id)
);

CREATE INDEX idx_candidate_skills_profile ON candidate_skills(candidate_profile_id);
CREATE INDEX idx_candidate_skills_skill ON candidate_skills(skill_id);
CREATE INDEX idx_candidate_skills_proficiency ON candidate_skills(proficiency);

CREATE TABLE work_experiences (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    company_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    start_date DATE NOT NULL,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    location VARCHAR(255),
    tech_stack TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_exp_candidate ON work_experiences(candidate_profile_id);
CREATE INDEX idx_work_exp_current ON work_experiences(is_current);
CREATE INDEX idx_work_exp_dates ON work_experiences(start_date, end_date);

CREATE TABLE education (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT NOT NULL REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    field_of_study VARCHAR(255),
    
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    gpa DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_education_candidate ON education(candidate_profile_id);

-- =============================================================================
-- COMPANY PROFILES
-- =============================================================================

CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    
    -- Company details
    size VARCHAR(20) CHECK (size IN ('startup', 'scale_up', 'enterprise')),
    industry VARCHAR(100),
    founded_year INT,
    headquarters_location VARCHAR(255),
    
    -- Culture
    pace VARCHAR(20) CHECK (pace IN ('fast', 'balanced', 'relaxed')),
    remote_policy VARCHAR(20) CHECK (remote_policy IN ('remote_first', 'hybrid', 'office_first')),
    
    -- Tech stack
    tech_stack TEXT[],
    
    -- Social proof
    glassdoor_rating DECIMAL(2,1),
    glassdoor_url TEXT,
    engineering_blog_url TEXT,
    
    -- Billing
    is_paying_customer BOOLEAN DEFAULT FALSE,
    subscription_tier VARCHAR(20) CHECK (subscription_tier IN ('free', 'starter', 'growth', 'enterprise')),
    matches_remaining INT DEFAULT 10,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_size ON companies(size);
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_user ON companies(user_id);

-- =============================================================================
-- JOBS
-- =============================================================================

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Requirements
    min_years_experience INT,
    max_years_experience INT,
    
    required_skills JSONB,
    nice_to_have_skills JSONB,
    
    -- Compensation
    salary_min INT,
    salary_max INT,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    equity_offered BOOLEAN DEFAULT FALSE,
    equity_range VARCHAR(50),
    
    -- Location
    locations TEXT[],
    timezone_requirements VARCHAR(50),
    
    -- Work authorization
    requires_us_authorization BOOLEAN DEFAULT TRUE,
    will_sponsor BOOLEAN DEFAULT FALSE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'filled')),
    filled_at TIMESTAMP,
    
    -- Engagement stats
    view_count INT DEFAULT 0,
    swipe_right_count INT DEFAULT 0,
    swipe_left_count INT DEFAULT 0,
    match_count INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_jobs_company ON jobs(company_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_salary ON jobs(salary_min, salary_max);
CREATE INDEX idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX idx_jobs_locations ON jobs USING GIN(locations);

-- =============================================================================
-- MATCHING & SWIPES
-- =============================================================================

CREATE TABLE swipes (
    id BIGSERIAL PRIMARY KEY,
    
    swiper_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swiper_type VARCHAR(20) NOT NULL CHECK (swiper_type IN ('candidate', 'company')),
    
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('right', 'left', 'skip')),
    match_score DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CHECK (
        (swiper_type = 'candidate' AND swiper_id = candidate_id) OR
        (swiper_type = 'company')
    )
);

CREATE INDEX idx_swipes_swiper ON swipes(swiper_id, swiper_type);
CREATE INDEX idx_swipes_job ON swipes(job_id);
CREATE INDEX idx_swipes_candidate ON swipes(candidate_id);
CREATE INDEX idx_swipes_direction ON swipes(direction);
CREATE INDEX idx_swipes_created ON swipes(created_at DESC);

CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    
    candidate_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    match_score DECIMAL(5,2) NOT NULL CHECK (match_score BETWEEN 0 AND 100),
    match_explanation JSONB,
    
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'chatting', 'interviewing', 'offer', 'hired', 'rejected', 'expired')),
    
    first_message_at TIMESTAMP,
    first_interview_at TIMESTAMP,
    offer_made_at TIMESTAMP,
    hired_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(20) CHECK (rejected_by IN ('candidate', 'company')),
    rejection_reason TEXT,
    
    charged BOOLEAN DEFAULT FALSE,
    charge_amount INT,
    charged_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (candidate_id, job_id)
);

CREATE INDEX idx_matches_candidate ON matches(candidate_id);
CREATE INDEX idx_matches_job ON matches(job_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created ON matches(created_at DESC);
CREATE INDEX idx_matches_score ON matches(match_score DESC);

-- =============================================================================
-- MESSAGING
-- =============================================================================

CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    
    sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('candidate', 'company')),
    
    content TEXT NOT NULL,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_match ON messages(match_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_messages_read ON messages(read);

-- =============================================================================
-- GAMIFICATION
-- =============================================================================

CREATE TABLE achievements (
    id BIGSERIAL PRIMARY KEY,
    
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    
    xp_reward INT DEFAULT 0,
    tier VARCHAR(20) CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    
    criteria JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id BIGINT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    
    unlocked_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement ON user_achievements(achievement_id);

CREATE TABLE daily_quests (
    id BIGSERIAL PRIMARY KEY,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    xp_reward INT DEFAULT 50,
    
    quest_type VARCHAR(50),
    target_value INT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_quest_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id BIGINT NOT NULL REFERENCES daily_quests(id) ON DELETE CASCADE,
    
    current_value INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    quest_date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE (user_id, quest_id, quest_date)
);

CREATE INDEX idx_quest_progress_user ON user_quest_progress(user_id);
CREATE INDEX idx_quest_progress_date ON user_quest_progress(quest_date);

-- =============================================================================
-- LIVE EVENTS
-- =============================================================================

CREATE TABLE live_events (
    id BIGSERIAL PRIMARY KEY,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 60,
    
    max_candidates INT DEFAULT 100,
    max_companies INT DEFAULT 10,
    
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_starts ON live_events(starts_at);
CREATE INDEX idx_events_status ON live_events(status);

CREATE TABLE event_participants (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES live_events(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('candidate', 'company')),
    
    registered_at TIMESTAMP DEFAULT NOW(),
    attended BOOLEAN DEFAULT FALSE,
    
    chats_completed INT DEFAULT 0,
    matches_made INT DEFAULT 0,
    
    UNIQUE (event_id, user_id)
);

CREATE INDEX idx_participants_event ON event_participants(event_id);
CREATE INDEX idx_participants_user ON event_participants(user_id);

-- =============================================================================
-- ANALYTICS
-- =============================================================================

CREATE TABLE user_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_user ON user_activities(user_id);
CREATE INDEX idx_activities_type ON user_activities(activity_type);
CREATE INDEX idx_activities_created ON user_activities(created_at DESC);

CREATE TABLE daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE UNIQUE NOT NULL,
    
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    new_signups INT DEFAULT 0,
    premium_users INT DEFAULT 0,
    
    total_swipes INT DEFAULT 0,
    total_matches INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    
    match_to_interview_rate DECIMAL(5,2),
    interview_to_hire_rate DECIMAL(5,2),
    
    revenue_cents INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_date ON daily_metrics(metric_date DESC);

-- =============================================================================
-- BILLING
-- =============================================================================

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    transaction_type VARCHAR(50),
    
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_tracks_updated_at BEFORE UPDATE ON candidate_tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to increment skill usage count
CREATE OR REPLACE FUNCTION increment_skill_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE skills SET usage_count = usage_count + 1 WHERE id = NEW.skill_id;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER increment_skill_usage_on_insert AFTER INSERT ON candidate_skills
    FOR EACH ROW EXECUTE FUNCTION increment_skill_usage();

-- =============================================================================
-- INITIAL DATA
-- =============================================================================

-- Insert default achievements
INSERT INTO achievements (name, description, icon_url, xp_reward, tier, criteria) VALUES
('First Swipe', 'Complete your first swipe', '/icons/first-swipe.svg', 10, 'bronze', '{"swipes_count": 1}'),
('Swipe Master', 'Complete 100 swipes', '/icons/swipe-master.svg', 100, 'silver', '{"swipes_count": 100}'),
('First Match', 'Get your first match', '/icons/first-match.svg', 50, 'bronze', '{"matches_count": 1}'),
('Matchmaker', 'Get 10 matches', '/icons/matchmaker.svg', 200, 'gold', '{"matches_count": 10}'),
('Profile Complete', 'Complete your profile 100%', '/icons/profile-complete.svg', 50, 'bronze', '{"profile_completed": true}'),
('Validated Expert', 'Achieve 80%+ validation score', '/icons/validated.svg', 150, 'gold', '{"validation_score": 80}'),
('Conversation Starter', 'Send your first message', '/icons/first-message.svg', 25, 'bronze', '{"messages_sent": 1}'),
('Hired!', 'Get hired through HireWire', '/icons/hired.svg', 1000, 'platinum', '{"hired": true}');

-- Insert default daily quests
INSERT INTO daily_quests (title, description, xp_reward, quest_type, target_value) VALUES
('Daily Swiper', 'Swipe on 10 jobs today', 50, 'swipe_count', 10),
('Profile Polisher', 'Update your profile', 25, 'profile_update', 1),
('Message Master', 'Send 3 messages to matches', 75, 'send_message', 3),
('Active Explorer', 'View 5 company profiles', 30, 'view_profile', 5);

-- Insert common skills
INSERT INTO skills (name, category, aliases) VALUES
-- Frontend
('React', 'Frontend', ARRAY['ReactJS', 'React.js']),
('Vue.js', 'Frontend', ARRAY['Vue', 'VueJS']),
('Angular', 'Frontend', ARRAY['AngularJS']),
('TypeScript', 'Frontend', ARRAY['TS']),
('JavaScript', 'Frontend', ARRAY['JS', 'ES6', 'ES2015']),
('HTML', 'Frontend', ARRAY['HTML5']),
('CSS', 'Frontend', ARRAY['CSS3']),
('Tailwind CSS', 'Frontend', ARRAY['Tailwind']),
('Next.js', 'Frontend', ARRAY['Next']),

-- Backend
('Node.js', 'Backend', ARRAY['Node', 'NodeJS']),
('Python', 'Backend', ARRAY['Python3']),
('Go', 'Backend', ARRAY['Golang']),
('Java', 'Backend', NULL),
('C#', 'Backend', ARRAY['.NET', 'C-Sharp']),
('Ruby', 'Backend', ARRAY['Ruby on Rails', 'RoR']),
('PHP', 'Backend', NULL),
('Rust', 'Backend', NULL),

-- Databases
('PostgreSQL', 'Database', ARRAY['Postgres', 'psql']),
('MySQL', 'Database', NULL),
('MongoDB', 'Database', ARRAY['Mongo']),
('Redis', 'Database', NULL),
('Neo4j', 'Database', NULL),
('Elasticsearch', 'Database', ARRAY['ES']),

-- DevOps
('Docker', 'DevOps', NULL),
('Kubernetes', 'DevOps', ARRAY['K8s']),
('AWS', 'Cloud', ARRAY['Amazon Web Services']),
('GCP', 'Cloud', ARRAY['Google Cloud Platform']),
('Azure', 'Cloud', ARRAY['Microsoft Azure']),
('Terraform', 'DevOps', NULL),
('CI/CD', 'DevOps', NULL),
('Jenkins', 'DevOps', NULL),
('GitHub Actions', 'DevOps', NULL),

-- Other
('Git', 'Tools', NULL),
('GraphQL', 'API', NULL),
('REST API', 'API', ARRAY['RESTful']),
('WebRTC', 'Realtime', NULL),
('Socket.io', 'Realtime', NULL);

-- Migration complete!
COMMENT ON DATABASE hirewire_dev IS 'HireWire development database - initialized on 2025-12-05';
