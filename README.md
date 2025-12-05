# HireWire

**"Get hired on the wire" - Live hiring, real connections**

A gamified job matching platform that transforms the broken job search experience into an engaging, effective process for both candidates and companies.

---

## 🚀 Quick Start

**Get the full development environment running in 2 minutes:**

```bash
# Windows
start-dev.bat

# Mac/Linux
chmod +x start-dev.sh && ./start-dev.sh
```

This starts:
- **4 databases:** PostgreSQL, Redis, Neo4j, Qdrant
- **Resume Parser:** AI-powered extraction (Python/FastAPI)
- **API Gateway:** Main backend (Node.js/Express)

**Then access:**
- API: http://localhost:4000
- Resume Parser: http://localhost:8000
- Neo4j Browser: http://localhost:7474

**See:** [API_DEVELOPMENT.md](API_DEVELOPMENT.md) | [QUICKSTART.md](QUICKSTART.md) | [DEV_SETUP.md](DEV_SETUP.md)

---

## The Problem

**For Candidates:**
- Send 100+ applications into a black hole
- 2-3% response rate with no feedback
- Job hunting feels depressing

**For Companies:**
- Receive 500+ applications, 490 are spam
- Spend hours screening unqualified candidates
- Hiring takes months

---

## The Solution

**HireWire uses:**
1. **AI-Powered Pre-Matching** - Only show 60%+ skill overlap matches (< 100ms)
2. **Mutual Interest (Swipe Mechanics)** - Both sides swipe right to match
3. **Gamification** - Make job hunting fun with XP, achievements, live events

---

## Key Features

- **Multi-Track Profiles** - One profile, multiple specializations
- **Experience Validation** - GitHub integration, 0-100% verification score
- **Swipe Mode** - Tinder-style job matching (8-10 pre-matched jobs/day)
- **Live Match Events** - Thursday 6PM speed dating for jobs
- **AI Career Coach** - GPT-4 powered recommendations
- **Real-Time Notifications** - "🔥 Stripe just viewed your profile!"

---

## Architecture Highlights

**Hybrid Database Strategy for Ultra-Fast Matching:**
- **PostgreSQL** - Source of truth (users, jobs, transactions)
- **Neo4j** - Graph traversal (skill relationships, < 50ms)
- **Qdrant** - Vector search (semantic matching, < 20ms)
- **Redis** - Hot cache (< 1ms swipe responses)

**Performance Targets:**
- Match calculation: < 100ms (cold) / < 1ms (cached)
- Real-time notifications: < 30ms
- App cold start: < 200ms

**See:** [ARCHITECTURE.md](ARCHITECTURE.md) | [DATABASE_PRIMER.md](DATABASE_PRIMER.md)

---

## Success Metrics Targets

- **Match rate:** 20%+ (vs 2-3% on LinkedIn)
- **Response rate:** 50%+ (vs 5-10% typical)
- **Time to offer:** <4 weeks (vs 8-12 weeks)

---

## Project Status

**Current Phase:** API Services & Backend Complete  
**Started:** December 5, 2025

✅ Architecture designed (4-database hybrid)  
✅ Database schemas created (PostgreSQL, Neo4j, Qdrant, Redis)  
✅ Local dev environment ready (Docker Compose)  
✅ Sample data & migrations ready  
✅ Resume parser service (AI-powered, Python/FastAPI)  
✅ API Gateway (auth, onboarding, matching, swipe, messages)  
✅ Complete onboarding flow (resume upload, GitHub OAuth, magic links)  
🔄 Next: Build frontend (Next.js) & advanced matching engine

See [project.log.md](project.log.md) for detailed activity log.

---

## Documentation

### Getting Started
- **[QUICKSTART.md](QUICKSTART.md)** - One-page quick reference
- **[DEV_SETUP.md](DEV_SETUP.md)** - Detailed setup guide

### Architecture & Design
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete technical architecture
- **[DATABASE_PRIMER.md](DATABASE_PRIMER.md)** - Learn graph & vector databases
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Complete schema reference

### Product & Vision
- **[PROJECT_VISION.md](PROJECT_VISION.md)** - Complete platform vision
- **[DESIGN_CONCEPTS.md](DESIGN_CONCEPTS.md)** - UI/UX specifications
- **[MASTER_GOALS.md](MASTER_GOALS.md)** - Original goals
- **[project.log.md](project.log.md)** - Activity log

---

## Tech Stack

**Frontend:**  
React, TypeScript, Tailwind CSS, Next.js, Framer Motion

**Backend:**  
Node.js (Express), Python (FastAPI), Socket.io

**Databases:**  
PostgreSQL, Neo4j (graph), Qdrant (vector), Redis

**AI/ML:**  
OpenAI GPT-4, text-embedding-3-small

**Infrastructure:**  
Kubernetes (DigitalOcean), Vercel, Docker

---

## Development

```bash
# Start all databases
docker-compose up -d

# View logs
docker-compose logs -f

# Stop databases
docker-compose down

# Reset everything
docker-compose down -v
```

**Access Points:**
- PostgreSQL: `localhost:5432`
- Neo4j Browser: http://localhost:7474
- Qdrant Dashboard: http://localhost:6333
- Redis: `localhost:6379`

---

## Contact

Created by Richard O'Brien  
Email: richcobrien@hotmail.com  
LinkedIn: linkedin.com/in/richcobrien  
Phone: 720-656-9650  

Project started: December 5, 2025

---

**HireWire: Where talent connects instantly** ⚡

---

## 📁 Project Documents

1. **[PROJECT_VISION.md](PROJECT_VISION.md)** - Complete platform vision
   - Problem statement
   - Solution overview
   - Core features (swipe, match, gamification)
   - User flows (candidate & company)
   - Technical architecture
   - MVP development plan
   - Business model & metrics

2. **[DESIGN_CONCEPTS.md](DESIGN_CONCEPTS.md)** - UI/UX design specifications
   - Swipe interface mockups
   - Gamification dashboard
   - Live event screens
   - AI coach chat interface
   - Design system (colors, typography, animations)
   - Mobile vs desktop considerations

3. **[MASTER_GOALS.md](MASTER_GOALS.md)** - Original goals that led to HireWire
   - Resume/cover letter management validation
   - Job source filtering requirements
   - Resume-to-job matching logic
   - Automated follow-up strategy
   - How HireWire solves these goals at scale

---

## 🎯 Quick Summary

**What is HireWire?**
A job matching platform that combines:
- 🎮 **Gamification** (swipe, match, level up)
- 🤖 **AI matching** (60%+ skill overlap required)
- ⚡ **Live events** (speed dating for jobs)
- ✅ **Validation** (verified experience scores)
- 💬 **Real connection** (mutual interest = instant chat)

**Why it's different:**
- Not another job board (quality layer between candidates & companies)
- Makes job hunting fun (gamification, social features)
- Automatic matching (AI pre-filters, mutual interest required)
- Validates experience (no keyword spam, verified skills)
- Communication happens naturally (match = chat unlocked)

**Market opportunity:**
- Candidates: 2-3% response rate → 20%+ on HireWire
- Companies: 10-20% qualified applicants → 80%+ on HireWire
- Time to hire: 8-12 weeks → 3 weeks on HireWire
- Cost: $40K+ recruiter fees → $200 per match on HireWire

---

## 🚀 Next Steps

### To Move This to Its Own Project:

1. **Create new repository:**
   ```bash
   mkdir HireWire
   cd HireWire
   git init
   ```

2. **Copy files:**
   ```bash
   cp -r /path/to/Resume/HireWire/* .
   ```

3. **Initialize project:**
   ```bash
   npm init -y
   # or
   git clone https://github.com/yourusername/hirewire.git
   ```

4. **Start building:**
   - Review PROJECT_VISION.md for MVP plan
   - Follow DESIGN_CONCEPTS.md for UI/UX
   - Reference MASTER_GOALS.md for core requirements

---

## 📊 MVP Timeline

**Phase 1 (Weeks 1-4):** Core platform (auth, profiles, swipe, match)
**Phase 2 (Weeks 5-8):** Gamification & validation
**Phase 3 (Weeks 9-12):** Live events & AI coach
**Phase 4 (Weeks 13-16):** Beta launch with 100 candidates + 10 companies

**Target:** Public launch in 4-6 months

---

## 💡 Why You Should Build This

**You're the perfect founder:**
- ✅ Living the pain point (job searching now)
- ✅ 20 years software + infrastructure experience
- ✅ Built AI/ML automation already
- ✅ Full-stack + DevOps + Cloud expertise
- ✅ Network of engineers (initial users)
- ✅ Already built core automation (semi-auto bot)

**Market timing is perfect:**
- ✅ Remote work normalized (larger talent pool)
- ✅ AI wave makes validation critical
- ✅ ATS fatigue is real (both sides hate it)
- ✅ Quality over volume trend
- ✅ Network effects potential

**This could be bigger than getting hired - this could be the company you found.**

---

## 📞 Contact

Richard O'Brien
- Email: richcobrien@hotmail.com
- LinkedIn: linkedin.com/in/richcobrien
- Phone: 720-656-9650

---

**HireWire: Where talent connects instantly** ⚡
