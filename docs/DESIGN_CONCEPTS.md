# HireWire - Platform Design Concepts

## Core User Interfaces

This document captures the UI/UX concepts discussed for HireWire's engaging, gamified job matching platform.

---

## 1. Swipe Mode (Mobile-First)

### Candidate Card View
```
┌─────────────────────────────────────────┐
│  CLOUDFLARE                             │
│  Senior Full Stack Engineer             │
│                                         │
│  💰 $200-260K                           │
│  📍 Remote (US)                         │
│  🎯 Match: 89%                          │
│                                         │
│  Why this matches you:                  │
│  ✓ React + TypeScript (your expertise) │
│  ✓ WebRTC experience (rare, you have)  │
│  ✓ Edge computing (new, you'd learn)   │
│                                         │
│  Team vibe: Fast-paced, ship daily     │
│  Engineering blog: 4.8/5 quality       │
│  Last hire: 2 weeks ago (hiring now)   │
│                                         │
│  ← 👎 PASS        INTERESTED 👍 →       │
│                                         │
│  ⏭️ SKIP (see later)                    │
└─────────────────────────────────────────┘
```

### Company Card View (Recruiter)
```
┌─────────────────────────────────────────┐
│  RICHARD O'BRIEN                        │
│  Staff Software Engineer                │
│                                         │
│  ⭐ Validation Score: 87% (Verified)    │
│  💼 20 years experience                 │
│  🎯 Match: 89%                          │
│                                         │
│  Key strengths:                         │
│  ✓ React/TypeScript (8 years proven)   │
│  ✓ WebRTC real-time systems            │
│  ✓ Built 4 production platforms        │
│                                         │
│  Recent projects:                       │
│  • AI-Now: AI automation platform      │
│  • TrafficJamz: Real-time WebRTC app   │
│  • v2u: Multi-platform SaaS            │
│                                         │
│  Salary: $180K+ | Remote preferred     │
│  Available: 1 week notice              │
│                                         │
│  ← 👎 PASS        INTERESTED 👍 →       │
└─────────────────────────────────────────┘
```

---

## 2. Match Notification

### Mutual Match Screen
```
🎉 IT'S A MATCH!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You + Cloudflare both swiped right!

What happens now:
1. Chat unlocked (in-app messaging)
2. Richard's full profile shared with Cloudflare
3. Cloudflare's interview process shared with Richard
4. Suggested next step: 15-min intro call

┌─────────────────────────────────────────┐
│ 💬 Start Chat                           │
│ 📅 Schedule 15-min call                 │
│ 📄 View full job description            │
└─────────────────────────────────────────┘

⚡ 78% of matches lead to interview
⏱️ Average time to first call: 2.3 days
```

---

## 3. Live Match Event Interface

### Event Lobby
```
🎯 LIVE MATCH SESSION - Thursday 6PM MST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You: Richard O'Brien (Software Engineer track)

🔥 5 COMPANIES WANT TO MEET YOU RIGHT NOW:

┌─────────────────────────────────────────┐
│ 🟢 Stripe - Staff Engineer              │
│ Match: 94% | $220-280K | Remote         │
│ Chat now: 3 min quick intro             │
│ [START CHAT] ← Click                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟢 Anthropic - Principal Engineer        │
│ Match: 91% | $250-320K | SF/Remote      │
│ Live Q&A: 5 min video                   │
│ [JOIN VIDEO] ← Click                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🟢 Cloudflare - Senior Full Stack        │
│ Match: 89% | $200-260K | Remote         │
│ Quick chat: 3 min intro                 │
│ [START CHAT]                            │
└─────────────────────────────────────────┘

⏱️ Session ends in 45 minutes
👥 12 other engineers in this session
🎁 Complete 3 chats = unlock premium features
```

---

## 4. Gamification Dashboard

### Progress Stats
```
YOUR JOB SEARCH STATS 📊
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Match Score: 87/100 (Strong profile!)
🔥 Streak: 7 days active
⭐ Level: Elite Candidate (Level 8)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TODAY'S PROGRESS:
▓▓▓▓▓▓▓▓░░ 8/10 daily swipes
▓▓▓░░░░░░░ 3/10 profile views
▓░░░░░░░░░ 1/5 mutual matches

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACHIEVEMENTS UNLOCKED:
✅ First Match (Day 1)
✅ 10 Company Likes (Week 1)
✅ 5 Mutual Matches (Week 2)
⬜ First Interview (Pending)
⬜ Job Offer (Pending)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WEEKLY CHALLENGE:
🎁 Get 3 mutual matches this week
   Reward: Premium features for 1 month
   Progress: 2/3 ▓▓░

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LEADERBOARD (Your network):
1. Sarah K. - 12 matches this week
2. Mike D. - 9 matches
3. YOU - 8 matches ⬆️ +3 from last week
4. James R. - 7 matches
```

### Daily Quests
```
DAILY QUESTS 🎯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

□ Swipe on 10 jobs (+50 XP)
□ Update one skill (+25 XP)
□ Send 1 follow-up message (+30 XP)
□ Complete profile to 100% (+100 XP)

BONUS QUEST:
□ Get 1 mutual match today (+200 XP)
```

---

## 5. Notification Center

### Real-Time Notifications
```
🔔 NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 Stripe just viewed your profile!
   (2 min ago)
   
💬 Anthropic sent you a message
   "Love your WebRTC experience..."
   [REPLY NOW]
   
👍 Cloudflare liked you!
   (5 min ago) - Like them back?
   
🎁 You unlocked: Premium features!
   Complete 3 chats achievement
   
⚡ LIVE MATCH EVENT starts in 15 min
   5 companies waiting to meet you
   [JOIN NOW]
   
🎯 New job posted: Vercel - Staff Eng
   98% match! (Top 5 match this month)
   [VIEW JOB]
```

---

## 6. Job Hunt Squad (Social)

### Squad Interface
```
YOUR JOB HUNT SQUAD 👥
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sarah K. (Frontend Engineer)
🔥 12 matches this week
💬 "Just got offer from Vercel! 🎉"
👍 Congrats! | ❓ Ask how

Mike D. (Backend Engineer)  
⏳ Final round at Stripe
💬 "Interview tips?"
📝 5 comments

You (Full Stack Engineer)
🎯 8 matches, 2 interviews scheduled
💬 Share update?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SQUAD ACHIEVEMENTS:
✨ 3 offers this month
🎯 87 total matches
⚡ Avg response rate: 24%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INVITE FRIENDS:
Each friend who joins = 1 week Premium
Current: 2 invited, 2 weeks earned
```

---

## 7. Company Intelligence

### Company Profile
```
CLOUDFLARE - COMPANY INTEL 🔍
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Interview Process (from candidates):
⭐⭐⭐⭐⭐ 4.6/5 (89 reviews)

Timeline:
• Application → Response: 3-5 days
• Phone screen → Onsite: 1 week  
• Onsite → Offer: 3-7 days
• Total: 2-3 weeks average

Recent Candidate Reviews:
👍 "Super technical, loved the questions"
👍 "Interviewers were friendly and helpful"
👍 "Fast process, clear communication"
⚠️ "Lots of system design, prepare well"

Salary Data (verified offers):
Staff Engineer: $200-280K (12 offers)
Senior Engineer: $160-220K (34 offers)

Success Tips (from hired candidates):
• Study edge computing concepts
• Practice distributed systems design
• Mention blog posts if you read them
• Ask about their Workers platform
```

---

## 8. AI Career Coach Chat

### Chat Interface
```
💬 CHAT WITH AI CAREER COACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You: Should I apply to this Stripe role?

AI Coach: Let me check... 

✅ YES, strong match (94%)!

Here's why:
• Your React/TypeScript = exactly what they need
• Salary $220-280K = above your $180K minimum
• Remote = matches your preference
• Fast-growing payments team = good growth

⚠️ Heads up:
• They emphasize financial systems experience
• Mention your Thomson Reuters work (FinTech!)
• Highlight transaction processing from v2u

📝 Suggested approach:
1. Apply with Software track resume
2. Custom cover letter (mention payments exp)
3. Follow up in 4 days if no response

Want me to draft your cover letter now?

[YES, DRAFT IT] [SHOW ME MORE DETAILS]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AI Coach: 👋 Good morning!

Your daily briefing:
🔥 3 new matches (2 high-priority)
💬 1 message waiting from Anthropic
📅 Interview with Cloudflare tomorrow (prep?)

What do you want to do first?

[VIEW MATCHES] [READ MESSAGE] [PREP INTERVIEW]
```

---

## Design System

### Color Palette (Electric Theme)
```
Primary:    Electric Blue (#00A8FF)
Secondary:  Lightning Yellow (#FFD700)
Success:    Neon Green (#00FF41)
Warning:    Orange Alert (#FF6B35)
Danger:     Hot Red (#FF3838)
Background: Dark Navy (#0A1628)
Surface:    Card Gray (#1E2A3A)
Text:       Pure White (#FFFFFF)
Muted:      Steel Gray (#8B95A1)
```

### Typography
```
Headings:   Inter Bold, 24-48px
Body:       Inter Regular, 14-16px
Labels:     Inter Medium, 12-14px
Buttons:    Inter SemiBold, 14-16px
Code:       JetBrains Mono, 14px
```

### Animations
```
Swipe:      Spring physics, 300ms
Match:      Confetti burst + haptic
Level Up:   Glow pulse + sound
Toast:      Slide in from top, 200ms
Loading:    Skeleton shimmer
```

### Icons
```
Match:      Lightning bolt ⚡
Like:       Thumbs up 👍
Pass:       Thumbs down 👎
Chat:       Message bubble 💬
Video:      Camera 📹
Calendar:   Schedule 📅
Fire:       Streak 🔥
Trophy:     Achievement 🏆
```

---

## Mobile vs Desktop

### Mobile-First (Primary)
- Swipe gestures native
- Full-screen cards
- Bottom navigation
- Pull-to-refresh
- Push notifications
- Haptic feedback

### Desktop (Secondary)
- Arrow keys for swipe
- Sidebar navigation
- Multi-column layout
- Keyboard shortcuts
- Browser notifications
- Drag-and-drop

---

## Accessibility

### WCAG 2.1 AA Compliance
- Color contrast ratios: 4.5:1+
- Keyboard navigation: Full support
- Screen reader: Semantic HTML
- Focus indicators: Visible outlines
- Alternative text: All images
- Captions: Video content

### Inclusive Design
- Dyslexia-friendly fonts
- Reduced motion option
- Dark/light mode toggle
- Font size controls
- High contrast mode

---

## Animation Details

### Swipe Mechanics
```javascript
// Card physics
friction: 0.8
tension: 180
mass: 1.0

// Swipe threshold
horizontal: 150px
vertical: 50px

// Rotation
maxAngle: 15deg
rotationMultiplier: 0.1

// Haptics
lightImpact: onDrag
mediumImpact: onRelease
success: onMatch
```

### Match Animation
```javascript
// Confetti
particles: 100
colors: [electric-blue, lightning-yellow]
duration: 2000ms
gravity: 0.5

// Card reveal
scale: 0.8 → 1.0
opacity: 0 → 1
duration: 400ms
easing: spring
```

### Level Up
```javascript
// Glow effect
color: lightning-yellow
blur: 20px
duration: 1000ms
pulse: 3 times

// Sound
file: level-up.mp3
volume: 0.7
```

---

## Responsive Breakpoints

```css
/* Mobile */
xs: 0-575px      (phones)
sm: 576-767px    (large phones)

/* Tablet */
md: 768-991px    (tablets)
lg: 992-1199px   (large tablets)

/* Desktop */
xl: 1200-1399px  (desktops)
xxl: 1400px+     (large screens)
```

---

## Component Library

### Priority Components (MVP)
1. SwipeCard
2. MatchModal
3. ChatInterface
4. ProfileEditor
5. NotificationToast
6. ProgressBar
7. AchievementBadge
8. LeaderboardRow
9. EventCard
10. QuestItem

### Future Components
- VideoChat
- CalendarScheduler
- DocumentUploader
- SkillValidator
- CompanyProfileCard
- InterviewPrepModule

---

**Design Philosophy:**
- Mobile-first, swipe-native
- Instant feedback (animations, haptics)
- Gamification visible everywhere
- Dark theme with electric accents
- Fast, responsive, addictive
