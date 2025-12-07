# Career Context Database Tests

Quick tests to verify career context functionality across all databases.

## Prerequisites

All databases must be running:
```bash
docker-compose up -d
```

Ensure career context upgrades have been applied:
```bash
./database/sync-career-context.sh
# or on Windows:
database\sync-career-context.bat
```

## Running Tests

### Full Test Suite

```bash
python database/test_career_context.py
```

This will test:
- ✅ PostgreSQL: Career context schema and indexes
- ✅ Neo4j: Career nodes and relationships
- ✅ Qdrant: Career collections and semantic search
- ✅ Redis: Career caching patterns
- ✅ Cross-database: End-to-end career matching scenario

### Individual Database Tests

#### PostgreSQL - Check Career Schema
```bash
docker exec -it hirewire-postgres psql -U hirewire -d hirewire_dev -c "
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidate_profiles' 
AND column_name LIKE '%motivation%' OR column_name LIKE '%interest%'
ORDER BY column_name;
"
```

Expected: 14 career context columns

#### Neo4j - Check Career Nodes
```bash
docker exec -it hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password "
MATCH (i:Interest) RETURN count(i) as interests;
MATCH (m:Motivation) RETURN count(m) as motivations;
MATCH (w:WorkCulture) RETURN count(w) as cultures;
MATCH (t:CareerTrajectory) RETURN count(t) as trajectories;
"
```

Expected: 9+ interests, 10+ motivations, 9+ cultures, 5 trajectories

#### Qdrant - Check Collections
```bash
curl http://localhost:6333/collections
```

Expected collections:
- `candidate_career_context`
- `job_career_opportunities`
- `career_trajectory_patterns`
- `work_culture_embeddings`

#### Redis - Check Cache
```bash
docker exec -it hirewire-redis redis-cli -a hirewire_redis_password KEYS "career:*"
```

## Manual Query Examples

### Neo4j: Find Similar Career Trajectories
```cypher
MATCH (t:CareerTrajectory {key: 'individual_contributor'})
MATCH (t)-[r:CAN_TRANSITION_TO]->(other:CareerTrajectory)
RETURN t.name, other.name, r.difficulty, r.common
```

### Neo4j: Get All Interests by Category
```cypher
MATCH (i:Interest)
RETURN i.category, collect(i.name) as interests
ORDER BY i.category
```

### PostgreSQL: Find Candidates Wanting to Learn Specific Skills
```sql
SELECT 
    u.email,
    cp.skills_to_develop,
    cp.career_trajectory
FROM candidate_profiles cp
JOIN users u ON u.id = cp.user_id
WHERE 'Rust' = ANY(cp.skills_to_develop);
```

### PostgreSQL: Get Candidates by Motivation
```sql
SELECT 
    u.email,
    cp.motivations,
    cp.ideal_work_environment
FROM candidate_profiles cp
JOIN users u ON u.id = cp.user_id
WHERE 'Technical challenges' = ANY(cp.motivations);
```

## Test Results

Results are saved to `career_context_test_results.json` with details:

```json
{
  "timestamp": "2025-12-06T...",
  "overall_status": "PASS",
  "tests": {
    "postgresql": {
      "columns_found": 14,
      "status": "✅ PASS"
    },
    "neo4j": {
      "node_counts": {
        "interests": 9,
        "motivations": 10,
        "work_cultures": 9,
        "trajectories": 5
      },
      "status": "✅ PASS"
    },
    "qdrant": {
      "all_exist": true,
      "status": "✅ PASS"
    },
    "redis": {
      "can_cache_profile": true,
      "status": "✅ PASS"
    }
  }
}
```

## Troubleshooting

### PostgreSQL: Missing Columns
```bash
# Apply migration
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < database/migrations/002_add_career_context.sql
```

### Neo4j: Missing Nodes
```bash
# Reapply schema
docker exec -i hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password < database/neo4j/002_career_context_schema.cypher
```

### Qdrant: Missing Collections
```bash
# Recreate collections
python database/seeds/setup_career_context_qdrant.py
```

### Redis: Connection Issues
```bash
# Check Redis is running
docker exec hirewire-redis redis-cli -a hirewire_redis_password ping
```

## What's Being Tested

### 1. Schema Validation
- PostgreSQL has 14 career context fields
- Indexes created for array columns
- Proper data types (text[], varchar)

### 2. Graph Structure
- Neo4j nodes created (Interest, Motivation, WorkCulture, CareerTrajectory)
- Constraints enforced
- Relationships defined
- Sample data populated

### 3. Vector Search
- Qdrant collections created with 768-dim vectors
- Collections accessible
- Search functionality works
- Sample embeddings present

### 4. Caching Layer
- Redis can store career profiles
- TTL configured correctly
- Feature tracking works
- Keys properly namespaced

### 5. Integration
- Data flows between databases
- Candidate creation triggers all databases
- Caching works end-to-end
- Queries return expected results

## Next Steps After Tests Pass

1. **Update Matching Algorithm** - Incorporate career fit scoring
2. **Build Frontend** - Career context questionnaire UI
3. **Add AI Explanations** - Generate match explanations using career data
4. **Performance Testing** - Verify <100ms target with career queries
5. **Load Testing** - Test with 10k+ candidates with career context
