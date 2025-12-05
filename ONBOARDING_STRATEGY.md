# HireWire Onboarding Strategy

**Goal:** Get users from signup to their first match in under 2 minutes.

---

## The Onboarding Problem

**Traditional job platforms:**
- 30+ form fields to fill manually
- Upload resume → sits unused
- Takes 20-30 minutes to create profile
- High abandonment rate (60-70%)

**HireWire approach:**
- Upload resume OR paste LinkedIn URL → AI extracts everything
- Review & edit in 30 seconds
- Start swiping immediately
- Enrich profile over time (gamified)

---

## Candidate Onboarding Flow

### Step 1: Quick Auth (30 seconds)
```
┌─────────────────────────────────┐
│  Welcome to HireWire!           │
│                                  │
│  [Continue with GitHub]          │  ← Preferred (auto-validates)
│  [Continue with LinkedIn]        │  ← Auto-import profile
│  [Continue with Google]          │
│  [Email + Password]              │
│                                  │
│  Why GitHub? Instant validation  │
│  score + portfolio               │
└─────────────────────────────────┘
```

**Why GitHub OAuth first?**
- Instant validation score (repos, commits, stars)
- Auto-extracts skills from code
- Verifies experience claims
- Builds trust with companies

### Step 2: Smart Profile Creation (60 seconds)

**Option A: Upload Resume (Recommended)**
```
┌─────────────────────────────────┐
│  Let's build your profile       │
│                                  │
│  [📄 Upload Resume (PDF/DOCX)]  │
│                                  │
│  We'll extract:                  │
│  ✓ Work history                  │
│  ✓ Skills & technologies         │
│  ✓ Education                     │
│  ✓ Projects                      │
│                                  │
│  Takes 10 seconds...             │
└─────────────────────────────────┘
```

**Option B: LinkedIn Import**
```
┌─────────────────────────────────┐
│  Paste your LinkedIn URL:       │
│  ┌─────────────────────────────┐│
│  │ linkedin.com/in/yourname    ││
│  └─────────────────────────────┘│
│                                  │
│  [Import Profile] 🚀             │
│                                  │
│  We'll fetch your:               │
│  • Current role & company        │
│  • Skills & endorsements         │
│  • Work history                  │
└─────────────────────────────────┘
```

**Option C: Quick Manual Entry (Fallback)**
```
┌─────────────────────────────────┐
│  Job Title: _______________     │
│  Years Experience: [5 ▼]        │
│  Top 5 Skills: _____________    │
│  Target Salary: [$160k ▼]      │
│                                  │
│  [Start Matching →]              │
│                                  │
│  (Add more details later         │
│   to improve matches)            │
└─────────────────────────────────┘
```

### Step 3: AI-Powered Review & Edit (30 seconds)
```
┌─────────────────────────────────────────────────┐
│  Review your profile (AI extracted)             │
│                                                  │
│  Rich O'Brien                                   │
│  Senior Full Stack Engineer • 20 years exp      │
│  [✓ Looks good] [✏️ Edit]                       │
│                                                  │
│  Top Skills (from resume):                       │
│  [React] [TypeScript] [Node.js] [PostgreSQL]    │
│  [Docker] [Kubernetes] [GraphQL]                │
│  [+ Add skill]                                   │
│                                                  │
│  Work History:                                   │
│  ┌──────────────────────────────────────┐       │
│  │ Senior Eng @ TrafficJamz (3 years)   │       │
│  │ Built real-time GPS platform         │       │
│  │ [✓ Verified via GitHub]              │       │
│  └──────────────────────────────────────┘       │
│                                                  │
│  Target Salary: $160k - $200k                   │
│  [✏️ Adjust]                                     │
│                                                  │
│  Validation Score: 87% 🔥                       │
│  (GitHub activity confirms experience)          │
│                                                  │
│  [Looks Good - Start Matching! →]               │
└─────────────────────────────────────────────────┘
```

---

## Company Onboarding Flow

### Step 1: Company Auth (30 seconds)
```
┌─────────────────────────────────┐
│  Post your first job            │
│                                  │
│  Company Email:                  │
│  ┌─────────────────────────────┐│
│  │ you@company.com             ││
│  └─────────────────────────────┘│
│                                  │
│  [Send Magic Link]               │
│                                  │
│  (We'll verify your domain)      │
└─────────────────────────────────┘
```

### Step 2: Smart Job Posting (60 seconds)

**Option A: Paste Job Description**
```
┌─────────────────────────────────────────────┐
│  Paste your job description                 │
│  ┌─────────────────────────────────────────┐│
│  │ We're looking for a Senior Full Stack  ││
│  │ Engineer to build...                    ││
│  │                                         ││
│  │ Requirements:                           ││
│  │ • 5+ years React/TypeScript             ││
│  │ • Node.js backend experience            ││
│  │ • Docker/Kubernetes                     ││
│  └─────────────────────────────────────────┘│
│                                              │
│  [🤖 Auto-Extract Requirements]              │
└─────────────────────────────────────────────┘
```

**AI Extraction Result:**
```
┌─────────────────────────────────────────────┐
│  Extracted Requirements (Review & Edit)     │
│                                              │
│  Job Title: Senior Full Stack Engineer      │
│  [✏️ Edit]                                   │
│                                              │
│  Required Skills:                            │
│  [React ✓] [TypeScript ✓] [Node.js ✓]      │
│  [Docker ✓] [Kubernetes ✓]                  │
│  [+ Add more]                                │
│                                              │
│  Experience Level: 5+ years                  │
│  Salary Range: $140k - $180k                │
│  Team Size: 12 engineers                    │
│  Remote: Hybrid (SF Bay Area)               │
│                                              │
│  Found 47 matching candidates! 🎯            │
│                                              │
│  [Publish Job & Start Reviewing →]          │
└─────────────────────────────────────────────┘
```

**Option B: Job Template (Quick Start)**
```
┌─────────────────────────────────┐
│  Choose a template:             │
│                                  │
│  • Full Stack Engineer           │
│  • Frontend Engineer             │
│  • Backend Engineer              │
│  • DevOps Engineer              │
│  • Engineering Manager           │
│  • Data Scientist                │
│                                  │
│  [Customize Template →]          │
└─────────────────────────────────┘
```

---

## Technical Implementation

### Resume Parser Service (Python + AI)

```python
# services/resume-parser/parser.py

from fastapi import FastAPI, UploadFile
from openai import OpenAI
import PyPDF2
import docx
import re

app = FastAPI()
client = OpenAI()

EXTRACTION_PROMPT = """
Extract structured data from this resume. Return JSON:

{
  "name": "string",
  "email": "string",
  "phone": "string",
  "title": "current job title",
  "years_experience": number,
  "summary": "brief professional summary",
  "skills": ["array", "of", "skills"],
  "work_history": [
    {
      "company": "string",
      "title": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or present",
      "description": "what they did",
      "technologies": ["tech", "stack"]
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "field": "string",
      "graduation_year": number
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["array"],
      "url": "github or live url if mentioned"
    }
  ],
  "target_salary": number or null,
  "preferred_locations": ["array"] or null
}

Resume text:
{resume_text}
"""

@app.post("/parse-resume")
async def parse_resume(file: UploadFile):
    """Parse resume PDF/DOCX and extract structured data"""
    
    # Extract text
    if file.filename.endswith('.pdf'):
        text = extract_pdf_text(file)
    elif file.filename.endswith('.docx'):
        text = extract_docx_text(file)
    else:
        return {"error": "Unsupported file type"}
    
    # Use GPT-4 to extract structured data
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "You are a resume parser. Extract data accurately and return valid JSON."},
            {"role": "user", "content": EXTRACTION_PROMPT.format(resume_text=text)}
        ],
        response_format={"type": "json_object"}
    )
    
    profile_data = json.loads(response.choices[0].message.content)
    
    # Enrich with GitHub validation if possible
    if profile_data.get('email'):
        github_data = await fetch_github_profile(profile_data['email'])
        if github_data:
            profile_data['validation_score'] = calculate_validation(github_data)
            profile_data['github_repos'] = github_data['public_repos']
            profile_data['github_stars'] = sum(r['stargazers_count'] for r in github_data['repos'])
    
    return profile_data


@app.post("/parse-linkedin")
async def parse_linkedin(url: str):
    """Scrape LinkedIn profile (use official API if available)"""
    # Note: LinkedIn scraping violates ToS - use official API or manual import
    # For MVP, could use RapidAPI LinkedIn scraper or manual paste
    pass


@app.post("/extract-job-requirements")
async def extract_job_requirements(description: str):
    """Extract structured requirements from job description"""
    
    EXTRACTION_PROMPT = """
    Extract structured job requirements. Return JSON:
    
    {
      "title": "job title",
      "company": "company name if mentioned",
      "required_skills": ["must-have", "skills"],
      "preferred_skills": ["nice-to-have", "skills"],
      "min_experience": number in years,
      "max_experience": number or null,
      "salary_min": number or null,
      "salary_max": number or null,
      "remote_type": "remote" | "hybrid" | "onsite",
      "location": "city, state",
      "team_size": number or null,
      "responsibilities": ["key", "responsibilities"],
      "benefits": ["benefits", "mentioned"]
    }
    
    Job description:
    {description}
    """
    
    response = client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[
            {"role": "system", "content": "You are a job description parser. Extract requirements accurately."},
            {"role": "user", "content": EXTRACTION_PROMPT.format(description=description)}
        ],
        response_format={"type": "json_object"}
    )
    
    return json.loads(response.choices[0].message.content)


def extract_pdf_text(file: UploadFile) -> str:
    """Extract text from PDF"""
    reader = PyPDF2.PdfReader(file.file)
    text = ""
    for page in reader.pages:
        text += page.extract_text()
    return text


def extract_docx_text(file: UploadFile) -> str:
    """Extract text from DOCX"""
    doc = docx.Document(file.file)
    text = ""
    for paragraph in doc.paragraphs:
        text += paragraph.text + "\n"
    return text


async def fetch_github_profile(email: str):
    """Look up GitHub profile by email"""
    # Use GitHub API to search users by email
    # Return repo count, commit activity, stars, etc.
    pass


def calculate_validation(github_data: dict) -> int:
    """Calculate validation score 0-100 based on GitHub activity"""
    score = 0
    
    # Public repos (max 20 points)
    repos = min(github_data.get('public_repos', 0), 20)
    score += repos
    
    # Total stars (max 30 points)
    stars = min(github_data.get('total_stars', 0) / 10, 30)
    score += stars
    
    # Commit activity (max 30 points)
    commits = min(github_data.get('total_commits', 0) / 100, 30)
    score += commits
    
    # Account age (max 10 points)
    age_years = github_data.get('account_age_years', 0)
    score += min(age_years * 2, 10)
    
    # Followers (max 10 points)
    followers = min(github_data.get('followers', 0) / 10, 10)
    score += followers
    
    return min(int(score), 100)
```

### Auth API (Node.js)

```typescript
// services/api/src/routes/auth.ts

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { Octokit } from '@octokit/rest';

const router = express.Router();

// GitHub OAuth
router.post('/auth/github', async (req, res) => {
  const { code } = req.body;
  
  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code
    })
  });
  
  const { access_token } = await tokenResponse.json();
  
  // Get user data
  const octokit = new Octokit({ auth: access_token });
  const { data: user } = await octokit.users.getAuthenticated();
  const { data: emails } = await octokit.users.listEmailsForAuthenticated();
  
  // Create or update user in DB
  const dbUser = await createOrUpdateUser({
    github_id: user.id,
    github_username: user.login,
    name: user.name,
    email: emails.find(e => e.primary)?.email,
    avatar_url: user.avatar_url,
    github_access_token: access_token
  });
  
  // Start background validation score calculation
  await calculateGitHubValidation(dbUser.id, access_token);
  
  // Return JWT
  const token = jwt.sign({ userId: dbUser.id }, process.env.JWT_SECRET);
  res.json({ token, user: dbUser });
});

// Magic link auth (for companies)
router.post('/auth/magic-link', async (req, res) => {
  const { email } = req.body;
  
  // Verify company domain
  const domain = email.split('@')[1];
  const isCompanyEmail = !['gmail.com', 'yahoo.com', 'hotmail.com'].includes(domain);
  
  if (!isCompanyEmail) {
    return res.status(400).json({ error: 'Please use your company email' });
  }
  
  // Generate magic link token
  const token = jwt.sign({ email, type: 'magic-link' }, process.env.JWT_SECRET, { expiresIn: '15m' });
  
  // Send email
  await sendMagicLinkEmail(email, token);
  
  res.json({ message: 'Check your email for the login link' });
});

router.get('/auth/verify-magic-link/:token', async (req, res) => {
  const { token } = req.params;
  
  try {
    const { email } = jwt.verify(token, process.env.JWT_SECRET);
    
    // Create or get user
    const user = await createOrUpdateCompanyUser({ email });
    
    // Return session token
    const sessionToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token: sessionToken, user });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired link' });
  }
});
```

### Onboarding API

```typescript
// services/api/src/routes/onboarding.ts

router.post('/onboarding/upload-resume', upload.single('resume'), async (req, res) => {
  const { file } = req;
  const userId = req.user.id;
  
  // Send to resume parser service
  const formData = new FormData();
  formData.append('file', file.buffer, file.originalname);
  
  const response = await fetch('http://resume-parser:8000/parse-resume', {
    method: 'POST',
    body: formData
  });
  
  const profileData = await response.json();
  
  // Save to database
  await updateCandidateProfile(userId, profileData);
  
  // Extract skills and add to Neo4j
  await indexSkills(userId, profileData.skills);
  
  // Generate embeddings for semantic search
  await generateProfileEmbedding(userId, profileData);
  
  res.json({ 
    profile: profileData,
    next_step: 'review'
  });
});

router.post('/onboarding/company/paste-job', async (req, res) => {
  const { description } = req.body;
  const companyId = req.user.company_id;
  
  // Extract requirements via AI
  const response = await fetch('http://resume-parser:8000/extract-job-requirements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description })
  });
  
  const requirements = await response.json();
  
  // Save job posting
  const job = await createJobPosting(companyId, requirements);
  
  // Find initial matches
  const matches = await findMatchingCandidates(job.id, requirements);
  
  res.json({ 
    job,
    requirements,
    match_count: matches.length,
    top_matches: matches.slice(0, 10)
  });
});

router.post('/onboarding/complete', async (req, res) => {
  const { profile_data } = req.body;
  const userId = req.user.id;
  
  // Finalize profile
  await finalizeProfile(userId, profile_data);
  
  // Calculate initial matches
  const matches = await calculateTopMatches(userId);
  
  // Send welcome notification
  await sendWelcomeNotification(userId);
  
  res.json({ 
    status: 'complete',
    matches: matches.slice(0, 10),
    validation_score: profile_data.validation_score
  });
});
```

---

## Key Optimizations

### 1. Progressive Profile Enrichment
- **Minimum viable profile:** Name, title, 5 skills, target salary
- **Start matching immediately** with basic profile
- **Gamify completion:** "Complete your profile to unlock 10x more matches!"
- **Earn XP** for adding: portfolio links, projects, certifications, references

### 2. Smart Defaults
- Auto-detect salary range from title + experience
- Pre-fill skills from resume/GitHub
- Suggest job preferences based on work history

### 3. Validation as a Feature
- Show "🔥 87% Validated" badge prominently
- Explain: "GitHub activity confirms 20 years experience"
- Make it a selling point: "Companies see verified candidates first"

### 4. Instant Gratification
- Show match count immediately: "47 companies want to meet you!"
- Preview top 3 matches during onboarding
- Trigger first notification: "🔥 Stripe just viewed your profile!"

### 5. Reduce Friction
- No 10-page forms
- AI does 90% of the work
- User only confirms/edits
- Can always add more later

---

## Metrics to Track

- **Time to first match:** Target <2 minutes
- **Onboarding completion rate:** Target >80%
- **Profile completeness:** Track % of fields filled
- **Upload method:** Track resume vs LinkedIn vs manual
- **Validation score distribution:** Ensure fairness

---

## Next Steps

1. Build resume parser service (Python + GPT-4)
2. Implement GitHub OAuth + validation calculation
3. Create onboarding API endpoints
4. Build simple React onboarding flow
5. Test with real resumes and job descriptions
