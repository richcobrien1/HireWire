# HireWire - Technical Architecture

**Last Updated:** December 5, 2025  
**Status:** Initial Architecture Design

---

## Architecture Philosophy

HireWire is a **two-sided marketplace** requiring:
- ⚡ **Ultra-fast matching** (< 100ms response times)
- 🎯 **Precision matching** (60%+ accuracy to prevent time waste)
- 📱 **Social network responsiveness** (real-time updates, instant feedback)
- 🔌 **Enterprise API access** (for companies/recruiters)
- 🎬 **Rich media support** (images, video profiles)
- ♾️ **Scalability** (handle millions of matches/day)

---

## Infrastructure Stack

### Foundation (Same as TrafficJamz/Slicer)

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAYER                           │
├─────────────────────────────────────────────────────────────┤
│  Web App (Vercel)  │  Mobile PWA  │  API Clients           │
│  - Next.js/React   │  - React     │  - REST/GraphQL        │
│  - TypeScript      │  - PWA       │  - WebSocket           │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      EDGE LAYER (Vercel)                    │
├─────────────────────────────────────────────────────────────┤
│  - API Routes (serverless)                                  │
│  - Edge Functions (geo-distributed)                         │
│  - Static Asset CDN                                         │
│  - Image Optimization                                       │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              KUBERNETES (DigitalOcean)                      │
├─────────────────────────────────────────────────────────────┤
│  Services (Docker Containers):                              │
│  - API Gateway (Node.js/Express)                           │
│  - Matching Engine (Python/FastAPI)                        │
│  - Real-time Service (Socket.io/Redis)                     │
│  - Media Service (upload/transcode)                        │
│  - AI Service (GPT-4/embeddings)                           │
│  - Validation Service (GitHub/LinkedIn)                    │
│  - Notification Service (push/email/SMS)                   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (DigitalOcean Managed)                         │
│  - User profiles, jobs, companies                          │
│  - Transactional data, billing                             │
│  - ACID guarantees                                         │
│                                                             │
│  Redis (DigitalOcean Managed)                              │
│  - Real-time state, WebSocket connections                  │
│  - Session management, rate limiting                       │
│  - Hot cache (< 1ms reads)                                 │
│                                                             │
│  Neo4j / ArangoDB (Graph Database)                         │
│  - Candidate ↔ Job relationships                           │
│  - Skill networks, company graphs                          │
│  - Ultra-fast traversal matching                           │
│                                                             │
│  Qdrant / Pinecone (Vector Database)                       │
│  - Semantic embeddings (768-dim vectors)                   │
│  - Similarity search (< 10ms)                              │
│  - AI-powered matching                                     │
│                                                             │
│  S3-Compatible (DigitalOcean Spaces)                       │
│  - Images, videos, resumes (PDF)                           │
│  - CDN-backed for fast delivery                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Strategy: Hybrid Approach

### The Matching Challenge

**Problem:** Need to match candidates ↔ jobs on 20+ dimensions in real-time:
- Skills (tags, proficiency levels)
- Experience (years, roles, industries)
- Salary (range, equity, benefits)
- Location (remote, hybrid, timezone)
- Culture (pace, size, stage)
- Availability (notice period, start date)

**Solution:** Use the right database for each use case.

### Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Primary)                      │
├─────────────────────────────────────────────────────────────┤
│  - Users, companies, jobs (source of truth)                 │
│  - Transactions, billing, audit logs                        │
│  - Write-heavy operations                                   │
│  - JSONB columns for flexible attributes                    │
│                                                              │
│  Tables:                                                     │
│    users (id, email, name, validation_score, ...)          │
│    profiles (user_id, track_type, skills[], ...)           │
│    companies (id, name, size, industry, ...)               │
│    jobs (id, company_id, title, salary_min, ...)           │
│    matches (candidate_id, job_id, score, status, ...)      │
│    messages (match_id, sender_id, content, ...)            │
└─────────────────────────────────────────────────────────────┘
                            ▼ (sync via change streams)
┌─────────────────────────────────────────────────────────────┐
│               Neo4j/ArangoDB (Graph - Matching)             │
├─────────────────────────────────────────────────────────────┤
│  - Candidate nodes → [HAS_SKILL] → Skill nodes             │
│  - Job nodes → [REQUIRES_SKILL] → Skill nodes              │
│  - Company nodes → [POSTED] → Job nodes                    │
│                                                              │
│  Graph Traversal Query (< 50ms):                            │
│    MATCH (c:Candidate)-[:HAS_SKILL]->(s:Skill)             │
│          <-[:REQUIRES_SKILL]-(j:Job)                       │
│    WHERE c.id = $candidate_id                               │
│      AND j.salary_min >= c.salary_min                       │
│      AND j.location IN c.preferred_locations                │
│    RETURN j, count(s) as skill_overlap                      │
│    ORDER BY skill_overlap DESC                              │
│    LIMIT 100                                                │
│                                                              │
│  Use Case: Find top N matching jobs for a candidate        │
└─────────────────────────────────────────────────────────────┘
                            ▼ (parallel lookup)
┌─────────────────────────────────────────────────────────────┐
│            Qdrant/Pinecone (Vector - Semantic)              │
├─────────────────────────────────────────────────────────────┤
│  - Embeddings of candidate profiles (768-dim)              │
│  - Embeddings of job descriptions (768-dim)                │
│  - Embeddings of skills/technologies (semantic clusters)   │
│                                                              │
│  Vector Similarity Search (< 10ms):                         │
│    query_vector = embed(candidate.profile_text)            │
│    similar_jobs = vector_db.search(                         │
│        query_vector,                                        │
│        top_k=100,                                           │
│        filter={"salary_min": {"$gte": 180000}}             │
│    )                                                        │
│                                                              │
│  Use Case: "Find jobs semantically similar to profile"     │
│  Example: "WebRTC experience" matches "real-time video"    │
└─────────────────────────────────────────────────────────────┘
                            ▼ (combine results)
┌─────────────────────────────────────────────────────────────┐
│                  Redis (Cache & Real-time)                  │
├─────────────────────────────────────────────────────────────┤
│  - Precomputed match scores (TTL: 1 hour)                  │
│  - Daily swipe candidates (sorted sets)                    │
│  - Active user sessions (hash maps)                        │
│  - Real-time notifications (pub/sub)                       │
│  - Rate limiting counters                                  │
│                                                              │
│  Example cached structure:                                  │
│    candidate:12345:matches → Sorted Set                    │
│      job:789 → 89.5 (score)                                │
│      job:456 → 87.2                                        │
│      job:123 → 82.0                                        │
│                                                              │
│  Use Case: Instant swipe feed retrieval (< 1ms)           │
└─────────────────────────────────────────────────────────────┘
```

### Why This Hybrid Approach?

| Database | Use Case | Why | Speed |
|----------|----------|-----|-------|
| **PostgreSQL** | Source of truth, transactions | ACID, reliability, relationships | 10-50ms |
| **Graph (Neo4j)** | Multi-hop skill matching | Traversal queries, relationship-heavy | 20-100ms |
| **Vector (Qdrant)** | Semantic similarity | AI embeddings, fuzzy matching | 5-20ms |
| **Redis** | Hot cache, real-time | In-memory, < 1ms reads | < 1ms |

**Combined Matching Flow:**
1. **Graph DB** finds candidates with skill overlap (hard filters)
2. **Vector DB** finds semantic matches (soft/contextual)
3. **Scoring Engine** combines both + other factors → final score
4. **Redis** caches top 100 matches per candidate (1-hour TTL)
5. **User swipes** → instant response from Redis cache

**Result:** < 100ms match retrieval, < 1ms swipe response

---

## Matching Engine Architecture

### The Critical Component

**Goal:** Match candidates ↔ jobs with 60%+ accuracy, < 100ms response time

### Matching Algorithm (Multi-Factor Scoring)

```python
def calculate_match_score(candidate, job):
    """
    Returns: 0-100 score (60+ = show, <60 = filter out)
    """
    
    # 1. Hard Filters (binary pass/fail) - 0ms via indexed queries
    if not passes_hard_filters(candidate, job):
        return 0
    
    # Hard filters:
    # - Salary: job.salary_min >= candidate.salary_min
    # - Location: overlap(candidate.locations, job.locations)
    # - Authorization: candidate.work_auth matches job.auth_required
    # - Experience: candidate.years >= job.min_years
    
    # 2. Skill Overlap (40% weight) - 20ms via graph traversal
    skill_score = calculate_skill_overlap(candidate, job)
    # - Count matching skills (tags)
    # - Weight by proficiency level (Expert=1.0, Working=0.7, Learning=0.3)
    # - Bonus for rare skills both have
    
    # 3. Experience Match (20% weight) - 5ms via PostgreSQL
    exp_score = calculate_experience_match(candidate, job)
    # - Years of experience alignment
    # - Industry experience overlap
    # - Role/title progression fit
    
    # 4. Semantic Similarity (15% weight) - 10ms via vector search
    semantic_score = calculate_semantic_similarity(candidate, job)
    # - Embedding similarity (profile ↔ job description)
    # - Contextual skill matching (e.g., "distributed systems" ↔ "microservices")
    
    # 5. Salary Fit (10% weight) - 1ms calculation
    salary_score = calculate_salary_alignment(candidate, job)
    # - Overlap of salary ranges
    # - Total comp alignment
    
    # 6. Culture/Pace Fit (10% weight) - 5ms via embeddings
    culture_score = calculate_culture_fit(candidate, job)
    # - Company size preference
    # - Pace (startup vs enterprise)
    # - Remote/hybrid/office preference
    
    # 7. Validation Bonus (5% weight) - 1ms from cache
    validation_score = candidate.validation_score / 100
    # - Higher validation = more trustworthy
    # - 80%+ verified = +5 points bonus
    
    # Combined weighted score
    final_score = (
        skill_score * 0.40 +
        exp_score * 0.20 +
        semantic_score * 0.15 +
        salary_score * 0.10 +
        culture_score * 0.10 +
        validation_score * 0.05
    ) * 100
    
    return round(final_score, 1)
```

### Matching Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Matching Engine (FastAPI)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  POST /api/v1/matches/candidate/{id}/daily                 │
│  ├─ Check Redis cache first                                │
│  ├─ If miss, compute matches:                              │
│  │   1. Graph query → skill overlap candidates            │
│  │   2. Vector query → semantic similar jobs              │
│  │   3. Combine + score + rank                            │
│  │   4. Filter to 60%+ threshold                          │
│  │   5. Cache top 100 in Redis (1 hour TTL)              │
│  └─ Return top 10 for daily swipes                        │
│                                                              │
│  POST /api/v1/matches/job/{id}/candidates                  │
│  └─ Same logic, reversed (find candidates for job)        │
│                                                              │
│  POST /api/v1/matches/recalculate                          │
│  └─ Background job: refresh all match caches              │
│      (runs nightly at 2 AM)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Performance Targets:
- Cache hit: < 1ms (Redis)
- Cache miss: < 100ms (full computation)
- Daily feed generation: < 50ms
- Background recalculation: 1M candidates in < 30 min
```

### Data Sync Strategy

```
PostgreSQL (write) ──┬──> Change Data Capture (Debezium)
                     │
                     ├──> Neo4j (graph sync)
                     ├──> Qdrant (embedding sync)
                     └──> Redis (cache invalidation)

When user updates profile:
1. Write to PostgreSQL (source of truth)
2. CDC triggers sync to graph + vector DBs
3. Invalidate Redis cache for that user
4. Next match request recomputes and caches
```

---

## API Architecture

### Multi-Interface Approach

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Express)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  REST API (for mobile/web app):                            │
│    GET    /api/v1/candidates/me/matches/daily              │
│    POST   /api/v1/swipes (swipe action)                    │
│    GET    /api/v1/matches (mutual matches)                 │
│    POST   /api/v1/messages (send message)                  │
│                                                              │
│  GraphQL API (for complex queries):                        │
│    query {                                                  │
│      candidate(id: "123") {                                │
│        profile { skills { name, proficiency } }            │
│        matches(limit: 10) {                                │
│          job { title, company { name } }                   │
│          score                                              │
│        }                                                    │
│      }                                                      │
│    }                                                        │
│                                                              │
│  WebSocket (real-time):                                    │
│    /ws/notifications → new matches, messages               │
│    /ws/live-events → live hiring event coordination       │
│                                                              │
│  Enterprise API (for companies):                           │
│    GET    /api/enterprise/v1/jobs/{id}/candidates          │
│    POST   /api/enterprise/v1/jobs (create job)             │
│    GET    /api/enterprise/v1/analytics/hiring-funnel       │
│    POST   /api/enterprise/v1/candidates/{id}/invite        │
│    Requires: API key auth, rate limiting, usage tracking   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### API Design Principles

1. **RESTful for simple CRUD** (mobile app, web app)
2. **GraphQL for complex queries** (dashboard, analytics)
3. **WebSocket for real-time** (notifications, live events)
4. **Separate enterprise endpoints** (versioned, rate-limited)

---

## Real-Time Architecture

### Social Network-Level Responsiveness

```
┌─────────────────────────────────────────────────────────────┐
│                  Real-Time Event Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Action (swipe right) ──> API Gateway                 │
│      │                                                       │
│      ├──> Write to PostgreSQL (async)                      │
│      ├──> Publish to Redis Pub/Sub                         │
│      │       Topic: "swipes.{job_id}"                      │
│      │                                                       │
│      └──> WebSocket Server (Socket.io)                     │
│            ├──> Check if mutual match                      │
│            │    (candidate swiped job, job swiped candidate)│
│            │                                                 │
│            ├──> If match:                                  │
│            │    ├──> Create match record (PostgreSQL)      │
│            │    ├──> Emit to candidate: "match.created"   │
│            │    ├──> Emit to company: "match.created"     │
│            │    ├──> Send push notification               │
│            │    └──> Award XP (+100 points)               │
│            │                                                 │
│            └──> Real-time response to client (< 50ms)     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

WebSocket Event Types:
- match.created        → New mutual match
- message.received     → New chat message
- profile.viewed       → Someone viewed your profile
- event.starting       → Live hiring event in 10 min
- quest.completed      → Daily quest achievement
- level.up            → Leveled up
```

### Real-Time Infrastructure

```
Kubernetes Deployment:
├─ Socket.io Servers (3+ replicas)
│  └─ Redis Adapter (shared state across servers)
├─ Redis (Pub/Sub + Session Store)
├─ Sticky sessions (via ingress)
└─ Horizontal scaling (auto-scale based on connections)

Connection Flow:
1. Client connects: wss://api.hirewire.com/ws
2. Authenticate via JWT token
3. Subscribe to user-specific channels
4. Receive real-time events
5. Heartbeat every 30s (keep-alive)
```

---

## Media Handling

### Images & Video Support

```
┌─────────────────────────────────────────────────────────────┐
│                    Media Upload Flow                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Client requests upload URL                             │
│     POST /api/v1/media/upload-url                          │
│     → Returns: signed S3 URL (1-hour expiry)               │
│                                                              │
│  2. Client uploads directly to DigitalOcean Spaces         │
│     PUT https://hirewire.nyc3.digitaloceanspaces.com/...   │
│     → Bypasses backend (faster, cheaper)                   │
│                                                              │
│  3. Client confirms upload                                 │
│     POST /api/v1/media/confirm                             │
│     → Backend validates file exists                        │
│     → Triggers processing pipeline                         │
│                                                              │
│  4. Background processing (async)                          │
│     ├─ Image: Resize to thumbnails (100x100, 400x400)     │
│     ├─ Video: Transcode to web formats (H.264, VP9)       │
│     ├─ Generate preview thumbnail (first frame)           │
│     └─ Scan for inappropriate content (AI moderation)     │
│                                                              │
│  5. CDN delivery                                           │
│     https://cdn.hirewire.com/profiles/123/avatar.jpg      │
│     → Edge-cached, < 50ms global delivery                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Storage Strategy:
├─ Profile photos: 400x400 JPG (< 100KB)
├─ Video intros: 30-60 sec MP4 (< 10MB)
├─ Company logos: SVG or PNG (< 50KB)
├─ Resumes: PDF only (< 2MB)
└─ Total storage budget: 1GB/user max
```

---

## Performance Optimization

### Critical Path Optimizations

```
User opens app (cold start):
├─ 0-50ms:   Load static assets from Vercel CDN
├─ 50-100ms: Authenticate user (JWT validation)
├─ 100-150ms: Fetch daily swipe feed (Redis cache hit)
├─ 150-200ms: Establish WebSocket connection
└─ 200ms:    App ready, first card visible

Target: < 200ms to interactive

User swipes card:
├─ 0ms:      Optimistic UI update (instant feedback)
├─ 0-50ms:   API call (record swipe)
├─ 50-100ms: Check for mutual match
└─ 100ms:    Response received, next card loads

Target: < 100ms swipe response

Match notification:
├─ 0ms:      Match detected (backend)
├─ 0-10ms:   Publish to Redis Pub/Sub
├─ 10-20ms:  WebSocket emits to both users
├─ 20-30ms:  Push notification sent
└─ 30ms:     Both users see "It's a Match!"

Target: < 30ms notification delivery
```

### Caching Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                     Cache Layers                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  L1 - Browser Cache (Service Worker)                       │
│      Static assets: 1 week                                 │
│      API responses: 5 minutes                              │
│                                                              │
│  L2 - Vercel Edge Cache                                    │
│      /api/public/* : 1 hour                                │
│      Images: 1 week                                        │
│                                                              │
│  L3 - Redis (Application Cache)                            │
│      Match scores: 1 hour                                  │
│      User sessions: 24 hours                               │
│      Daily swipe feeds: 1 hour                             │
│                                                              │
│  L4 - PostgreSQL                                           │
│      Source of truth (no cache)                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Cache Invalidation Rules:
- User updates profile → Invalidate L3 (Redis)
- Job updated → Invalidate matches for that job
- Daily at 2 AM → Recalculate all match caches
- Manual: Admin can force cache refresh
```

---

## Deployment Architecture

### Kubernetes on DigitalOcean

```
┌─────────────────────────────────────────────────────────────┐
│              DigitalOcean Kubernetes Cluster                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Production Cluster (3 nodes, 8GB RAM each)                │
│  ├─ Namespace: production                                  │
│  ├─ Namespace: staging                                     │
│  └─ Namespace: monitoring                                  │
│                                                              │
│  Services:                                                  │
│  ├─ api-gateway (3 replicas)                              │
│  │   Image: hirewire/api-gateway:v1.2.3                   │
│  │   Resources: 1 CPU, 2GB RAM                            │
│  │   Auto-scale: 3-10 replicas (CPU > 70%)               │
│  │                                                          │
│  ├─ matching-engine (2 replicas)                          │
│  │   Image: hirewire/matching-engine:v1.2.3               │
│  │   Resources: 2 CPU, 4GB RAM                            │
│  │   Auto-scale: 2-5 replicas (queue depth)              │
│  │                                                          │
│  ├─ realtime-service (3 replicas)                         │
│  │   Image: hirewire/realtime:v1.2.3                      │
│  │   Resources: 1 CPU, 2GB RAM                            │
│  │   Sticky sessions enabled                              │
│  │                                                          │
│  ├─ media-service (2 replicas)                            │
│  │   Image: hirewire/media:v1.2.3                         │
│  │   Resources: 2 CPU, 4GB RAM (video encoding)          │
│  │                                                          │
│  ├─ ai-service (1 replica)                                │
│  │   Image: hirewire/ai:v1.2.3                            │
│  │   Resources: 2 CPU, 4GB RAM                            │
│  │   GPU: Optional (for local embeddings)                │
│  │                                                          │
│  └─ worker-service (2 replicas)                           │
│      Image: hirewire/worker:v1.2.3                         │
│      Resources: 1 CPU, 2GB RAM                             │
│      Job: Background tasks (email, analytics)             │
│                                                              │
│  Ingress (NGINX):                                          │
│  ├─ api.hirewire.com → api-gateway                        │
│  ├─ ws.hirewire.com → realtime-service                    │
│  └─ SSL/TLS termination (Let's Encrypt)                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Managed Services (DigitalOcean):
├─ PostgreSQL (Primary DB)
│  └─ Plan: 4GB RAM, 2 vCPU, 80GB SSD
├─ Redis (Cache + Pub/Sub)
│  └─ Plan: 4GB RAM, 2 replicas (HA)
└─ Spaces (S3-compatible storage)
   └─ 250GB storage, CDN enabled

External Services:
├─ Neo4j (Aura Free → Aura Pro)
├─ Qdrant Cloud (Free → Starter)
└─ OpenAI API (GPT-4 + embeddings)
```

### CI/CD Pipeline

```
GitHub Actions Workflow:

1. Push to main branch
   ├─ Run tests (Jest, pytest)
   ├─ Lint code (ESLint, Black)
   ├─ Build Docker images
   ├─ Tag: hirewire/api-gateway:v1.2.3
   └─ Push to DigitalOcean Container Registry

2. Deploy to staging
   ├─ Apply Kubernetes manifests (staging namespace)
   ├─ Run smoke tests
   └─ Wait for approval

3. Deploy to production (manual approval)
   ├─ Apply Kubernetes manifests (production namespace)
   ├─ Rolling update (zero downtime)
   ├─ Health check validation
   └─ Rollback on failure

Deployment Strategy:
- Rolling updates (max surge: 1, max unavailable: 0)
- Health checks (liveness + readiness probes)
- Auto-rollback if health checks fail
- Blue/green for major version changes
```

---

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Logs: Loki + Grafana                                      │
│  ├─ Centralized log aggregation                            │
│  ├─ Query: {service="api-gateway", level="error"}         │
│  └─ Retention: 7 days                                      │
│                                                              │
│  Metrics: Prometheus + Grafana                             │
│  ├─ API latency (p50, p95, p99)                           │
│  ├─ Match calculation time                                 │
│  ├─ WebSocket connections                                  │
│  ├─ Database query time                                    │
│  └─ Error rate (4xx, 5xx)                                 │
│                                                              │
│  Tracing: Jaeger (distributed tracing)                     │
│  └─ Track requests across services                        │
│                                                              │
│  Alerts: Prometheus Alertmanager                           │
│  ├─ API error rate > 1% → Slack                           │
│  ├─ Match latency > 200ms → PagerDuty                     │
│  ├─ Database connections > 90% → Email                    │
│  └─ Disk usage > 85% → Slack                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Security & Compliance

```
Authentication:
├─ JWT tokens (access: 15min, refresh: 7 days)
├─ OAuth 2.0 (Google, GitHub, LinkedIn)
├─ MFA optional for candidates, required for companies
└─ API keys for enterprise (scoped permissions)

Authorization:
├─ RBAC (candidate, company, recruiter, admin)
├─ Row-level security (PostgreSQL RLS)
├─ Rate limiting (per user, per IP)
└─ API key quotas (enterprise tiers)

Data Protection:
├─ Encryption at rest (AES-256)
├─ Encryption in transit (TLS 1.3)
├─ PII pseudonymization (GDPR)
├─ Right to deletion (GDPR, CCPA)
└─ Data export (JSON format)

Compliance:
├─ EEOC (no discriminatory matching)
├─ GDPR (EU user data protection)
├─ CCPA (California privacy)
├─ SOC 2 Type II (for enterprise)
└─ Regular security audits
```

---

## Cost Estimation (MVP Phase)

```
Monthly Infrastructure Costs:

DigitalOcean:
├─ Kubernetes cluster (3 nodes × $48)     $144
├─ PostgreSQL (4GB managed)                $60
├─ Redis (4GB managed)                     $40
├─ Spaces (250GB + CDN)                    $10
└─ Load balancer                           $12
                                          ────
Subtotal:                                 $266

Vercel:
├─ Pro plan (serverless, edge)             $20
└─ Bandwidth (100GB)                       $10
                                          ────
Subtotal:                                  $30

External Services:
├─ Neo4j Aura Free                          $0
├─ Qdrant Cloud Free                        $0
├─ OpenAI API (10K requests/day)          $100
├─ Sendgrid (email)                        $15
└─ Twilio (SMS)                            $10
                                          ────
Subtotal:                                 $125

TOTAL MONTHLY (MVP):                      $421
TOTAL MONTHLY (Production @ 10K users):  ~$1,200
TOTAL MONTHLY (Scale @ 100K users):     ~$5,000

Revenue to cover costs (MVP):
- 15 premium users @ $29/mo = $435
- OR 3 company matches @ $150 = $450
```

---

## Scalability Plan

```
Current (MVP): 1K users, 10K matches/day
├─ Single Kubernetes cluster (3 nodes)
├─ PostgreSQL (4GB)
├─ Redis (4GB)
└─ Cost: ~$400/month

Phase 1: 10K users, 100K matches/day
├─ Scale to 5 nodes
├─ PostgreSQL read replicas (2)
├─ Redis cluster (6 nodes)
├─ Neo4j Aura Pro ($100/mo)
└─ Cost: ~$1,200/month

Phase 2: 100K users, 1M matches/day
├─ Multi-region deployment (US-East, US-West)
├─ PostgreSQL sharding (by user_id)
├─ Redis cluster per region
├─ Vector DB scaling (Qdrant Pro)
├─ CDN expansion (multi-region)
└─ Cost: ~$5,000/month

Phase 3: 1M users, 10M matches/day
├─ Global deployment (US, EU, APAC)
├─ Database federation (per region)
├─ Dedicated GPU nodes (embeddings)
├─ Kafka for event streaming
├─ Enterprise support contracts
└─ Cost: ~$25,000/month
```

---

## Next Steps

### Immediate Actions (Week 1)

1. **Set up infrastructure:**
   - [ ] Create DigitalOcean Kubernetes cluster
   - [ ] Set up managed PostgreSQL + Redis
   - [ ] Configure DigitalOcean Spaces (S3)
   - [ ] Set up Vercel project (frontend)

2. **Initialize repositories:**
   - [ ] Create monorepo structure (Turborepo/Nx)
   - [ ] Set up Docker configurations
   - [ ] Configure CI/CD (GitHub Actions)

3. **Database design:**
   - [ ] Design PostgreSQL schema
   - [ ] Set up Neo4j graph (initial structure)
   - [ ] Configure Qdrant collections
   - [ ] Create migration scripts

4. **MVP development priorities:**
   - [ ] Authentication service
   - [ ] Profile creation (multi-track)
   - [ ] Basic matching algorithm
   - [ ] Swipe interface (React)

---

## Critical Decisions Made

✅ **Database:** Hybrid approach (PostgreSQL + Neo4j + Qdrant + Redis)  
✅ **Infrastructure:** Kubernetes on DigitalOcean  
✅ **Frontend:** Vercel (Next.js/React)  
✅ **API:** REST + GraphQL + WebSocket  
✅ **Real-time:** Socket.io with Redis adapter  
✅ **Media:** DigitalOcean Spaces with CDN  
✅ **Matching:** < 100ms target via caching + graph/vector hybrid  

---

## Open Questions / To Decide

❓ **Neo4j vs ArangoDB?** (Both support graph, ArangoDB also has document/KV)  
❓ **Qdrant vs Pinecone vs Weaviate?** (Vector database choice)  
❓ **Monorepo vs Polyrepo?** (Code organization)  
❓ **GraphQL framework?** (Apollo vs Mercurius vs Hasura)  
❓ **Video transcoding?** (Self-hosted FFmpeg vs cloud service)  

---

*This architecture is designed to scale from MVP (1K users) to production (1M+ users) while maintaining sub-100ms matching performance and social network-level real-time responsiveness.*
