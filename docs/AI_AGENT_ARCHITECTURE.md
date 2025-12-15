# AI Agent & RAG Architecture

**HireWire Intelligent Career Assistant**

## Overview

The AI Agent system provides personalized career guidance, resume analysis, job matching explanations, and conversational assistance powered by Retrieval Augmented Generation (RAG) using the existing Qdrant vector database and career context data.

## Core Capabilities

### 1. Career Coach AI
- **Personalized career advice** based on user's career context
- **Resume improvement suggestions** with specific feedback
- **Interview preparation** tailored to matched jobs
- **Skill gap analysis** and learning path recommendations
- **Career progression planning**

### 2. Match Explainer
- **Why this job matches** - Breakdown of match score components
- **What makes you qualified** - Highlight relevant experience/skills
- **Growth opportunities** - How job aligns with career goals
- **Red flags detection** - Identify potential misalignments

### 3. Conversational Assistant
- **Natural language Q&A** about jobs, matches, career
- **Context-aware responses** using RAG over user data
- **Multi-turn conversations** with memory
- **Proactive suggestions** based on user behavior

### 4. Resume Analysis
- **Automated feedback** on resume quality
- **ATS optimization** suggestions
- **Keyword matching** against target roles
- **Formatting improvements**

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  AI Chat UI  │  │Career Coach  │  │Match Explainer│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────┐      │
│  │         AI Service (web/lib/ai/)                   │      │
│  │  - RAG Client                                      │      │
│  │  - Prompt Templates                                │      │
│  │  - Context Builder                                 │      │
│  │  - Streaming Handler                               │      │
│  └─────────────────────────┬─────────────────────────┘      │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────┐      │
│  │      Zustand AI Store Slice                        │      │
│  │  - Conversations                                   │      │
│  │  - Active session                                  │      │
│  │  - Suggestions cache                               │      │
│  └─────────────────────────┬─────────────────────────┘      │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────┐      │
│  │      IndexedDB AI Storage                          │      │
│  │  - ai_conversations                                │      │
│  │  - ai_messages                                     │      │
│  │  - ai_suggestions                                  │      │
│  └────────────────────────────────────────────────────┘      │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP/SSE
┌─────────────────────────────▼───────────────────────────────┐
│              AI AGENT SERVICE (Python/FastAPI)               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Master Agent Orchestrator                  │   │
│  │  - Route requests to specialized agents              │   │
│  │  - Manage conversation context                       │   │
│  │  - Aggregate responses                               │   │
│  └───────┬──────────────────────────────────────────────┘   │
│          │                                                   │
│  ┌───────▼────────┐  ┌────────────┐  ┌─────────────┐       │
│  │ Career Coach   │  │   Match    │  │   Resume    │       │
│  │    Agent       │  │  Explainer │  │  Analyzer   │       │
│  └───────┬────────┘  └─────┬──────┘  └──────┬──────┘       │
│          │                  │                 │              │
│          └──────────────────┼─────────────────┘              │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────┐    │
│  │              RAG Pipeline                            │    │
│  │  1. Query understanding & intent classification      │    │
│  │  2. Context retrieval from Qdrant                    │    │
│  │  3. Prompt construction with retrieved context       │    │
│  │  4. LLM generation (OpenAI/Anthropic)               │    │
│  │  5. Response post-processing & validation           │    │
│  └──────────────────────────┬──────────────────────────┘    │
│                             │                                │
└─────────────────────────────┼────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────┐
│                    VECTOR DATABASE (Qdrant)                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Collections:                                                 │
│  - user_profiles (career context vectors)                     │
│  - job_descriptions (job requirement vectors)                 │
│  - skills_knowledge (skill embeddings)                        │
│  - conversation_history (chat embeddings)                     │
│  - resume_sections (parsed resume vectors)                    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## RAG Pipeline Details

### 1. Query Understanding
```python
def understand_query(user_message: str) -> QueryIntent:
    """
    Classify user intent and extract entities
    """
    intent = classify_intent(user_message)
    entities = extract_entities(user_message)
    
    return QueryIntent(
        type=intent,  # 'career_advice', 'match_question', 'resume_feedback'
        entities=entities,  # job_id, skill_name, company_name
        complexity='simple' | 'complex' | 'multi_turn'
    )
```

### 2. Context Retrieval
```python
def retrieve_context(query_intent: QueryIntent, user_id: str) -> RAGContext:
    """
    Fetch relevant context from Qdrant based on query
    """
    # Get user's career context
    career_context = qdrant.search(
        collection="user_profiles",
        query_vector=embed(query_intent.text),
        filter={"user_id": user_id},
        limit=5
    )
    
    # Get relevant jobs if job-related query
    if query_intent.type in ['match_question', 'job_inquiry']:
        relevant_jobs = qdrant.search(
            collection="job_descriptions",
            query_vector=embed(query_intent.text),
            limit=3
        )
    
    # Get relevant skills/knowledge
    skill_context = qdrant.search(
        collection="skills_knowledge",
        query_vector=embed(query_intent.text),
        limit=10
    )
    
    return RAGContext(
        career_context=career_context,
        jobs=relevant_jobs,
        skills=skill_context
    )
```

### 3. Prompt Construction
```python
def build_prompt(query: str, context: RAGContext, history: list) -> str:
    """
    Construct LLM prompt with retrieved context
    """
    return f"""
You are HireWire's AI Career Coach. Help the user with their career questions.

USER PROFILE:
{format_career_context(context.career_context)}

RELEVANT JOBS:
{format_jobs(context.jobs)}

CONVERSATION HISTORY:
{format_history(history[-5:])}

USER QUESTION:
{query}

Provide helpful, personalized advice based on the user's career context.
"""
```

### 4. LLM Generation
```python
async def generate_response(prompt: str, stream: bool = True):
    """
    Generate response using OpenAI or Anthropic
    """
    if stream:
        async for chunk in openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        ):
            yield chunk.choices[0].delta.content
    else:
        response = await openai.ChatCompletion.create(
            model="gpt-4-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content
```

## Specialized Agents

### Career Coach Agent
**Purpose**: Provide personalized career guidance

**Capabilities**:
- Analyze career trajectory and suggest next steps
- Identify skill gaps and recommend learning resources
- Provide interview preparation tailored to target roles
- Offer negotiation strategies based on market data
- Help with career transitions and pivots

**Prompt Template**:
```
You are an expert career coach with 20+ years of experience.

USER CAREER CONTEXT:
- Current Role: {current_role}
- Experience: {years_experience} years
- Skills: {top_skills}
- Career Goals: {career_goals}
- Learning Interests: {learning_interests}

RECENT ACTIVITY:
- Swiped on: {recent_swipes}
- Matches: {active_matches}
- Profile views: {profile_metrics}

Provide actionable career advice that aligns with the user's goals and current situation.
```

### Match Explainer Agent
**Purpose**: Explain why jobs match and help users make decisions

**Capabilities**:
- Break down match scores into understandable components
- Highlight relevant experience and skills
- Identify growth opportunities in the role
- Flag potential concerns or misalignments
- Compare multiple jobs side-by-side

**Prompt Template**:
```
Explain why this job is a {match_score}% match for the user.

USER PROFILE:
{career_context}

JOB DETAILS:
- Title: {job_title}
- Company: {company_name}
- Requirements: {requirements}
- Description: {description}

MATCH BREAKDOWN:
- Skills Match: {skills_score}% ({matching_skills})
- Career Fit: {career_fit_score}%
- Culture Fit: {culture_score}%
- Learning Potential: {learning_score}%

Provide a clear, honest explanation of the match quality and help the user decide.
```

### Resume Analyzer Agent
**Purpose**: Provide actionable resume feedback

**Capabilities**:
- Analyze resume structure and formatting
- Identify missing keywords for target roles
- Suggest improvements to bullet points
- Check for ATS compatibility
- Benchmark against successful resumes in similar roles

**Prompt Template**:
```
Analyze this resume and provide specific, actionable feedback.

RESUME CONTENT:
{resume_text}

TARGET ROLES:
{target_roles}

EVALUATION CRITERIA:
1. ATS Optimization (keywords, formatting)
2. Impact & Achievements (quantified results)
3. Relevance to target roles
4. Clarity & Conciseness
5. Professional presentation

Provide specific suggestions with examples.
```

## Data Models

### AI Conversation
```typescript
interface AIConversation {
  id: string;
  userId: string;
  type: 'career_coach' | 'match_explainer' | 'resume_feedback' | 'general';
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'archived';
  metadata?: {
    jobId?: string;
    matchId?: string;
    resumeId?: string;
  };
}
```

### AI Message
```typescript
interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    intent?: string;
    confidence?: number;
    contextUsed?: string[];
    modelUsed?: string;
    tokensUsed?: number;
  };
  feedback?: {
    helpful: boolean;
    rating?: 1 | 2 | 3 | 4 | 5;
    comment?: string;
  };
}
```

### AI Suggestion
```typescript
interface AISuggestion {
  id: string;
  userId: string;
  type: 'career_tip' | 'job_recommendation' | 'skill_suggestion' | 'interview_tip';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  expiresAt?: Date;
  dismissed: boolean;
  actionTaken: boolean;
  metadata?: {
    relatedJobId?: string;
    relatedSkillId?: string;
  };
}
```

## API Endpoints

### Chat Endpoints
```typescript
// Start new conversation
POST /api/ai/chat/start
Body: { type: 'career_coach' | 'match_explainer' | 'general', metadata?: {} }
Response: { conversationId: string }

// Send message (streaming)
POST /api/ai/chat/message
Body: { conversationId: string, message: string }
Response: Server-Sent Events stream

// Get conversation history
GET /api/ai/chat/:conversationId
Response: { conversation: AIConversation, messages: AIMessage[] }

// Rate message
POST /api/ai/chat/message/:messageId/feedback
Body: { helpful: boolean, rating?: number, comment?: string }
Response: { success: boolean }
```

### Match Explanation Endpoints
```typescript
// Get match explanation
GET /api/ai/explain/:matchId
Response: { explanation: string, breakdown: MatchBreakdown }

// Get job comparison
POST /api/ai/compare
Body: { jobIds: string[] }
Response: { comparison: JobComparison, recommendation: string }
```

### Resume Analysis Endpoints
```typescript
// Analyze resume
POST /api/ai/resume/analyze
Body: { resumeId: string, targetRoles?: string[] }
Response: { analysis: ResumeAnalysis, suggestions: Suggestion[] }

// Get improvement suggestions
GET /api/ai/resume/:resumeId/suggestions
Response: { suggestions: ResumeSuggestion[] }
```

### Suggestions Endpoints
```typescript
// Get personalized suggestions
GET /api/ai/suggestions
Query: { type?: string, limit?: number }
Response: { suggestions: AISuggestion[] }

// Dismiss suggestion
POST /api/ai/suggestions/:id/dismiss
Response: { success: boolean }
```

## Frontend Integration

### AI Store Slice (Zustand)
```typescript
interface AISlice {
  // State
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: Record<string, AIMessage[]>;
  isStreaming: boolean;
  suggestions: AISuggestion[];
  
  // Actions
  startConversation: (type: string, metadata?: any) => Promise<string>;
  sendMessage: (conversationId: string, message: string) => Promise<void>;
  getConversation: (conversationId: string) => Promise<void>;
  rateMessage: (messageId: string, feedback: Feedback) => Promise<void>;
  getSuggestions: () => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
}
```

### AI Service
```typescript
// web/lib/ai/index.ts
export class AIService {
  async startChat(type: string, metadata?: any): Promise<string> {
    const response = await fetch('/api/ai/chat/start', {
      method: 'POST',
      body: JSON.stringify({ type, metadata })
    });
    return response.json().conversationId;
  }
  
  async sendMessage(
    conversationId: string,
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch('/api/ai/chat/message', {
      method: 'POST',
      body: JSON.stringify({ conversationId, message })
    });
    
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  }
  
  async explainMatch(matchId: string): Promise<MatchExplanation> {
    const response = await fetch(`/api/ai/explain/${matchId}`);
    return response.json();
  }
}
```

## Caching Strategy

### 1. Suggestion Cache
- **Cache suggestions for 1 hour** in IndexedDB
- **Refresh on user activity** (swipe, match, message)
- **Prefetch during idle time**

### 2. Explanation Cache
- **Cache match explanations for 24 hours**
- **Invalidate when match status changes**
- **Store in IndexedDB with TTL**

### 3. Conversation Cache
- **Store all conversations locally**
- **Sync to backend every 5 minutes**
- **Keep last 50 messages in memory**

## Privacy & Security

### Data Handling
- **User consent required** before AI features activate
- **Explicit opt-in** for resume analysis
- **Data minimization** - only send necessary context to LLM
- **Anonymization** - remove PII before embedding

### Context Boundaries
- **Never share data across users**
- **Filter sensitive information** from prompts
- **Audit log all AI interactions**
- **Allow users to delete AI conversations**

### Model Safety
- **Content filtering** on inputs and outputs
- **Bias detection** in recommendations
- **Fallback to rule-based** if AI unavailable
- **Human-in-the-loop** for critical decisions

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Initial response latency | < 2s | Time to first token |
| Streaming token rate | > 50 tokens/s | Perceived speed |
| Context retrieval | < 500ms | Qdrant query time |
| Cache hit rate | > 80% | For suggestions |
| Conversation load | < 1s | From IndexedDB |

## Cost Optimization

### Token Management
- **Use GPT-4-Turbo** for complex reasoning (career advice)
- **Use GPT-3.5-Turbo** for simple Q&A
- **Cache embeddings** - don't re-embed same content
- **Limit context window** - only include relevant docs

### Request Batching
- **Batch suggestion generation** - generate 10 at once
- **Prefetch explanations** - for top 5 matches
- **Background processing** - analyze resume async

## Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ AI types and interfaces
- ✅ AI service layer with streaming
- ✅ AI store slice in Zustand
- ✅ IndexedDB tables for AI data
- ✅ Basic chat UI component

### Phase 2: RAG Pipeline (Week 2)
- ✅ AI Agent microservice (Python/FastAPI)
- ✅ Qdrant integration for context retrieval
- ✅ Prompt templates for each agent type
- ✅ LLM integration (OpenAI)
- ✅ Response streaming

### Phase 3: Specialized Agents (Week 3)
- ⏳ Career Coach agent with personalized advice
- ⏳ Match Explainer with score breakdowns
- ⏳ Resume Analyzer with actionable feedback
- ⏳ Intent classification and routing

### Phase 4: Polish & Optimization (Week 4)
- ⏳ Caching and performance optimization
- ⏳ Feedback collection and model fine-tuning
- ⏳ Analytics and monitoring
- ⏳ A/B testing different prompts

## Monitoring & Analytics

### Key Metrics
- **Conversation starts** - How many users engage with AI
- **Messages per conversation** - Engagement depth
- **Helpful ratings** - Response quality
- **Suggestion acceptance rate** - Actionability
- **Context retrieval accuracy** - RAG effectiveness
- **Model costs** - Token usage and expenses

### Alerts
- **High error rate** - AI service failures
- **Slow responses** - Latency > 5s
- **Low helpful ratings** - Quality issues
- **Cost spike** - Unexpected token usage

## Future Enhancements

### Advanced Features
- **Voice interaction** - Speech-to-text for career coaching
- **Visual resume builder** - AI-assisted resume formatting
- **Interview simulator** - Practice with AI interviewer
- **Salary negotiation coach** - Data-driven advice
- **Company research assistant** - Automated due diligence

### Model Improvements
- **Fine-tuned models** - Train on HireWire-specific data
- **Multi-modal AI** - Process resume PDFs directly
- **Personalized agents** - Learn user preferences over time
- **Proactive coaching** - Suggest actions without prompting

---

**Next Steps**: Implement Phase 1 components (types, services, UI) to get basic AI chat working with streaming responses.
