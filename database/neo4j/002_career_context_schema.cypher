// HireWire Neo4j Career Context Schema Upgrade
// Created: December 6, 2025
// Purpose: Add career context nodes and relationships for intelligent matching

// =============================================================================
// NEW NODES - Career Context Entities
// =============================================================================

// Interest nodes - what excites people
CREATE CONSTRAINT interest_name IF NOT EXISTS
FOR (i:Interest) REQUIRE i.name IS UNIQUE;

// Motivation nodes - what drives people
CREATE CONSTRAINT motivation_name IF NOT EXISTS
FOR (m:Motivation) REQUIRE m.name IS UNIQUE;

// CareerGoal nodes - what people want to achieve
CREATE CONSTRAINT career_goal_id IF NOT EXISTS
FOR (g:CareerGoal) REQUIRE g.id IS UNIQUE;

// WorkCulture nodes - ideal environments
CREATE CONSTRAINT work_culture_name IF NOT EXISTS
FOR (w:WorkCulture) REQUIRE w.name IS UNIQUE;

// LearningPath nodes - skills to develop
CREATE CONSTRAINT learning_path_id IF NOT EXISTS
FOR (l:LearningPath) REQUIRE l.id IS UNIQUE;

// =============================================================================
// INDEXES - Career Context
// =============================================================================

CREATE INDEX candidate_trajectory_idx IF NOT EXISTS
FOR (c:Candidate) ON (c.career_trajectory);

CREATE INDEX interest_category_idx IF NOT EXISTS
FOR (i:Interest) ON (i.category);

CREATE INDEX motivation_type_idx IF NOT EXISTS
FOR (m:Motivation) ON (m.type);

CREATE INDEX work_culture_type_idx IF NOT EXISTS
FOR (w:WorkCulture) ON (w.type);

// =============================================================================
// SEED DATA - Common Interests
// =============================================================================

// Technical interests
MERGE (int1:Interest {name: 'Solving complex technical problems', category: 'Technical', weight: 1.0})
MERGE (int2:Interest {name: 'Building products that help people', category: 'Product', weight: 1.0})
MERGE (int3:Interest {name: 'Working with cutting-edge technology', category: 'Technical', weight: 1.0})
MERGE (int4:Interest {name: 'System design and architecture', category: 'Technical', weight: 1.0})
MERGE (int5:Interest {name: 'Data and analytics', category: 'Technical', weight: 1.0})
MERGE (int6:Interest {name: 'AI/ML applications', category: 'Technical', weight: 1.0})
MERGE (int7:Interest {name: 'Security and privacy', category: 'Technical', weight: 1.0})
MERGE (int8:Interest {name: 'Performance optimization', category: 'Technical', weight: 1.0})
MERGE (int9:Interest {name: 'Developer tools and infrastructure', category: 'DevTools', weight: 1.0})

// People/Growth interests
MERGE (int10:Interest {name: 'Mentoring and teaching others', category: 'Growth', weight: 1.0})
MERGE (int11:Interest {name: 'Team collaboration', category: 'Growth', weight: 1.0})
MERGE (int12:Interest {name: 'Building teams', category: 'Growth', weight: 1.0})

// =============================================================================
// SEED DATA - Common Motivations
// =============================================================================

MERGE (mot1:Motivation {name: 'Technical challenges', type: 'Challenge', weight: 1.0})
MERGE (mot2:Motivation {name: 'Career growth', type: 'Growth', weight: 1.0})
MERGE (mot3:Motivation {name: 'Making an impact', type: 'Impact', weight: 1.0})
MERGE (mot4:Motivation {name: 'Financial compensation', type: 'Financial', weight: 1.0})
MERGE (mot5:Motivation {name: 'Work-life balance', type: 'Balance', weight: 1.0})
MERGE (mot6:Motivation {name: 'Learning opportunities', type: 'Growth', weight: 1.0})
MERGE (mot7:Motivation {name: 'Team collaboration', type: 'Social', weight: 1.0})
MERGE (mot8:Motivation {name: 'Company mission', type: 'Impact', weight: 1.0})
MERGE (mot9:Motivation {name: 'Autonomy and ownership', type: 'Autonomy', weight: 1.0})
MERGE (mot10:Motivation {name: 'Recognition and visibility', type: 'Social', weight: 1.0});

// =============================================================================
// SEED DATA - Work Cultures
// =============================================================================

MERGE (wc1:WorkCulture {name: 'Fast-paced startup', type: 'pace', characteristics: ['rapid iteration', 'high autonomy', 'wear many hats']})
MERGE (wc2:WorkCulture {name: 'Balanced growth-stage', type: 'pace', characteristics: ['sustainable pace', 'defined processes', 'mentorship']})
MERGE (wc3:WorkCulture {name: 'Established enterprise', type: 'pace', characteristics: ['structured', 'stability', 'resources']})
MERGE (wc4:WorkCulture {name: 'Small team (2-10)', type: 'size', characteristics: ['tight-knit', 'broad impact', 'direct communication']})
MERGE (wc5:WorkCulture {name: 'Medium team (10-50)', type: 'size', characteristics: ['specialized roles', 'collaboration', 'some structure']})
MERGE (wc6:WorkCulture {name: 'Large team (50+)', type: 'size', characteristics: ['specialized', 'processes', 'cross-team work']})
MERGE (wc7:WorkCulture {name: 'Remote-first', type: 'location', characteristics: ['async communication', 'documentation', 'flexibility']})
MERGE (wc8:WorkCulture {name: 'Hybrid', type: 'location', characteristics: ['flexibility', 'in-person collaboration', 'choice']})
MERGE (wc9:WorkCulture {name: 'Office-centric', type: 'location', characteristics: ['face-to-face', 'spontaneous collaboration', 'team bonding']});

// =============================================================================
// NEW RELATIONSHIPS - Career Context Matching
// =============================================================================

// Candidate → Interest (what excites them)
// Usage: MATCH (c:Candidate)-[r:INTERESTED_IN]->(i:Interest)
// Properties: strength (0-1), added_at

// Candidate → Motivation (what drives them)
// Usage: MATCH (c:Candidate)-[r:MOTIVATED_BY]->(m:Motivation)
// Properties: priority (1-3, top 3 motivations), added_at

// Candidate → WorkCulture (ideal environment)
// Usage: MATCH (c:Candidate)-[r:PREFERS_CULTURE]->(w:WorkCulture)
// Properties: importance (critical/preferred/open), added_at

// Candidate → CareerGoal (what they want to achieve)
// Usage: MATCH (c:Candidate)-[r:PURSUING_GOAL]->(g:CareerGoal)
// Properties: timeframe (1_year/5_year/long_term), added_at

// Candidate → Skill (skills they want to learn)
// Usage: MATCH (c:Candidate)-[r:WANTS_TO_LEARN]->(s:Skill)
// Properties: priority (high/medium/low), reason, added_at

// Company → WorkCulture (what they offer)
// Usage: MATCH (co:Company)-[r:OFFERS_CULTURE]->(w:WorkCulture)
// Properties: confidence (0-1), added_at

// Job → Interest (aligned interests)
// Usage: MATCH (j:Job)-[r:INVOLVES]->(i:Interest)
// Properties: relevance (0-1), added_at

// Job → Skill (learning opportunities)
// Usage: MATCH (j:Job)-[r:TEACHES]->(s:Skill)
// Properties: level (beginner/intermediate/advanced), added_at

// =============================================================================
// CAREER TRAJECTORY NODES
// =============================================================================

MERGE (traj1:CareerTrajectory {
    name: 'Individual Contributor', 
    key: 'individual_contributor',
    description: 'Deep technical expertise, hands-on coding, architecture',
    typical_roles: ['Senior Engineer', 'Staff Engineer', 'Principal Engineer', 'Distinguished Engineer']
})
MERGE (traj2:CareerTrajectory {
    name: 'Management', 
    key: 'management',
    description: 'Leading teams, people development, delivery',
    typical_roles: ['Engineering Manager', 'Senior EM', 'Director of Engineering']
})
MERGE (traj3:CareerTrajectory {
    name: 'Leadership', 
    key: 'leadership',
    description: 'Strategic vision, organization building, executive',
    typical_roles: ['VP Engineering', 'CTO', 'Head of Engineering']
})
MERGE (traj4:CareerTrajectory {
    name: 'Entrepreneurship', 
    key: 'entrepreneurship',
    description: 'Building companies, founding teams, product-market fit',
    typical_roles: ['Founder', 'Co-founder', 'Early employee at startup']
})
MERGE (traj5:CareerTrajectory {
    name: 'Exploring', 
    key: 'exploring',
    description: 'Open to multiple paths, discovering interests',
    typical_roles: ['Various opportunities']
});

// Create progression paths
MATCH (ic:CareerTrajectory {key: 'individual_contributor'})
MATCH (mgmt:CareerTrajectory {key: 'management'})
MATCH (lead:CareerTrajectory {key: 'leadership'})
MERGE (ic)-[:CAN_TRANSITION_TO {difficulty: 'medium', common: true}]->(mgmt)
MERGE (mgmt)-[:CAN_TRANSITION_TO {difficulty: 'low', common: true}]->(lead)
MERGE (ic)-[:CAN_TRANSITION_TO {difficulty: 'high', common: false}]->(lead);

// =============================================================================
// EXAMPLE QUERIES - Career Context Matching
// =============================================================================

// Find candidates interested in AI/ML who want to learn
// MATCH (c:Candidate)-[:INTERESTED_IN]->(i:Interest {name: 'AI/ML applications'})
// MATCH (c)-[:WANTS_TO_LEARN]->(s:Skill)
// WHERE s.category = 'AI'
// RETURN c, i, s

// Find jobs that match candidate's motivations
// MATCH (c:Candidate {id: 123})-[m:MOTIVATED_BY]->(mot:Motivation)
// MATCH (j:Job)-[:INVOLVES]->(i:Interest)
// WHERE i.name IN c.current_interests
// RETURN j, COUNT(mot) as motivation_match
// ORDER BY motivation_match DESC

// Find candidates with similar career trajectory
// MATCH (c:Candidate {id: 123})
// MATCH (other:Candidate)
// WHERE c.career_trajectory = other.career_trajectory
// AND other.id <> c.id
// RETURN other

// Find jobs that offer learning opportunities candidate wants
// MATCH (c:Candidate {id: 123})-[:WANTS_TO_LEARN]->(skill:Skill)
// MATCH (j:Job)-[:TEACHES]->(skill)
// RETURN j, COUNT(skill) as learning_match
// ORDER BY learning_match DESC

// Find culture fit matches
// MATCH (c:Candidate {id: 123})-[:PREFERS_CULTURE]->(wc:WorkCulture)
// MATCH (job:Job)<-[:POSTS]-(company:Company)-[:OFFERS_CULTURE]->(wc)
// RETURN job, company, COUNT(wc) as culture_match
// ORDER BY culture_match DESC

// =============================================================================
// CLEANUP
// =============================================================================

// Return summary
MATCH (i:Interest) WITH COUNT(i) as interests
MATCH (m:Motivation) WITH interests, COUNT(m) as motivations
MATCH (w:WorkCulture) WITH interests, motivations, COUNT(w) as cultures
MATCH (t:CareerTrajectory) WITH interests, motivations, cultures, COUNT(t) as trajectories
RETURN 
    interests as total_interests,
    motivations as total_motivations,
    cultures as total_work_cultures,
    trajectories as total_trajectories,
    'Career context schema initialized successfully' as status;
