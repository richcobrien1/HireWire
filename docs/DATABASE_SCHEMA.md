# HireWire - Complete Database Schema

**Last Updated:** December 5, 2025  
**Version:** 1.0 (MVP)

---

## Overview

HireWire uses a **4-database hybrid architecture**:

1. **PostgreSQL** - Source of truth (users, jobs, transactions)
2. **Neo4j** - Graph relationships (skill matching, company networks)
3. **Qdrant** - Vector embeddings (semantic similarity)
4. **Redis** - Hot cache (real-time state, sessions)

---

## 1. PostgreSQL Schema (Source of Truth)

### Users & Authentication

```sql
-- Core user table
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- bcrypt hash (if not OAuth)
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
    last_login_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_email (email),
    INDEX idx_user_type (user_type),
    INDEX idx_premium (is_premium, premium_until)
);

-- User sessions (for JWT refresh tokens)
CREATE TABLE user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_info JSONB,  -- {browser, os, ip, location}
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_refresh_token (refresh_token),
    INDEX idx_expires_at (expires_at)
);
```

### Candidate Profiles

```sql
-- Main candidate profile (1:1 with users)
CREATE TABLE candidate_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    headline VARCHAR(255),  -- "Senior Full Stack Engineer"
    bio TEXT,  -- Long-form profile description
    location VARCHAR(255),
    timezone VARCHAR(50),
    
    -- Experience
    years_experience INT,
    current_title VARCHAR(255),
    current_company VARCHAR(255),
    
    -- Job preferences
    preferred_locations TEXT[],  -- ['Remote', 'Denver, CO', 'Hybrid']
    salary_min INT,
    salary_max INT,
    equity_preference VARCHAR(20),  -- 'required', 'nice_to_have', 'not_interested'
    
    -- Availability
    availability VARCHAR(20) CHECK (availability IN ('immediate', '2_weeks', '1_month', '3_months', 'passive')),
    work_authorization TEXT[],  -- ['US Citizen', 'Green Card', 'H1B']
    requires_sponsorship BOOLEAN DEFAULT FALSE,
    
    -- Culture preferences (for matching)
    preferred_company_size TEXT[],  -- ['startup', 'scale_up', 'enterprise']
    preferred_pace VARCHAR(20),  -- 'fast', 'balanced', 'relaxed'
    remote_preference VARCHAR(20),  -- 'remote_only', 'hybrid', 'office', 'flexible'
    
    -- Validation
    validation_score DECIMAL(5,2) DEFAULT 0,  -- 0-100%
    github_username VARCHAR(255),
    linkedin_url TEXT,
    portfolio_url TEXT,
    
    -- Resume storage
    resume_url TEXT,  -- S3 link to PDF
    resume_parsed JSONB,  -- Parsed resume data
    
    -- Metadata
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user_id (user_id),
    INDEX idx_validation_score (validation_score),
    INDEX idx_salary (salary_min, salary_max),
    INDEX idx_availability (availability)
);

-- Multi-track profiles (one candidate, multiple specializations)
CREATE TABLE candidate_tracks (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    track_name VARCHAR(100) NOT NULL,  -- 'Full Stack Engineer', 'DevOps Engineer'
    track_type VARCHAR(50) NOT NULL,  -- 'primary', 'secondary', 'exploring'
    
    -- Track-specific skills
    skills JSONB NOT NULL,  -- [{name: 'React', proficiency: 'Expert', years: 8}, ...]
    
    -- Track-specific experience
    relevant_experience TEXT,  -- Customized bio for this track
    key_projects JSONB,  -- [{title, description, url, tech_stack}, ...]
    
    -- AI recommendations
    ai_suggested BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (candidate_profile_id, track_name),
    INDEX idx_candidate_profile (candidate_profile_id)
);

-- Skills master list
CREATE TABLE skills (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),  -- 'Frontend', 'Backend', 'Database', 'DevOps', 'Cloud'
    aliases TEXT[],  -- ['React', 'ReactJS', 'React.js']
    is_verified BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,  -- How many people have this skill
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_name (name),
    INDEX idx_category (category)
);

-- Candidate skills (many-to-many with proficiency)
CREATE TABLE candidate_skills (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    skill_id BIGINT REFERENCES skills(id) ON DELETE CASCADE,
    
    proficiency VARCHAR(20) CHECK (proficiency IN ('Expert', 'Working', 'Learning')),
    years_experience INT,
    last_used DATE,
    
    -- Validation
    validated BOOLEAN DEFAULT FALSE,
    validation_source VARCHAR(50),  -- 'github', 'linkedin', 'peer_endorsement'
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (candidate_profile_id, skill_id),
    INDEX idx_candidate (candidate_profile_id),
    INDEX idx_skill (skill_id),
    INDEX idx_proficiency (proficiency)
);

-- Work experience
CREATE TABLE work_experiences (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    company_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    start_date DATE NOT NULL,
    end_date DATE,  -- NULL if current
    is_current BOOLEAN DEFAULT FALSE,
    
    location VARCHAR(255),
    
    -- Technologies used
    tech_stack TEXT[],
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_candidate (candidate_profile_id),
    INDEX idx_current (is_current),
    INDEX idx_dates (start_date, end_date)
);

-- Education
CREATE TABLE education (
    id BIGSERIAL PRIMARY KEY,
    candidate_profile_id BIGINT REFERENCES candidate_profiles(id) ON DELETE CASCADE,
    
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255),  -- 'Bachelor of Science'
    field_of_study VARCHAR(255),  -- 'Computer Science'
    
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT FALSE,
    
    gpa DECIMAL(3,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_candidate (candidate_profile_id)
);
```

### Company Profiles

```sql
-- Companies
CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic info
    name VARCHAR(255) UNIQUE NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,  -- 'cloudflare' for URL
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    
    -- Company details
    size VARCHAR(20),  -- 'startup', 'scale_up', 'enterprise'
    industry VARCHAR(100),
    founded_year INT,
    headquarters_location VARCHAR(255),
    
    -- Culture
    pace VARCHAR(20),  -- 'fast', 'balanced', 'relaxed'
    remote_policy VARCHAR(20),  -- 'remote_first', 'hybrid', 'office_first'
    
    -- Tech stack
    tech_stack TEXT[],  -- ['React', 'Node.js', 'PostgreSQL', ...]
    
    -- Social proof
    glassdoor_rating DECIMAL(2,1),
    glassdoor_url TEXT,
    engineering_blog_url TEXT,
    
    -- Billing
    is_paying_customer BOOLEAN DEFAULT FALSE,
    subscription_tier VARCHAR(20),  -- 'free', 'starter', 'growth', 'enterprise'
    matches_remaining INT DEFAULT 10,  -- Free tier gets 10 matches
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_name (name),
    INDEX idx_slug (slug),
    INDEX idx_size (size),
    INDEX idx_industry (industry)
);
```

### Jobs

```sql
-- Job postings
CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Basic info
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    
    -- Requirements
    min_years_experience INT,
    max_years_experience INT,
    
    required_skills JSONB,  -- [{skill_id: 10, name: 'React', required: true}, ...]
    nice_to_have_skills JSONB,
    
    -- Compensation
    salary_min INT,
    salary_max INT,
    salary_currency VARCHAR(3) DEFAULT 'USD',
    equity_offered BOOLEAN DEFAULT FALSE,
    equity_range VARCHAR(50),  -- '0.1% - 0.5%'
    
    -- Location
    locations TEXT[],  -- ['Remote', 'San Francisco, CA']
    timezone_requirements VARCHAR(50),  -- 'PST ±3 hours'
    
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
    expires_at TIMESTAMP,
    
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    INDEX idx_salary (salary_min, salary_max),
    INDEX idx_created (created_at)
);
```

### Matching & Swipes

```sql
-- Swipe actions (candidate swipes job, or company swipes candidate)
CREATE TABLE swipes (
    id BIGSERIAL PRIMARY KEY,
    
    -- Who swiped
    swiper_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    swiper_type VARCHAR(20) CHECK (swiper_type IN ('candidate', 'company')),
    
    -- What they swiped on
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    candidate_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Action
    direction VARCHAR(10) CHECK (direction IN ('right', 'left', 'skip')),
    
    -- Context
    match_score DECIMAL(5,2),  -- Pre-calculated score shown to user
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints: candidate swipes job, or company swipes candidate
    CHECK (
        (swiper_type = 'candidate' AND swiper_id = candidate_id AND job_id IS NOT NULL) OR
        (swiper_type = 'company' AND job_id IS NOT NULL AND candidate_id IS NOT NULL)
    ),
    
    INDEX idx_swiper (swiper_id, swiper_type),
    INDEX idx_job (job_id),
    INDEX idx_candidate (candidate_id),
    INDEX idx_direction (direction),
    INDEX idx_created (created_at)
);

-- Mutual matches (both swiped right)
CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    
    candidate_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    job_id BIGINT REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- Match metadata
    match_score DECIMAL(5,2) NOT NULL,  -- Final calculated score
    match_explanation JSONB,  -- {skill_overlap: 40, semantic_match: 35, ...}
    
    -- Status
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'chatting', 'interviewing', 'offer', 'hired', 'rejected', 'expired')),
    
    -- Interview progress
    first_message_at TIMESTAMP,
    first_interview_at TIMESTAMP,
    offer_made_at TIMESTAMP,
    hired_at TIMESTAMP,
    rejected_at TIMESTAMP,
    rejected_by VARCHAR(20),  -- 'candidate' or 'company'
    rejection_reason TEXT,
    
    -- Billing (for companies)
    charged BOOLEAN DEFAULT FALSE,
    charge_amount INT,
    charged_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (candidate_id, job_id),
    INDEX idx_candidate (candidate_id),
    INDEX idx_job (job_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);
```

### Messaging

```sql
-- In-app messages
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES matches(id) ON DELETE CASCADE,
    
    sender_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) CHECK (sender_type IN ('candidate', 'company')),
    
    content TEXT NOT NULL,
    
    -- AI-generated suggestions
    is_ai_generated BOOLEAN DEFAULT FALSE,
    
    -- Status
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_match (match_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created (created_at),
    INDEX idx_read (read)
);
```

### Gamification

```sql
-- Achievements
CREATE TABLE achievements (
    id BIGSERIAL PRIMARY KEY,
    
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    
    xp_reward INT DEFAULT 0,
    tier VARCHAR(20),  -- 'bronze', 'silver', 'gold', 'platinum'
    
    -- Unlock criteria
    criteria JSONB,  -- {swipes_count: 100, matches_count: 10, ...}
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- User achievements (unlocked)
CREATE TABLE user_achievements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    achievement_id BIGINT REFERENCES achievements(id) ON DELETE CASCADE,
    
    unlocked_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (user_id, achievement_id),
    INDEX idx_user (user_id),
    INDEX idx_achievement (achievement_id)
);

-- Daily quests
CREATE TABLE daily_quests (
    id BIGSERIAL PRIMARY KEY,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    xp_reward INT DEFAULT 50,
    
    -- Quest type
    quest_type VARCHAR(50),  -- 'swipe_count', 'profile_update', 'send_message'
    target_value INT,  -- e.g., swipe 10 times
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- User quest progress
CREATE TABLE user_quest_progress (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    quest_id BIGINT REFERENCES daily_quests(id) ON DELETE CASCADE,
    
    current_value INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    
    -- Daily quests reset
    quest_date DATE DEFAULT CURRENT_DATE,
    
    UNIQUE (user_id, quest_id, quest_date),
    INDEX idx_user (user_id),
    INDEX idx_quest_date (quest_date)
);
```

### Live Events

```sql
-- Live hiring events (speed dating for jobs)
CREATE TABLE live_events (
    id BIGSERIAL PRIMARY KEY,
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Timing
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 60,
    
    -- Participants
    max_candidates INT DEFAULT 100,
    max_companies INT DEFAULT 10,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_starts_at (starts_at),
    INDEX idx_status (status)
);

-- Event participants
CREATE TABLE event_participants (
    id BIGSERIAL PRIMARY KEY,
    event_id BIGINT REFERENCES live_events(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    user_type VARCHAR(20) CHECK (user_type IN ('candidate', 'company')),
    
    -- RSVP
    registered_at TIMESTAMP DEFAULT NOW(),
    attended BOOLEAN DEFAULT FALSE,
    
    -- Engagement
    chats_completed INT DEFAULT 0,
    matches_made INT DEFAULT 0,
    
    UNIQUE (event_id, user_id),
    INDEX idx_event (event_id),
    INDEX idx_user (user_id)
);
```

### Analytics & Metrics

```sql
-- User activity log (for analytics)
CREATE TABLE user_activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    activity_type VARCHAR(50) NOT NULL,  -- 'profile_view', 'swipe', 'message_sent'
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user (user_id),
    INDEX idx_activity_type (activity_type),
    INDEX idx_created (created_at)
);

-- Daily metrics rollup
CREATE TABLE daily_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE UNIQUE NOT NULL,
    
    -- User metrics
    total_users INT DEFAULT 0,
    active_users INT DEFAULT 0,
    new_signups INT DEFAULT 0,
    premium_users INT DEFAULT 0,
    
    -- Engagement metrics
    total_swipes INT DEFAULT 0,
    total_matches INT DEFAULT 0,
    total_messages INT DEFAULT 0,
    
    -- Conversion metrics
    match_to_interview_rate DECIMAL(5,2),
    interview_to_hire_rate DECIMAL(5,2),
    
    -- Revenue
    revenue_cents INT DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Billing & Payments

```sql
-- Transactions (for audit trail)
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Payment details
    amount_cents INT NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    transaction_type VARCHAR(50),  -- 'subscription', 'match_fee', 'refund'
    
    -- External references
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);
```

---

## 2. Neo4j Graph Schema (Relationship Matching)

### Node Types

```cypher
// Candidate node
CREATE CONSTRAINT candidate_id IF NOT EXISTS
FOR (c:Candidate) REQUIRE c.id IS UNIQUE;

// Example candidate
CREATE (c:Candidate {
    id: 12345,
    name: 'Rich O''Brien',
    years_experience: 20,
    salary_min: 180000,
    location: 'Remote',
    validation_score: 87.5,
    updated_at: datetime()
})

// Skill node
CREATE CONSTRAINT skill_name IF NOT EXISTS
FOR (s:Skill) REQUIRE s.name IS UNIQUE;

CREATE (s:Skill {
    name: 'React',
    category: 'Frontend',
    usage_count: 15000
})

// Job node
CREATE CONSTRAINT job_id IF NOT EXISTS
FOR (j:Job) REQUIRE j.id IS UNIQUE;

CREATE (j:Job {
    id: 789,
    title: 'Senior Full Stack Engineer',
    company_id: 456,
    company_name: 'Cloudflare',
    salary_min: 200000,
    salary_max: 260000,
    location: 'Remote',
    status: 'active',
    updated_at: datetime()
})

// Company node
CREATE CONSTRAINT company_id IF NOT EXISTS
FOR (c:Company) REQUIRE c.id IS UNIQUE;

CREATE (c:Company {
    id: 456,
    name: 'Cloudflare',
    size: 'enterprise',
    industry: 'Infrastructure',
    tech_stack: ['Go', 'Rust', 'PostgreSQL', 'Redis']
})

// Industry node (for company clustering)
CREATE (i:Industry {
    name: 'Infrastructure',
    parent: 'Technology'
})
```

### Relationships

```cypher
// Candidate HAS_SKILL Skill
CREATE (c:Candidate {id: 12345})
       -[:HAS_SKILL {
           proficiency: 'Expert',
           years: 8,
           validated: true,
           last_used: date('2025-12-01')
       }]->(s:Skill {name: 'React'})

// Job REQUIRES_SKILL Skill
CREATE (j:Job {id: 789})
       -[:REQUIRES_SKILL {
           required: true,
           min_years: 5,
           weight: 1.0
       }]->(s:Skill {name: 'React'})

// Job NICE_TO_HAVE Skill
CREATE (j:Job {id: 789})
       -[:NICE_TO_HAVE {
           weight: 0.5
       }]->(s:Skill {name: 'WebRTC'})

// Company POSTED Job
CREATE (c:Company {id: 456})
       -[:POSTED {
           posted_at: datetime()
       }]->(j:Job {id: 789})

// Company IN_INDUSTRY Industry
CREATE (c:Company {id: 456})
       -[:IN_INDUSTRY]->(i:Industry {name: 'Infrastructure'})

// Candidate WORKED_AT Company (for company similarity)
CREATE (c:Candidate {id: 12345})
       -[:WORKED_AT {
           title: 'Senior Engineer',
           start_date: date('2020-01-01'),
           end_date: date('2023-06-01'),
           is_current: false
       }]->(company:Company {id: 789})

// Candidate MATCHED Job
CREATE (c:Candidate {id: 12345})
       -[:MATCHED {
           score: 89.5,
           matched_at: datetime(),
           status: 'new'
       }]->(j:Job {id: 789})
```

### Matching Queries

```cypher
// Query 1: Find top 10 matching jobs for a candidate
MATCH (candidate:Candidate {id: $candidateId})
      -[has:HAS_SKILL]->(skill:Skill)
      <-[requires:REQUIRES_SKILL]-(job:Job)
WHERE job.status = 'active'
  AND job.salary_min >= candidate.salary_min
  AND any(loc IN job.locations WHERE loc IN candidate.preferred_locations)
WITH job, 
     collect(DISTINCT skill.name) as matched_skills,
     count(DISTINCT skill) as skill_count,
     sum(CASE WHEN requires.required THEN 1.0 ELSE 0.5 END) as weighted_score
WHERE skill_count >= 5  // Minimum 5 matching skills
RETURN job.id,
       job.title,
       job.company_name,
       matched_skills,
       skill_count,
       weighted_score
ORDER BY weighted_score DESC, skill_count DESC
LIMIT 10;

// Query 2: Find candidates for a job
MATCH (job:Job {id: $jobId})
      -[requires:REQUIRES_SKILL]->(skill:Skill)
      <-[has:HAS_SKILL]-(candidate:Candidate)
WHERE has.proficiency IN ['Expert', 'Working']
  AND candidate.salary_min <= job.salary_max
WITH candidate,
     collect(DISTINCT skill.name) as matched_skills,
     count(DISTINCT skill) as skill_count
WHERE skill_count >= 5
RETURN candidate.id,
       candidate.name,
       candidate.years_experience,
       candidate.validation_score,
       matched_skills,
       skill_count
ORDER BY skill_count DESC, candidate.validation_score DESC
LIMIT 20;

// Query 3: Find similar candidates (for recommendations)
MATCH (candidate1:Candidate {id: $candidateId})
      -[:HAS_SKILL]->(skill:Skill)
      <-[:HAS_SKILL]-(candidate2:Candidate)
WHERE candidate1.id <> candidate2.id
WITH candidate2,
     count(DISTINCT skill) as shared_skills
WHERE shared_skills >= 5
RETURN candidate2.id,
       candidate2.name,
       shared_skills
ORDER BY shared_skills DESC
LIMIT 10;

// Query 4: Company similarity (for culture fit)
MATCH (company1:Company {id: $companyId})
      -[:IN_INDUSTRY]->(industry:Industry)
      <-[:IN_INDUSTRY]-(company2:Company)
WHERE company1.id <> company2.id
  AND company1.size = company2.size
RETURN company2.id,
       company2.name,
       company2.tech_stack
LIMIT 10;

// Query 5: Multi-hop: Find candidates who worked at companies similar to target
MATCH (target_company:Company {id: $companyId})
      -[:IN_INDUSTRY]->(industry:Industry)
      <-[:IN_INDUSTRY]-(similar_company:Company)
      <-[:WORKED_AT]-(candidate:Candidate)
      -[:HAS_SKILL]->(skill:Skill {name: $requiredSkill})
RETURN DISTINCT candidate.id,
       candidate.name,
       similar_company.name as previous_company
LIMIT 20;
```

---

## 3. Qdrant Vector Schema (Semantic Matching)

### Collections

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(url="https://your-cluster.qdrant.io")

# Collection 1: Candidate profiles
client.create_collection(
    collection_name="candidate_profiles",
    vectors_config=VectorParams(
        size=768,  # text-embedding-3-small dimension
        distance=Distance.COSINE
    )
)

# Collection 2: Job descriptions
client.create_collection(
    collection_name="job_descriptions",
    vectors_config=VectorParams(
        size=768,
        distance=Distance.COSINE
    )
)

# Collection 3: Skills (for semantic clustering)
client.create_collection(
    collection_name="skills_semantic",
    vectors_config=VectorParams(
        size=768,
        distance=Distance.COSINE
    )
)
```

### Point Structure

```python
# Insert candidate profile
from openai import OpenAI
openai_client = OpenAI()

# Generate embedding from profile text
profile_text = """
Senior Full Stack Engineer with 20 years of experience building scalable web applications.
Expert in React, TypeScript, Node.js, and PostgreSQL. Built real-time video platforms using WebRTC.
Passionate about clean code, mentoring junior developers, and shipping products users love.
"""

embedding = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=profile_text
).data[0].embedding

client.upsert(
    collection_name="candidate_profiles",
    points=[
        PointStruct(
            id=12345,  # candidate_id from PostgreSQL
            vector=embedding,
            payload={
                # Filterable metadata
                "candidate_id": 12345,
                "name": "Rich O'Brien",
                "years_experience": 20,
                "salary_min": 180000,
                "salary_max": 250000,
                "location": "Remote",
                "preferred_locations": ["Remote", "Denver, CO"],
                "validation_score": 87.5,
                "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "WebRTC"],
                "availability": "2_weeks",
                "remote_preference": "remote_only",
                "updated_at": "2025-12-05T10:00:00Z"
            }
        )
    ]
)

# Insert job description
job_text = """
Cloudflare is looking for a Senior Full Stack Engineer to build our next-generation edge computing platform.
You'll work with React, TypeScript, and Go to create blazing-fast web applications that serve millions of users.
We value engineers who care about performance, security, and developer experience.
Remote work available with flexible hours.
"""

job_embedding = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=job_text
).data[0].embedding

client.upsert(
    collection_name="job_descriptions",
    points=[
        PointStruct(
            id=789,  # job_id from PostgreSQL
            vector=job_embedding,
            payload={
                "job_id": 789,
                "company_id": 456,
                "company_name": "Cloudflare",
                "title": "Senior Full Stack Engineer",
                "salary_min": 200000,
                "salary_max": 260000,
                "location": "Remote",
                "locations": ["Remote", "San Francisco, CA"],
                "required_skills": ["React", "TypeScript", "Go"],
                "nice_to_have_skills": ["WebRTC", "Rust"],
                "status": "active",
                "updated_at": "2025-12-05T09:00:00Z"
            }
        )
    ]
)
```

### Search Queries

```python
# Query 1: Find jobs semantically similar to candidate profile
def find_matching_jobs(candidate_id: int, top_k: int = 10):
    # Get candidate's profile vector
    candidate = client.retrieve(
        collection_name="candidate_profiles",
        ids=[candidate_id]
    )[0]
    
    # Search for similar jobs
    results = client.search(
        collection_name="job_descriptions",
        query_vector=candidate.vector,
        limit=top_k,
        query_filter={
            "must": [
                {"key": "status", "match": {"value": "active"}},
                {"key": "salary_min", "range": {"gte": candidate.payload["salary_min"]}}
            ],
            "should": [
                {"key": "locations", "match": {"any": candidate.payload["preferred_locations"]}}
            ]
        },
        score_threshold=0.7  # Only return if 70%+ similar
    )
    
    return [
        {
            "job_id": r.payload["job_id"],
            "company": r.payload["company_name"],
            "title": r.payload["title"],
            "semantic_score": r.score * 100,  # Convert to percentage
            "salary_range": f"${r.payload['salary_min']:,} - ${r.payload['salary_max']:,}"
        }
        for r in results
    ]

# Query 2: Find candidates semantically similar to job
def find_matching_candidates(job_id: int, top_k: int = 20):
    job = client.retrieve(
        collection_name="job_descriptions",
        ids=[job_id]
    )[0]
    
    results = client.search(
        collection_name="candidate_profiles",
        query_vector=job.vector,
        limit=top_k,
        query_filter={
            "must": [
                {"key": "salary_min", "range": {"lte": job.payload["salary_max"]}},
                {"key": "availability", "match": {"any": ["immediate", "2_weeks", "1_month"]}}
            ],
            "should": [
                {"key": "validation_score", "range": {"gte": 70}}  # Prefer verified candidates
            ]
        },
        score_threshold=0.7
    )
    
    return [
        {
            "candidate_id": r.payload["candidate_id"],
            "name": r.payload["name"],
            "semantic_score": r.score * 100,
            "validation_score": r.payload["validation_score"],
            "years_experience": r.payload["years_experience"]
        }
        for r in results
    ]

# Query 3: Find similar skills (for skill recommendations)
def find_similar_skills(skill_name: str, top_k: int = 10):
    # First, get the embedding for the skill
    skill_embedding = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=skill_name
    ).data[0].embedding
    
    results = client.search(
        collection_name="skills_semantic",
        query_vector=skill_embedding,
        limit=top_k
    )
    
    return [r.payload["skill_name"] for r in results]

# Example: "React" → ["Vue.js", "Angular", "Svelte", "Preact", ...]
```

---

## 4. Redis Schema (Hot Cache & Real-Time)

### Data Structures

```python
import redis
import json
from datetime import timedelta

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# 1. Daily swipe feed (sorted set)
# Key: candidate:{candidate_id}:daily_matches
# Value: sorted set of job IDs with scores
def cache_daily_matches(candidate_id: int, matches: list):
    key = f"candidate:{candidate_id}:daily_matches"
    
    # Store as sorted set (score = match percentage)
    for match in matches:
        r.zadd(key, {match['job_id']: match['score']})
    
    # Expire in 1 hour
    r.expire(key, timedelta(hours=1))

def get_daily_matches(candidate_id: int) -> list:
    key = f"candidate:{candidate_id}:daily_matches"
    
    # Get all matches, sorted by score (descending)
    matches = r.zrange(key, 0, -1, desc=True, withscores=True)
    return [{"job_id": int(job_id), "score": score} for job_id, score in matches]

# 2. User sessions (hash)
# Key: session:{session_id}
def store_session(session_id: str, user_data: dict):
    key = f"session:{session_id}"
    r.hset(key, mapping=user_data)
    r.expire(key, timedelta(days=7))  # 7-day session

def get_session(session_id: str) -> dict:
    key = f"session:{session_id}"
    return r.hgetall(key)

# 3. Real-time notifications (pub/sub)
def publish_match_notification(candidate_id: int, job_id: int):
    channel = f"user:{candidate_id}:notifications"
    message = {
        "type": "match_created",
        "job_id": job_id,
        "timestamp": "2025-12-05T10:30:00Z"
    }
    r.publish(channel, json.dumps(message))

# 4. Rate limiting (counter)
def check_rate_limit(user_id: int, action: str, limit: int, window_seconds: int) -> bool:
    key = f"ratelimit:{user_id}:{action}"
    
    current = r.get(key)
    if current and int(current) >= limit:
        return False  # Rate limit exceeded
    
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window_seconds)
    pipe.execute()
    
    return True

# Example: Limit swipes to 50/hour for free users
can_swipe = check_rate_limit(user_id=12345, action="swipe", limit=50, window_seconds=3600)

# 5. Active WebSocket connections (set)
def add_active_connection(user_id: int, connection_id: str):
    key = f"user:{user_id}:connections"
    r.sadd(key, connection_id)
    r.expire(key, timedelta(hours=1))

def get_active_connections(user_id: int) -> list:
    key = f"user:{user_id}:connections"
    return list(r.smembers(key))

# 6. Leaderboard (sorted set)
def update_leaderboard(user_id: int, xp_points: int):
    r.zadd("leaderboard:global", {user_id: xp_points})

def get_leaderboard(top_n: int = 10) -> list:
    return r.zrange("leaderboard:global", 0, top_n - 1, desc=True, withscores=True)

# 7. Cache match scores (hash)
def cache_match_score(candidate_id: int, job_id: int, score: float, explanation: dict):
    key = f"match_score:{candidate_id}:{job_id}"
    r.hset(key, mapping={
        "score": score,
        "explanation": json.dumps(explanation),
        "computed_at": "2025-12-05T10:00:00Z"
    })
    r.expire(key, timedelta(hours=24))

def get_cached_match_score(candidate_id: int, job_id: int):
    key = f"match_score:{candidate_id}:{job_id}"
    data = r.hgetall(key)
    if data:
        data['explanation'] = json.loads(data['explanation'])
    return data
```

### Redis Key Patterns

```
# User sessions
session:{session_id}                        → Hash (user data)

# Daily matches (cached)
candidate:{candidate_id}:daily_matches      → Sorted Set (job_id → score)
job:{job_id}:daily_candidates               → Sorted Set (candidate_id → score)

# Match scores (cached 24 hours)
match_score:{candidate_id}:{job_id}         → Hash (score, explanation)

# Real-time notifications
user:{user_id}:notifications                → Pub/Sub channel

# WebSocket connections
user:{user_id}:connections                  → Set (connection IDs)

# Rate limiting
ratelimit:{user_id}:{action}                → Counter (with TTL)

# Leaderboards
leaderboard:global                          → Sorted Set (user_id → XP)
leaderboard:friends:{user_id}               → Sorted Set (friend_id → XP)

# Swipe state (prevent double-swipe)
swiped:{candidate_id}:{job_id}              → String ("right"/"left", TTL: 7 days)

# Live event participants
event:{event_id}:participants               → Set (user IDs)
event:{event_id}:candidate:{id}:matches     → List (job IDs matched during event)
```

---

## 5. Data Sync Strategy

### Change Data Capture (CDC)

PostgreSQL changes are synced to other databases in real-time:

```
PostgreSQL Write
       │
       ├──> Debezium (CDC)
       │    Captures: INSERT, UPDATE, DELETE
       │
       ├──> Kafka Topic: "candidate_profiles"
       │                   "jobs"
       │                   "skills"
       │
       └──> Consumer Services:
            ├─> Neo4j Sync Service
            │   - Updates graph nodes/relationships
            │   - Async (< 1 second lag)
            │
            ├─> Qdrant Sync Service
            │   - Re-generates embeddings
            │   - Updates vector points
            │   - Async (< 5 seconds lag)
            │
            └─> Redis Cache Invalidation
                - Deletes affected cache keys
                - Immediate (< 100ms)
```

### Sync Examples

```python
# Example CDC event handler
def handle_candidate_profile_update(event: dict):
    candidate_id = event['candidate_id']
    
    # 1. Update Neo4j graph
    update_neo4j_candidate(candidate_id, event['skills'])
    
    # 2. Re-generate embedding and update Qdrant
    profile_text = generate_profile_text(event)
    embedding = generate_embedding(profile_text)
    update_qdrant_candidate(candidate_id, embedding, event)
    
    # 3. Invalidate Redis cache
    redis_client.delete(f"candidate:{candidate_id}:daily_matches")
    
    print(f"Synced candidate {candidate_id} across all DBs")

def update_neo4j_candidate(candidate_id: int, skills: list):
    with neo4j_driver.session() as session:
        # Update candidate node
        session.run("""
            MERGE (c:Candidate {id: $candidate_id})
            SET c.updated_at = datetime()
        """, candidate_id=candidate_id)
        
        # Update skills
        for skill in skills:
            session.run("""
                MATCH (c:Candidate {id: $candidate_id})
                MERGE (s:Skill {name: $skill_name})
                MERGE (c)-[r:HAS_SKILL]->(s)
                SET r.proficiency = $proficiency,
                    r.years = $years,
                    r.validated = $validated
            """, 
                candidate_id=candidate_id,
                skill_name=skill['name'],
                proficiency=skill['proficiency'],
                years=skill['years'],
                validated=skill['validated']
            )
```

---

## Performance Benchmarks

| Operation | Target | Database | Strategy |
|-----------|--------|----------|----------|
| User login | < 50ms | PostgreSQL | Indexed email lookup |
| Load profile | < 100ms | PostgreSQL | Single query with JOINs |
| Daily swipe feed | < 1ms | Redis | Sorted set cache hit |
| Match calculation (cold) | < 100ms | Neo4j + Qdrant + Scoring | Parallel queries |
| Match calculation (warm) | < 10ms | Redis | Cache hit |
| Semantic search | < 20ms | Qdrant | Vector similarity |
| Graph traversal | < 50ms | Neo4j | Indexed traversal |
| Send message | < 50ms | PostgreSQL + Redis | Write + pub/sub |
| Real-time notification | < 30ms | Redis Pub/Sub | WebSocket push |

---

## Migration Scripts

Located in `/database/migrations/`:
- `001_initial_schema.sql` - PostgreSQL tables
- `002_neo4j_schema.cypher` - Graph constraints and indexes
- `003_qdrant_collections.py` - Vector collections
- `004_seed_data.sql` - Sample data for testing

---

## Backup Strategy

- **PostgreSQL:** Daily snapshots (DigitalOcean managed backups)
- **Neo4j:** Daily exports to S3
- **Qdrant:** Weekly snapshots (collection exports)
- **Redis:** AOF (Append-Only File) persistence enabled

---

*Next: We'll create the actual migration scripts and sample data for local development.*
