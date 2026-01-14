-- HireWire Seed Data - Sample Candidates and Jobs
-- Created: December 5, 2025
-- Purpose: Populate database with realistic test data

-- =============================================================================
-- SAMPLE USERS (Candidates)
-- =============================================================================

INSERT INTO users (email, name, user_type, email_verified, xp_points, level) VALUES
('rich@example.com', 'Rich O''Brien', 'candidate', true, 250, 3),
('sarah@example.com', 'Sarah Chen', 'candidate', true, 150, 2),
('mike@example.com', 'Mike Johnson', 'candidate', true, 100, 2),
('emily@example.com', 'Emily Rodriguez', 'candidate', true, 50, 1),
('david@example.com', 'David Kim', 'candidate', true, 300, 4);

-- =============================================================================
-- SAMPLE CANDIDATE PROFILES
-- =============================================================================

INSERT INTO candidate_profiles (
    user_id, headline, bio, location, timezone, years_experience, current_title, current_company,
    preferred_locations, salary_min, salary_max, availability, work_authorization,
    preferred_company_size, preferred_pace, remote_preference, validation_score, profile_completed
) VALUES
(
    1,
    'Senior Full Stack Engineer | React, Node.js, WebRTC Expert',
    'Passionate full-stack engineer with 20 years of experience building scalable web applications. Expert in React, TypeScript, Node.js, and real-time video platforms using WebRTC. Led teams of 5-10 engineers and shipped products used by millions. Love mentoring junior developers and solving complex technical challenges.',
    'Denver, CO',
    'America/Denver',
    20,
    'Staff Software Engineer',
    'AI-Now',
    ARRAY['Remote', 'Denver, CO', 'Hybrid'],
    180000,
    250000,
    '2_weeks',
    ARRAY['US Citizen'],
    ARRAY['startup', 'scale_up'],
    'fast',
    'remote_only',
    87.5,
    true
),
(
    2,
    'Frontend Engineer | React & Vue.js Specialist',
    'Creative frontend developer with 8 years building beautiful, performant user interfaces. Specialized in React and Vue.js, with a keen eye for UX/UI design. Contributed to open-source projects with 2K+ GitHub stars. Love working on consumer-facing products.',
    'San Francisco, CA',
    'America/Los_Angeles',
    8,
    'Senior Frontend Engineer',
    'Stripe',
    ARRAY['Remote', 'San Francisco, CA'],
    150000,
    200000,
    'immediate',
    ARRAY['US Citizen'],
    ARRAY['scale_up', 'enterprise'],
    'balanced',
    'hybrid',
    92.0,
    true
),
(
    3,
    'DevOps Engineer | Kubernetes & AWS Expert',
    'Infrastructure engineer with 12 years managing cloud platforms at scale. Expert in Kubernetes, AWS, Terraform, and CI/CD pipelines. Reduced deployment time by 80% and infrastructure costs by 40% at previous role. Passionate about automation and reliability.',
    'Austin, TX',
    'America/Chicago',
    12,
    'Senior DevOps Engineer',
    'HashiCorp',
    ARRAY['Remote', 'Austin, TX'],
    160000,
    220000,
    '1_month',
    ARRAY['Green Card'],
    ARRAY['scale_up', 'enterprise'],
    'balanced',
    'remote_only',
    85.0,
    true
),
(
    4,
    'Backend Engineer | Python & Distributed Systems',
    'Backend engineer with 6 years building high-performance APIs and distributed systems. Specialized in Python, Go, and microservices architecture. Built systems handling 1M+ requests/second. Love solving performance and scalability challenges.',
    'New York, NY',
    'America/New_York',
    6,
    'Backend Engineer',
    'MongoDB',
    ARRAY['Remote', 'New York, NY'],
    140000,
    180000,
    '2_weeks',
    ARRAY['H1B'],
    ARRAY['startup', 'scale_up'],
    'fast',
    'flexible',
    78.5,
    true
),
(
    5,
    'Engineering Manager | Team Leadership & Architecture',
    'Engineering leader with 15 years building and managing high-performing teams. Led teams of 15-30 engineers across multiple products. Expert in system architecture, agile methodologies, and hiring/mentoring. Passionate about building great engineering culture.',
    'Seattle, WA',
    'America/Los_Angeles',
    15,
    'Engineering Manager',
    'Amazon',
    ARRAY['Remote', 'Seattle, WA'],
    200000,
    280000,
    '3_months',
    ARRAY['US Citizen'],
    ARRAY['scale_up', 'enterprise'],
    'balanced',
    'hybrid',
    90.0,
    true
);

-- =============================================================================
-- CANDIDATE SKILLS
-- =============================================================================

-- Rich's skills (Full Stack + WebRTC)
INSERT INTO candidate_skills (candidate_profile_id, skill_id, proficiency, years_experience, validated)
SELECT 1, id, 'Expert', 8, true FROM skills WHERE name = 'React'
UNION ALL
SELECT 1, id, 'Expert', 10, true FROM skills WHERE name = 'TypeScript'
UNION ALL
SELECT 1, id, 'Expert', 12, true FROM skills WHERE name = 'Node.js'
UNION ALL
SELECT 1, id, 'Expert', 15, true FROM skills WHERE name = 'PostgreSQL'
UNION ALL
SELECT 1, id, 'Expert', 5, true FROM skills WHERE name = 'WebRTC'
UNION ALL
SELECT 1, id, 'Working', 10, true FROM skills WHERE name = 'Docker'
UNION ALL
SELECT 1, id, 'Working', 8, true FROM skills WHERE name = 'Kubernetes'
UNION ALL
SELECT 1, id, 'Working', 10, true FROM skills WHERE name = 'AWS';

-- Sarah's skills (Frontend specialist)
INSERT INTO candidate_skills (candidate_profile_id, skill_id, proficiency, years_experience, validated)
SELECT 2, id, 'Expert', 8, true FROM skills WHERE name = 'React'
UNION ALL
SELECT 2, id, 'Expert', 6, true FROM skills WHERE name = 'Vue.js'
UNION ALL
SELECT 2, id, 'Expert', 8, true FROM skills WHERE name = 'TypeScript'
UNION ALL
SELECT 2, id, 'Expert', 10, true FROM skills WHERE name = 'JavaScript'
UNION ALL
SELECT 2, id, 'Expert', 8, true FROM skills WHERE name = 'CSS'
UNION ALL
SELECT 2, id, 'Working', 4, true FROM skills WHERE name = 'Next.js'
UNION ALL
SELECT 2, id, 'Working', 5, true FROM skills WHERE name = 'Tailwind CSS';

-- Mike's skills (DevOps/Infrastructure)
INSERT INTO candidate_skills (candidate_profile_id, skill_id, proficiency, years_experience, validated)
SELECT 3, id, 'Expert', 10, true FROM skills WHERE name = 'Kubernetes'
UNION ALL
SELECT 3, id, 'Expert', 12, true FROM skills WHERE name = 'Docker'
UNION ALL
SELECT 3, id, 'Expert', 12, true FROM skills WHERE name = 'AWS'
UNION ALL
SELECT 3, id, 'Expert', 8, true FROM skills WHERE name = 'Terraform'
UNION ALL
SELECT 3, id, 'Working', 6, true FROM skills WHERE name = 'Python'
UNION ALL
SELECT 3, id, 'Working', 10, true FROM skills WHERE name = 'Git'
UNION ALL
SELECT 3, id, 'Working', 8, true FROM skills WHERE name = 'CI/CD';

-- Emily's skills (Backend specialist)
INSERT INTO candidate_skills (candidate_profile_id, skill_id, proficiency, years_experience, validated)
SELECT 4, id, 'Expert', 6, true FROM skills WHERE name = 'Python'
UNION ALL
SELECT 4, id, 'Expert', 4, true FROM skills WHERE name = 'Go'
UNION ALL
SELECT 4, id, 'Expert', 6, true FROM skills WHERE name = 'PostgreSQL'
UNION ALL
SELECT 4, id, 'Working', 5, true FROM skills WHERE name = 'MongoDB'
UNION ALL
SELECT 4, id, 'Working', 6, true FROM skills WHERE name = 'Redis'
UNION ALL
SELECT 4, id, 'Working', 4, true FROM skills WHERE name = 'Docker'
UNION ALL
SELECT 4, id, 'Learning', 2, false FROM skills WHERE name = 'Kubernetes';

-- David's skills (Manager with technical background)
INSERT INTO candidate_skills (candidate_profile_id, skill_id, proficiency, years_experience, validated)
SELECT 5, id, 'Expert', 10, true FROM skills WHERE name = 'Java'
UNION ALL
SELECT 5, id, 'Expert', 12, true FROM skills WHERE name = 'AWS'
UNION ALL
SELECT 5, id, 'Working', 8, true FROM skills WHERE name = 'Python'
UNION ALL
SELECT 5, id, 'Working', 10, true FROM skills WHERE name = 'PostgreSQL'
UNION ALL
SELECT 5, id, 'Working', 8, true FROM skills WHERE name = 'Kubernetes';

-- =============================================================================
-- SAMPLE USERS (Companies)
-- =============================================================================

INSERT INTO users (email, name, user_type, email_verified) VALUES
('hiring@cloudflare.com', 'Cloudflare Hiring', 'company', true),
('jobs@stripe.com', 'Stripe Recruiting', 'company', true),
('talent@anthropic.com', 'Anthropic Talent', 'company', true),
('careers@vercel.com', 'Vercel Careers', 'company', true);

-- =============================================================================
-- SAMPLE COMPANIES
-- =============================================================================

INSERT INTO companies (
    user_id, name, slug, description, size, industry, founded_year, headquarters_location,
    pace, remote_policy, tech_stack, is_paying_customer, subscription_tier, matches_remaining
) VALUES
(
    6,
    'Cloudflare',
    'cloudflare',
    'Making the Internet faster, safer, and more reliable. We build a global network that makes everything on the Internet secure, private, fast, and reliable.',
    'enterprise',
    'Infrastructure',
    2009,
    'San Francisco, CA',
    'fast',
    'remote_first',
    ARRAY['Go', 'Rust', 'TypeScript', 'PostgreSQL', 'Redis'],
    true,
    'growth',
    50
),
(
    7,
    'Stripe',
    'stripe',
    'Financial infrastructure for the internet. Millions of companies use Stripe to accept payments, grow revenue, and accelerate new business opportunities.',
    'enterprise',
    'Fintech',
    2010,
    'San Francisco, CA',
    'balanced',
    'hybrid',
    ARRAY['Ruby', 'Go', 'TypeScript', 'React', 'PostgreSQL'],
    true,
    'enterprise',
    100
),
(
    8,
    'Anthropic',
    'anthropic',
    'AI safety and research company building reliable, interpretable, and steerable AI systems. Creating the next generation of AI assistants.',
    'scale_up',
    'Technology',
    2021,
    'San Francisco, CA',
    'fast',
    'hybrid',
    ARRAY['Python', 'TypeScript', 'React', 'PyTorch', 'GCP'],
    true,
    'growth',
    30
),
(
    9,
    'Vercel',
    'vercel',
    'Platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.',
    'scale_up',
    'SaaS',
    2015,
    'San Francisco, CA',
    'fast',
    'remote_first',
    ARRAY['TypeScript', 'Next.js', 'React', 'Go', 'PostgreSQL'],
    false,
    'free',
    10
);

-- =============================================================================
-- SAMPLE JOBS
-- =============================================================================

INSERT INTO jobs (
    company_id, title, description, min_years_experience, max_years_experience,
    required_skills, nice_to_have_skills, salary_min, salary_max,
    locations, status
) VALUES
(
    1,
    'Senior Full Stack Engineer',
    'Join our edge computing team building next-generation web applications that serve millions of users globally. You''ll work with cutting-edge tech including WebAssembly, edge workers, and real-time data processing. We value engineers who care about performance, security, and developer experience.',
    5,
    15,
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'TypeScript'), 'name', 'TypeScript', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'React'), 'name', 'React', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Go'), 'name', 'Go', 'required', true)
    ),
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Rust'), 'name', 'Rust'),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'WebRTC'), 'name', 'WebRTC')
    ),
    200000,
    260000,
    ARRAY['Remote', 'San Francisco, CA'],
    'active'
),
(
    2,
    'Frontend Engineer - Dashboard Team',
    'Build beautiful, performant user interfaces for Stripe''s payment dashboard used by millions of businesses. You''ll work closely with designers and backend engineers to create seamless payment experiences. We value attention to detail, component design, and accessibility.',
    3,
    10,
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'React'), 'name', 'React', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'TypeScript'), 'name', 'TypeScript', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'JavaScript'), 'name', 'JavaScript', 'required', true)
    ),
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'GraphQL'), 'name', 'GraphQL'),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Next.js'), 'name', 'Next.js')
    ),
    160000,
    220000,
    ARRAY['San Francisco, CA', 'New York, NY', 'Seattle, WA'],
    'active'
),
(
    3,
    'Machine Learning Infrastructure Engineer',
    'Build and scale infrastructure for training large language models. You''ll work on distributed systems, GPU cluster management, and MLOps pipelines. We''re looking for someone who can bridge ML research and production engineering.',
    4,
    12,
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Python'), 'name', 'Python', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Kubernetes'), 'name', 'Kubernetes', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'AWS'), 'name', 'AWS', 'required', true)
    ),
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Go'), 'name', 'Go'),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Terraform'), 'name', 'Terraform')
    ),
    180000,
    250000,
    ARRAY['San Francisco, CA', 'Remote'],
    'active'
),
(
    4,
    'Staff Frontend Engineer',
    'Lead frontend architecture for Vercel''s platform and dashboard. You''ll define standards, mentor engineers, and build systems used by millions of developers. We''re looking for someone passionate about Next.js, React Server Components, and developer experience.',
    8,
    15,
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'React'), 'name', 'React', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Next.js'), 'name', 'Next.js', 'required', true),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'TypeScript'), 'name', 'TypeScript', 'required', true)
    ),
    jsonb_build_array(
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Node.js'), 'name', 'Node.js'),
        jsonb_build_object('skill_id', (SELECT id FROM skills WHERE name = 'Rust'), 'name', 'Rust')
    ),
    190000,
    260000,
    ARRAY['Remote'],
    'active'
);

-- =============================================================================
-- SAMPLE ACHIEVEMENTS UNLOCKED
-- =============================================================================

-- Give Rich some achievements
INSERT INTO user_achievements (user_id, achievement_id)
SELECT 1, id FROM achievements WHERE name IN ('First Swipe', 'First Match', 'Profile Complete', 'Validated Expert');

-- Give Sarah some achievements
INSERT INTO user_achievements (user_id, achievement_id)
SELECT 2, id FROM achievements WHERE name IN ('First Swipe', 'Profile Complete', 'Validated Expert');

-- =============================================================================
-- SUMMARY
-- =============================================================================

-- Show what was created
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Candidate Profiles', COUNT(*) FROM candidate_profiles
UNION ALL
SELECT 'Companies', COUNT(*) FROM companies
UNION ALL
SELECT 'Jobs', COUNT(*) FROM jobs
UNION ALL
SELECT 'Skills', COUNT(*) FROM skills
UNION ALL
SELECT 'Candidate Skills', COUNT(*) FROM candidate_skills
UNION ALL
SELECT 'Achievements', COUNT(*) FROM achievements
UNION ALL
SELECT 'User Achievements', COUNT(*) FROM user_achievements;
