# HireWire API Development Guide

## Quick Start

```bash
# 1. Start all services (databases + API + resume parser)
./start-dev.sh    # Linux/Mac
start-dev.bat     # Windows

# 2. Install dependencies
cd services/api
npm install

# 3. Start API in dev mode (hot reload)
npm run dev
```

API will be running at http://localhost:4000

## Available Endpoints

### Authentication
- `POST /api/auth/github` - GitHub OAuth login
- `POST /api/auth/google` - Google OAuth login  
- `POST /api/auth/magic-link/request` - Request magic link (companies)
- `GET /api/auth/magic-link/verify/:token` - Verify magic link
- `POST /api/auth/signup` - Email/password signup
- `POST /api/auth/login` - Email/password login

### Onboarding (Candidates)
- `POST /api/onboarding/candidate/upload-resume` - Upload & parse resume
- `POST /api/onboarding/candidate/linkedin` - Import LinkedIn profile
- `POST /api/onboarding/candidate/manual` - Quick manual entry
- `POST /api/onboarding/candidate/complete` - Finalize onboarding

### Onboarding (Companies)
- `POST /api/onboarding/company/parse-job` - Parse job description
- `POST /api/onboarding/company/publish-job/:jobId` - Publish job

### Profile
- `GET /api/profile/me` - Get current user's profile
- `PUT /api/profile/candidate` - Update candidate profile

### Matching
- `GET /api/matching/daily` - Get daily job matches (candidates)

### Swiping
- `POST /api/swipe` - Swipe on job/candidate
- `GET /api/swipe/matches` - Get matches

### Messaging
- `POST /api/messages` - Send message
- `GET /api/messages/match/:matchId` - Get match messages

## Testing with cURL

### 1. GitHub Login (Candidate)
```bash
# After OAuth flow, you'll get a code
curl -X POST http://localhost:4000/api/auth/github \
  -H "Content-Type: application/json" \
  -d '{"code": "github-oauth-code"}'

# Response includes JWT token
```

### 2. Upload Resume
```bash
curl -X POST http://localhost:4000/api/onboarding/candidate/upload-resume \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "resume=@/path/to/resume.pdf"
```

### 3. Get Profile
```bash
curl http://localhost:4000/api/profile/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Get Matches
```bash
curl http://localhost:4000/api/matching/daily \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Swipe Right on Job
```bash
curl -X POST http://localhost:4000/api/swipe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_id": 1, "direction": "right"}'
```

## Resume Parser Service

The resume parser runs separately on port 8000:

```bash
# Test resume parsing directly
curl -X POST http://localhost:8000/parse-resume \
  -F "file=@resume.pdf"

# Test job description parsing
curl -X POST http://localhost:8000/extract-job-requirements \
  -H "Content-Type: application/json" \
  -d '{"description": "We are looking for a Senior Full Stack Engineer..."}'
```

## Database Access

```bash
# PostgreSQL
docker-compose exec postgres psql -U hirewire -d hirewire_dev

# Neo4j
# Open browser: http://localhost:7474
# Username: neo4j, Password: hirewire_neo4j_password

# Redis
docker-compose exec redis redis-cli -a hirewire_redis_password

# Qdrant
# Open browser: http://localhost:6333/dashboard
```

## Common Tasks

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f resume-parser
```

### Restart Service
```bash
docker-compose restart api
```

### Rebuild After Code Changes
```bash
docker-compose up -d --build api
```

### Reset Database
```bash
docker-compose down -v
./start-dev.sh
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Required
OPENAI_API_KEY=sk-...

# Optional (for social login)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Optional (for email)
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...
```

## Project Structure

```
services/
├── api/                    # Node.js API Gateway
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, validation
│   │   ├── services/      # Email, etc.
│   │   └── db/            # Database connections
│   ├── Dockerfile
│   └── package.json
│
└── resume-parser/         # Python AI Service
    ├── main.py           # FastAPI app
    ├── requirements.txt
    └── Dockerfile
```

## Next Steps

1. Build the frontend (Next.js)
2. Implement advanced matching algorithm
3. Add WebSocket for real-time notifications
4. Build swipe UI
5. Add unit tests
