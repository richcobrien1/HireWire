// HireWire Neo4j Graph Schema Initialization
// Created: December 5, 2025
// Purpose: Set up constraints, indexes, and initial graph structure

// =============================================================================
// CONSTRAINTS (Uniqueness)
// =============================================================================

// Candidate nodes - unique by ID
CREATE CONSTRAINT candidate_id IF NOT EXISTS
FOR (c:Candidate) REQUIRE c.id IS UNIQUE;

// Job nodes - unique by ID
CREATE CONSTRAINT job_id IF NOT EXISTS
FOR (j:Job) REQUIRE j.id IS UNIQUE;

// Skill nodes - unique by name
CREATE CONSTRAINT skill_name IF NOT EXISTS
FOR (s:Skill) REQUIRE s.name IS UNIQUE;

// Company nodes - unique by ID
CREATE CONSTRAINT company_id IF NOT EXISTS
FOR (c:Company) REQUIRE c.id IS UNIQUE;

// Industry nodes - unique by name
CREATE CONSTRAINT industry_name IF NOT EXISTS
FOR (i:Industry) REQUIRE i.name IS UNIQUE;

// =============================================================================
// INDEXES (Performance)
// =============================================================================

// Index on candidate validation score (for filtering verified candidates)
CREATE INDEX candidate_validation_idx IF NOT EXISTS
FOR (c:Candidate) ON (c.validation_score);

// Index on candidate years of experience
CREATE INDEX candidate_experience_idx IF NOT EXISTS
FOR (c:Candidate) ON (c.years_experience);

// Index on candidate salary
CREATE INDEX candidate_salary_idx IF NOT EXISTS
FOR (c:Candidate) ON (c.salary_min);

// Index on job status (active vs inactive)
CREATE INDEX job_status_idx IF NOT EXISTS
FOR (j:Job) ON (j.status);

// Index on job salary range
CREATE INDEX job_salary_idx IF NOT EXISTS
FOR (j:Job) ON (j.salary_min, j.salary_max);

// Index on skill category
CREATE INDEX skill_category_idx IF NOT EXISTS
FOR (s:Skill) ON (s.category);

// Index on company size
CREATE INDEX company_size_idx IF NOT EXISTS
FOR (c:Company) ON (c.size);

// Index on company industry
CREATE INDEX company_industry_idx IF NOT EXISTS
FOR (c:Company) ON (c.industry);

// =============================================================================
// INITIAL SEED DATA - Skills Graph
// =============================================================================

// Create Industry nodes
MERGE (i1:Industry {name: 'Technology', parent: null})
MERGE (i2:Industry {name: 'Infrastructure', parent: 'Technology'})
MERGE (i3:Industry {name: 'SaaS', parent: 'Technology'})
MERGE (i4:Industry {name: 'E-commerce', parent: 'Technology'})
MERGE (i5:Industry {name: 'Fintech', parent: 'Technology'})
MERGE (i6:Industry {name: 'Healthcare', parent: 'Technology'})
MERGE (i7:Industry {name: 'Security', parent: 'Technology'});

// Create Skill nodes (Frontend)
MERGE (s1:Skill {name: 'React', category: 'Frontend', usage_count: 0})
MERGE (s2:Skill {name: 'Vue.js', category: 'Frontend', usage_count: 0})
MERGE (s3:Skill {name: 'Angular', category: 'Frontend', usage_count: 0})
MERGE (s4:Skill {name: 'TypeScript', category: 'Frontend', usage_count: 0})
MERGE (s5:Skill {name: 'JavaScript', category: 'Frontend', usage_count: 0})
MERGE (s6:Skill {name: 'HTML', category: 'Frontend', usage_count: 0})
MERGE (s7:Skill {name: 'CSS', category: 'Frontend', usage_count: 0})
MERGE (s8:Skill {name: 'Tailwind CSS', category: 'Frontend', usage_count: 0})
MERGE (s9:Skill {name: 'Next.js', category: 'Frontend', usage_count: 0});

// Create Skill nodes (Backend)
MERGE (s10:Skill {name: 'Node.js', category: 'Backend', usage_count: 0})
MERGE (s11:Skill {name: 'Python', category: 'Backend', usage_count: 0})
MERGE (s12:Skill {name: 'Go', category: 'Backend', usage_count: 0})
MERGE (s13:Skill {name: 'Java', category: 'Backend', usage_count: 0})
MERGE (s14:Skill {name: 'C#', category: 'Backend', usage_count: 0})
MERGE (s15:Skill {name: 'Ruby', category: 'Backend', usage_count: 0})
MERGE (s16:Skill {name: 'PHP', category: 'Backend', usage_count: 0})
MERGE (s17:Skill {name: 'Rust', category: 'Backend', usage_count: 0});

// Create Skill nodes (Database)
MERGE (s20:Skill {name: 'PostgreSQL', category: 'Database', usage_count: 0})
MERGE (s21:Skill {name: 'MySQL', category: 'Database', usage_count: 0})
MERGE (s22:Skill {name: 'MongoDB', category: 'Database', usage_count: 0})
MERGE (s23:Skill {name: 'Redis', category: 'Database', usage_count: 0})
MERGE (s24:Skill {name: 'Neo4j', category: 'Database', usage_count: 0})
MERGE (s25:Skill {name: 'Elasticsearch', category: 'Database', usage_count: 0});

// Create Skill nodes (DevOps/Cloud)
MERGE (s30:Skill {name: 'Docker', category: 'DevOps', usage_count: 0})
MERGE (s31:Skill {name: 'Kubernetes', category: 'DevOps', usage_count: 0})
MERGE (s32:Skill {name: 'AWS', category: 'Cloud', usage_count: 0})
MERGE (s33:Skill {name: 'GCP', category: 'Cloud', usage_count: 0})
MERGE (s34:Skill {name: 'Azure', category: 'Cloud', usage_count: 0})
MERGE (s35:Skill {name: 'Terraform', category: 'DevOps', usage_count: 0})
MERGE (s36:Skill {name: 'CI/CD', category: 'DevOps', usage_count: 0});

// Create Skill nodes (Other)
MERGE (s40:Skill {name: 'Git', category: 'Tools', usage_count: 0})
MERGE (s41:Skill {name: 'GraphQL', category: 'API', usage_count: 0})
MERGE (s42:Skill {name: 'REST API', category: 'API', usage_count: 0})
MERGE (s43:Skill {name: 'WebRTC', category: 'Realtime', usage_count: 0})
MERGE (s44:Skill {name: 'Socket.io', category: 'Realtime', usage_count: 0});

// Create skill relationships (similar/related skills)
// This helps with semantic matching even without vector DB

MATCH (react:Skill {name: 'React'})
MATCH (vue:Skill {name: 'Vue.js'})
MATCH (angular:Skill {name: 'Angular'})
MATCH (nextjs:Skill {name: 'Next.js'})
CREATE (react)-[:SIMILAR_TO {weight: 0.7}]->(vue)
CREATE (react)-[:SIMILAR_TO {weight: 0.6}]->(angular)
CREATE (react)-[:OFTEN_WITH {weight: 0.9}]->(nextjs);

MATCH (node:Skill {name: 'Node.js'})
MATCH (js:Skill {name: 'JavaScript'})
MATCH (ts:Skill {name: 'TypeScript'})
CREATE (node)-[:REQUIRES {weight: 1.0}]->(js)
CREATE (ts)-[:EXTENDS {weight: 1.0}]->(js);

MATCH (postgres:Skill {name: 'PostgreSQL'})
MATCH (mysql:Skill {name: 'MySQL'})
CREATE (postgres)-[:SIMILAR_TO {weight: 0.8}]->(mysql);

MATCH (docker:Skill {name: 'Docker'})
MATCH (k8s:Skill {name: 'Kubernetes'})
CREATE (k8s)-[:REQUIRES {weight: 0.9}]->(docker);

MATCH (aws:Skill {name: 'AWS'})
MATCH (gcp:Skill {name: 'GCP'})
MATCH (azure:Skill {name: 'Azure'})
CREATE (aws)-[:SIMILAR_TO {weight: 0.7}]->(gcp)
CREATE (aws)-[:SIMILAR_TO {weight: 0.7}]->(azure)
CREATE (gcp)-[:SIMILAR_TO {weight: 0.7}]->(azure);

// =============================================================================
// HELPER QUERIES (Commented - for reference)
// =============================================================================

// Query 1: Find top matching jobs for a candidate
// MATCH (candidate:Candidate {id: $candidateId})
//       -[has:HAS_SKILL]->(skill:Skill)
//       <-[requires:REQUIRES_SKILL]-(job:Job)
// WHERE job.status = 'active'
//   AND job.salary_min >= candidate.salary_min
//   AND any(loc IN job.locations WHERE loc IN candidate.preferred_locations)
// WITH job, 
//      collect(DISTINCT skill.name) as matched_skills,
//      count(DISTINCT skill) as skill_count,
//      sum(CASE WHEN requires.required THEN 1.0 ELSE 0.5 END) as weighted_score
// WHERE skill_count >= 5
// RETURN job.id,
//        job.title,
//        job.company_name,
//        matched_skills,
//        skill_count,
//        weighted_score
// ORDER BY weighted_score DESC, skill_count DESC
// LIMIT 10;

// Query 2: Find candidates for a job
// MATCH (job:Job {id: $jobId})
//       -[requires:REQUIRES_SKILL]->(skill:Skill)
//       <-[has:HAS_SKILL]-(candidate:Candidate)
// WHERE has.proficiency IN ['Expert', 'Working']
//   AND candidate.salary_min <= job.salary_max
// WITH candidate,
//      collect(DISTINCT skill.name) as matched_skills,
//      count(DISTINCT skill) as skill_count
// WHERE skill_count >= 5
// RETURN candidate.id,
//        candidate.name,
//        candidate.years_experience,
//        candidate.validation_score,
//        matched_skills,
//        skill_count
// ORDER BY skill_count DESC, candidate.validation_score DESC
// LIMIT 20;

// Query 3: Find similar skills (for recommendations)
// MATCH (skill:Skill {name: $skillName})
//       -[rel:SIMILAR_TO|OFTEN_WITH]-(similar:Skill)
// RETURN similar.name, type(rel) as relationship_type, rel.weight
// ORDER BY rel.weight DESC
// LIMIT 10;

// Query 4: Find candidates with skill and similar skills
// MATCH (skill:Skill {name: $requiredSkill})
// OPTIONAL MATCH (skill)-[:SIMILAR_TO]-(similar:Skill)
// WITH collect(skill) + collect(similar) as all_skills
// UNWIND all_skills as s
// MATCH (s)<-[has:HAS_SKILL]-(candidate:Candidate)
// WHERE has.proficiency IN ['Expert', 'Working']
// RETURN DISTINCT candidate
// LIMIT 20;

// =============================================================================
// INITIALIZATION COMPLETE
// =============================================================================

// Return summary of created nodes
MATCH (n)
RETURN labels(n)[0] as NodeType, count(n) as Count
ORDER BY Count DESC;
