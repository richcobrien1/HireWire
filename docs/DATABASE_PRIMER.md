# Database Primer: Graph & Vector Databases for HireWire

**Purpose:** Understanding non-relational data stores for ultra-fast matching

---

## Why Not Just PostgreSQL?

### The Matching Problem

Imagine finding the best jobs for a candidate with this profile:
```
Skills: [React, TypeScript, Node.js, PostgreSQL, Redis, Docker, AWS]
Experience: 20 years
Salary: $180K+
Location: Remote
```

**Traditional approach (SQL):**
```sql
-- This is SLOW (1-2 seconds for 100K jobs)
SELECT j.*, 
  (SELECT COUNT(*) 
   FROM job_skills js 
   WHERE js.job_id = j.id 
   AND js.skill_name IN ('React','TypeScript','Node.js',...)) as skill_matches
FROM jobs j
WHERE j.salary_min >= 180000
  AND j.location = 'Remote'
ORDER BY skill_matches DESC
LIMIT 10;
```

**Problems:**
- ❌ Subqueries for each job (N+1 queries)
- ❌ No semantic understanding ("React" ≠ "React.js" ≠ "ReactJS")
- ❌ Can't find "similar" skills (React → Vue, PostgreSQL → MySQL)
- ❌ Scales poorly (100K jobs × 7 skills = 700K comparisons)

---

## Graph Databases (Neo4j / ArangoDB)

### What Are They?

Think of it like LinkedIn's connection graph:
- **Nodes** = Things (people, jobs, skills, companies)
- **Edges** = Relationships (HAS_SKILL, REQUIRES_SKILL, WORKS_FOR)

### Visual Example

```
Traditional SQL (tables):
┌─────────────┐      ┌──────────────┐      ┌─────────┐
│ candidates  │      │ candidate_   │      │ skills  │
│             │      │ skills       │      │         │
├─────────────┤      ├──────────────┤      ├─────────┤
│ id: 1       │      │ candidate_id │      │ id: 10  │
│ name: Rich  │      │ skill_id     │      │ name:   │
└─────────────┘      │ proficiency  │      │ React   │
                     └──────────────┘      └─────────┘

Graph (nodes & relationships):
    (Candidate: Rich)
           │
           ├──[HAS_SKILL: Expert]──→ (Skill: React)
           │                               │
           ├──[HAS_SKILL: Expert]──→ (Skill: TypeScript)
           │                               │
           └──[HAS_SKILL: Working]─→ (Skill: Node.js)
                                           │
                                    [REQUIRES_SKILL]
                                           │
                                      (Job: Senior
                                       Full Stack
                                       @ Cloudflare)
```

### The Power: Traversal Queries

Instead of joining tables, you "walk" the graph:

```cypher
// Neo4j Cypher query (20-50ms for 100K jobs)
MATCH (candidate:Candidate {id: 1})
      -[has:HAS_SKILL]->(skill:Skill)
      <-[requires:REQUIRES_SKILL]-(job:Job)
WHERE job.salary_min >= candidate.salary_min
  AND job.location IN candidate.preferred_locations
WITH job, 
     collect(skill.name) as matched_skills,
     count(skill) as skill_count
WHERE skill_count >= 5  // At least 5 skill matches
RETURN job, matched_skills, skill_count
ORDER BY skill_count DESC
LIMIT 10
```

**Why this is fast:**
- ✅ Follows pointers (like linked lists) instead of table scans
- ✅ Optimized for "connected data" queries
- ✅ No expensive JOINs
- ✅ Can find multi-hop relationships ("friend of a friend")

### Real-World Example

**Question:** "Find candidates who have React AND have worked at companies similar to Cloudflare"

```cypher
MATCH (cloudflare:Company {name: 'Cloudflare'})
      -[:IN_INDUSTRY]->(industry:Industry)
      <-[:IN_INDUSTRY]-(similar_company:Company)
      <-[:WORKED_AT]-(candidate:Candidate)
      -[:HAS_SKILL]->(skill:Skill {name: 'React'})
WHERE candidate.years_experience >= 5
RETURN DISTINCT candidate
LIMIT 20
```

This traverses 4 levels deep in < 50ms. In SQL, this would be 4 JOINs + complex WHERE clauses.

---

## Vector Databases (Qdrant / Pinecone / Weaviate)

### What Are They?

Think of it like "Google search for your data":
- Convert text into **vectors** (arrays of numbers)
- Find **similar** items (not exact matches)
- "Distance" between vectors = similarity

### How Vectors Work

**Example:** Converting text to vectors

```python
# Text descriptions
candidate_bio = "Senior full-stack engineer with 20 years experience in React, Node.js, and distributed systems. Built real-time WebRTC platforms."

job_description = "Looking for a senior developer experienced in modern web frameworks, backend systems, and real-time video streaming."

# Convert to vectors (embeddings)
# These are 768-dimensional arrays (simplified to 3D here)
candidate_vector = [0.82, 0.45, 0.91, ..., 0.33]  # 768 numbers
job_vector       = [0.79, 0.48, 0.88, ..., 0.31]  # 768 numbers

# Calculate similarity (cosine distance)
similarity = cosine_similarity(candidate_vector, job_vector)
# Result: 0.94 (94% similar) ← This is a MATCH!
```

### Visual Representation

```
3D vector space (simplified from 768 dimensions):

        ↑ y-axis
        │
        │  • candidate_vector [0.82, 0.45, 0.91]
        │ /
        │/  ← small distance = high similarity
        •───────→ x-axis
       /│ job_vector [0.79, 0.48, 0.88]
      / │
     ↙  │
 z-axis

Finding similar candidates:
1. Query vector (the job you're searching for)
2. Find nearest vectors (candidates close in space)
3. Return top K results (e.g., top 10 closest)
```

### The Power: Semantic Search

**Traditional keyword search:**
```sql
-- Only finds EXACT matches
SELECT * FROM candidates 
WHERE bio LIKE '%React%' 
  AND bio LIKE '%Node.js%'
```

**Vector search:**
```python
# Finds SEMANTIC matches (understands meaning)
query = "experienced frontend developer who knows modern frameworks"

results = vector_db.search(
    query_vector=embed(query),  # Convert to vector
    top_k=10,                   # Top 10 results
    filter={"years_experience": {"$gte": 5}}
)

# Returns candidates with:
# ✅ "React expert" (not exact "modern frameworks")
# ✅ "Vue.js specialist" (similar to React)
# ✅ "10 years building SPAs" (matches "experienced")
# ❌ "Backend Python developer" (different semantic space)
```

### Real-World Example

**Scenario:** A candidate's profile says:
> "Built microservices with Node.js, deployed on Kubernetes, used RabbitMQ for message queuing"

**Job description says:**
> "Need someone with distributed systems experience, container orchestration, and event-driven architecture"

**Keyword search:** ❌ NO MATCH (different words)
**Vector search:** ✅ 87% MATCH (same concepts!)

The vector database understands:
- "microservices" ≈ "distributed systems"
- "Kubernetes" ≈ "container orchestration"
- "RabbitMQ" + "message queuing" ≈ "event-driven architecture"

---

## How They Work Together (HireWire's Strategy)

### The Three-Layer Matching System

```
┌─────────────────────────────────────────────────────────────┐
│                  Step 1: Graph Database                     │
│                  (Hard Filter Matching)                     │
├─────────────────────────────────────────────────────────────┤
│  Find candidates with:                                      │
│  ✓ At least 5 matching skills (graph traversal)           │
│  ✓ Salary range overlap                                    │
│  ✓ Location compatibility                                  │
│  ✓ Experience level match                                  │
│                                                              │
│  Result: 200 candidates (from 100K total)                  │
│  Speed: 20-50ms                                            │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Step 2: Vector Database                    │
│                  (Semantic Matching)                        │
├─────────────────────────────────────────────────────────────┤
│  From those 200, find:                                      │
│  ✓ Profile bio similar to job description                  │
│  ✓ Project descriptions match required work               │
│  ✓ Culture/pace preferences align                          │
│                                                              │
│  Result: 50 candidates (ranked by similarity)              │
│  Speed: 10-20ms                                            │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Step 3: Scoring Engine                     │
│                  (Final Ranking)                            │
├─────────────────────────────────────────────────────────────┤
│  Calculate final score (0-100):                            │
│  • Skill overlap (40%) ← from graph                        │
│  • Semantic match (15%) ← from vector                      │
│  • Experience (20%)                                         │
│  • Salary fit (10%)                                        │
│  • Culture (10%)                                           │
│  • Validation (5%)                                         │
│                                                              │
│  Result: Top 10 candidates (60%+ score)                    │
│  Speed: 5-10ms                                             │
└─────────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Step 4: Redis Cache                        │
│                  (Store for 1 hour)                         │
├─────────────────────────────────────────────────────────────┤
│  Cache results in Redis:                                   │
│  Key: "candidate:12345:daily_matches"                      │
│  Value: [job_789, job_456, job_123, ...]                   │
│                                                              │
│  Next swipe: < 1ms (instant!)                              │
└─────────────────────────────────────────────────────────────┘
```

### Total Time: 35-80ms (first time) → < 1ms (cached)

---

## Neo4j vs ArangoDB

| Feature | Neo4j | ArangoDB | Recommendation |
|---------|-------|----------|----------------|
| **Type** | Pure graph | Multi-model (graph + document + key-value) | |
| **Query Language** | Cypher (graph-specific) | AQL (similar to SQL) | Neo4j easier to learn |
| **Performance** | Optimized for graphs | Good, but not graph-optimized | Neo4j faster for traversal |
| **Flexibility** | Graph only | Can store documents too | ArangoDB more flexible |
| **Hosting** | Neo4j Aura (managed) | ArangoDB Cloud | Both have free tiers |
| **Learning Curve** | Moderate | Easier (SQL-like) | ArangoDB easier |
| **Cost** | Free tier → $65/mo | Free tier → $0.30/hr | Neo4j better free tier |

**HireWire Recommendation:** **Neo4j**
- Purpose-built for relationship queries
- Faster graph traversal
- Better free tier (starts at free, scales later)
- Stronger community & documentation

---

## Qdrant vs Pinecone vs Weaviate

| Feature | Qdrant | Pinecone | Weaviate | Recommendation |
|---------|--------|----------|----------|----------------|
| **Deployment** | Self-hosted or cloud | Cloud only | Self-hosted or cloud | |
| **Language** | Rust (fast!) | Proprietary | Go | Qdrant most performant |
| **Cost** | Free (self-hosted) | $70/mo min | Free tier | Qdrant cheapest |
| **Performance** | Excellent (< 10ms) | Excellent | Good | Qdrant/Pinecone tied |
| **Filtering** | Advanced | Good | Good | Qdrant best |
| **Learning Curve** | Easy (REST API) | Easiest | Moderate | Pinecone easiest |
| **K8s Support** | Native | No (cloud only) | Native | Qdrant/Weaviate |

**HireWire Recommendation:** **Qdrant**
- Can self-host on K8s (cost savings)
- Excellent performance (Rust-based)
- Advanced filtering (salary, location, etc.)
- Free cloud tier to start, migrate to self-hosted later

---

## Data Flow Example

### Scenario: User Updates Their Profile

```
User adds "Docker" skill to profile
         │
         ▼
┌─────────────────────────────────────────┐
│ PostgreSQL (source of truth)            │
│ UPDATE profiles                         │
│ SET skills = skills || '["Docker"]'    │
│ WHERE user_id = 12345                   │
└─────────────────────────────────────────┘
         │
         ├──> (CDC: Change Data Capture)
         │
         ├──> Neo4j Graph Update
         │    CREATE (c:Candidate {id: 12345})
         │           -[:HAS_SKILL {level: 'Working'}]->
         │           (s:Skill {name: 'Docker'})
         │
         ├──> Qdrant Vector Update
         │    1. Re-generate profile embedding
         │    2. Update vector: points.upsert(...)
         │
         └──> Redis Cache Invalidation
              DEL candidate:12345:daily_matches
              (next request will recompute)

Next swipe request (2 minutes later):
1. Check Redis: MISS (we deleted it)
2. Run graph + vector queries
3. Score results
4. Cache in Redis (1 hour TTL)
5. Return to user (80ms total)

Subsequent swipes:
1. Check Redis: HIT!
2. Return cached results (< 1ms)
```

---

## Practical Code Examples

### PostgreSQL (Traditional)

```sql
-- Create tables
CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    bio TEXT,
    years_experience INT,
    salary_min INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50)
);

CREATE TABLE candidate_skills (
    candidate_id INT REFERENCES candidates(id),
    skill_id INT REFERENCES skills(id),
    proficiency VARCHAR(20),  -- 'Expert', 'Working', 'Learning'
    PRIMARY KEY (candidate_id, skill_id)
);

-- Query: Find candidates with React skill
SELECT c.*, cs.proficiency
FROM candidates c
JOIN candidate_skills cs ON c.id = cs.candidate_id
JOIN skills s ON cs.skill_id = s.id
WHERE s.name = 'React'
  AND c.salary_min <= 200000;
```

### Neo4j (Graph)

```cypher
// Create nodes and relationships
CREATE (c:Candidate {
    id: 12345,
    email: 'rich@example.com',
    name: 'Rich O''Brien',
    years_experience: 20,
    salary_min: 180000
})

CREATE (s1:Skill {name: 'React', category: 'Frontend'})
CREATE (s2:Skill {name: 'Node.js', category: 'Backend'})

CREATE (c)-[:HAS_SKILL {proficiency: 'Expert', years: 8}]->(s1)
CREATE (c)-[:HAS_SKILL {proficiency: 'Expert', years: 10}]->(s2)

// Query: Find all candidates who have React AND Node.js
MATCH (c:Candidate)-[has1:HAS_SKILL]->(s1:Skill {name: 'React'})
MATCH (c)-[has2:HAS_SKILL]->(s2:Skill {name: 'Node.js'})
WHERE c.salary_min <= 200000
  AND has1.proficiency IN ['Expert', 'Working']
RETURN c, has1.years as react_years, has2.years as node_years
ORDER BY has1.years + has2.years DESC
LIMIT 10;

// Advanced: Find candidates with skills similar to a job
MATCH (job:Job {id: 789})
      -[requires:REQUIRES_SKILL]->(required_skill:Skill)
      <-[has:HAS_SKILL]-(candidate:Candidate)
WITH candidate, 
     collect(required_skill.name) as matched_skills,
     count(required_skill) as match_count
WHERE match_count >= 5
RETURN candidate, matched_skills, match_count
ORDER BY match_count DESC
LIMIT 20;
```

### Qdrant (Vector)

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Initialize client
client = QdrantClient(url="https://your-cluster.qdrant.io")

# Create collection (like a table)
client.create_collection(
    collection_name="candidate_profiles",
    vectors_config=VectorParams(
        size=768,  # OpenAI embedding dimension
        distance=Distance.COSINE  # Similarity metric
    )
)

# Add a candidate profile
from openai import OpenAI
openai_client = OpenAI()

# Generate embedding from profile text
profile_text = "Senior full-stack engineer with 20 years experience..."
embedding_response = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=profile_text
)
vector = embedding_response.data[0].embedding  # 768-dimensional array

# Insert into Qdrant
client.upsert(
    collection_name="candidate_profiles",
    points=[
        PointStruct(
            id=12345,  # candidate ID
            vector=vector,
            payload={
                "candidate_id": 12345,
                "name": "Rich O'Brien",
                "salary_min": 180000,
                "location": "Remote",
                "years_experience": 20
            }
        )
    ]
)

# Search for similar candidates
job_description = "Looking for experienced React and Node.js developer..."
job_embedding = openai_client.embeddings.create(
    model="text-embedding-3-small",
    input=job_description
).data[0].embedding

results = client.search(
    collection_name="candidate_profiles",
    query_vector=job_embedding,
    limit=10,
    query_filter={
        "must": [
            {"key": "salary_min", "range": {"lte": 200000}},
            {"key": "location", "match": {"value": "Remote"}}
        ]
    }
)

for result in results:
    print(f"Candidate: {result.payload['name']}")
    print(f"Similarity: {result.score * 100:.1f}%")
    print(f"Salary: ${result.payload['salary_min']:,}")
    print()
```

### Redis (Cache)

```python
import redis
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Cache daily matches for a candidate
candidate_id = 12345
daily_matches = [
    {"job_id": 789, "score": 89.5, "company": "Cloudflare"},
    {"job_id": 456, "score": 87.2, "company": "Stripe"},
    {"job_id": 123, "score": 82.0, "company": "Anthropic"}
]

# Store as sorted set (sorted by score)
cache_key = f"candidate:{candidate_id}:daily_matches"
for match in daily_matches:
    r.zadd(cache_key, {json.dumps(match): match['score']})

# Set expiration (1 hour)
r.expire(cache_key, 3600)

# Retrieve matches (sorted by score, highest first)
cached_matches = r.zrange(cache_key, 0, -1, desc=True, withscores=True)
for match_json, score in cached_matches:
    match = json.loads(match_json)
    print(f"{match['company']}: {score}%")

# Check if cache exists
if r.exists(cache_key):
    print("Cache hit! (< 1ms)")
else:
    print("Cache miss, need to recompute (80ms)")
```

---

## When to Use Each Database

| Use Case | Database | Why |
|----------|----------|-----|
| **User authentication** | PostgreSQL | ACID transactions, security |
| **Billing/payments** | PostgreSQL | Financial data needs reliability |
| **Audit logs** | PostgreSQL | Immutable history |
| **Find candidates with 5+ matching skills** | Neo4j | Graph traversal |
| **"Friend of friend" connections** | Neo4j | Multi-hop relationships |
| **Company similarity** | Neo4j | Industry/tech stack graphs |
| **Semantic job search** | Qdrant | "Find jobs LIKE this bio" |
| **Candidate similarity** | Qdrant | "Find similar people" |
| **Daily swipe feed** | Redis | Instant retrieval (< 1ms) |
| **Real-time sessions** | Redis | WebSocket state |
| **Rate limiting** | Redis | Atomic counters |

---

## Learning Resources

### Neo4j
- **Sandbox:** https://sandbox.neo4j.com (free, no signup)
- **Tutorial:** https://neo4j.com/graphacademy/
- **Cypher Cheat Sheet:** https://neo4j.com/docs/cypher-cheat-sheet/

### Qdrant
- **Docs:** https://qdrant.tech/documentation/
- **Playground:** https://qdrant.to/cloud (free tier)
- **Tutorial:** https://qdrant.tech/documentation/tutorials/

### Vector Embeddings
- **OpenAI Embeddings:** https://platform.openai.com/docs/guides/embeddings
- **Understanding Vectors:** https://www.pinecone.io/learn/vector-embeddings/

---

## Key Takeaways

1. **PostgreSQL** = Your source of truth (users, jobs, transactions)
2. **Neo4j** = Fast relationship queries (skill matching, company graphs)
3. **Qdrant** = Semantic search (find SIMILAR, not just exact matches)
4. **Redis** = Speed layer (cache everything hot, < 1ms reads)

**Together:** Ultra-fast matching (< 100ms) with high accuracy (60%+ threshold)

**Mental Model:**
- PostgreSQL stores the WHAT (data)
- Neo4j stores the HOW (relationships)
- Qdrant stores the MEANING (semantics)
- Redis stores the NOW (hot cache)

---

*Next: We'll design the actual schemas for each database and show how they sync together.*
