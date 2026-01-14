# AI Agent Service - Master Orchestrator with RAG
# HireWire Intelligent Career Assistant
# Built with FastAPI, Qdrant, OpenAI

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, AsyncIterator
from enum import Enum
import os
import asyncio
from datetime import datetime
import json

# Third-party imports
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
import openai
from openai import AsyncOpenAI

# Initialize FastAPI app
app = FastAPI(title="HireWire AI Agent Service", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize clients
qdrant_client = QdrantClient(
    url=os.getenv("QDRANT_URL", "http://localhost:6333"),
    api_key=os.getenv("QDRANT_API_KEY", None)
)

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ==================== MODELS ====================

class ConversationType(str, Enum):
    CAREER_COACH = "career_coach"
    MATCH_EXPLAINER = "match_explainer"
    RESUME_FEEDBACK = "resume_feedback"
    GENERAL = "general"

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class QueryIntentType(str, Enum):
    CAREER_ADVICE = "career_advice"
    MATCH_QUESTION = "match_question"
    RESUME_FEEDBACK = "resume_feedback"
    JOB_INQUIRY = "job_inquiry"
    GENERAL = "general"

class StartConversationRequest(BaseModel):
    type: ConversationType
    metadata: Optional[Dict[str, Any]] = None

class SendMessageRequest(BaseModel):
    conversationId: str
    message: str

class RateMessageRequest(BaseModel):
    helpful: bool
    rating: Optional[int] = None
    comment: Optional[str] = None

class AnalyzeResumeRequest(BaseModel):
    resumeId: str
    targetRoles: Optional[List[str]] = None

class CompareJobsRequest(BaseModel):
    jobIds: List[str]

class QueryIntent(BaseModel):
    type: QueryIntentType
    entities: Dict[str, Any]
    complexity: str
    confidence: float

class RAGSource(BaseModel):
    id: str
    type: str
    content: str
    relevanceScore: float
    metadata: Optional[Dict[str, Any]] = None

class RAGContext(BaseModel):
    careerContext: List[RAGSource]
    jobs: List[RAGSource]
    skills: List[RAGSource]
    conversationHistory: List[RAGSource]

# ==================== SYSTEM PROMPTS ====================

SYSTEM_PROMPTS = {
    "career_coach": """You are an expert career coach with 20+ years of experience helping professionals navigate their careers. You provide:
- Personalized, actionable advice based on each individual's unique situation
- Honest feedback that balances encouragement with realism
- Specific next steps rather than vague suggestions
- Evidence-based recommendations grounded in career development research

Communication style: Direct, conversational, and empathetic. Use "you" and "your" to make it personal. Break complex advice into clear steps.""",

    "match_explainer": """You are a job matching expert who helps candidates understand why certain opportunities are good fits for them. Explain match scores in clear terms, highlight relevant experience, identify growth opportunities, and provide honest assessments of concerns.""",

    "resume_analyzer": """You are a professional resume consultant who has reviewed thousands of resumes. Identify specific ways to strengthen resume content, optimize for ATS, and tailor feedback to target roles. Provide concrete examples of improvements.""",

    "general": """You are HireWire's AI assistant, helping job seekers navigate their career journey. Be friendly, helpful, and concise. Refer to the user's actual data when available."""
}

# ==================== CONVERSATION STORE (In-memory for demo) ====================

conversations: Dict[str, Dict[str, Any]] = {}
conversation_messages: Dict[str, List[Dict[str, Any]]] = {}

# ==================== AUTH DEPENDENCY ====================

async def verify_token(authorization: Optional[str] = Header(None)) -> str:
    """Verify JWT token and return user ID"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    token = authorization.split(" ")[1]
    # TODO: Implement actual JWT verification
    # For now, return mock user ID
    return "user_123"

# ==================== RAG PIPELINE ====================

async def understand_query(message: str) -> QueryIntent:
    """Classify user intent using GPT-4"""
    prompt = f"""Classify this user message into one of these intents:
- career_advice: Asking for career guidance, next steps, or advice
- match_question: Asking about a specific job match or why a job matches
- resume_feedback: Asking about resume quality or improvements
- job_inquiry: Asking about specific jobs or job requirements
- general: General questions or conversation

Message: "{message}"

Return JSON with: {{ "type": "career_advice", "entities": {{}}, "complexity": "simple", "confidence": 0.95 }}"""

    response = await openai_client.chat.completions.create(
        model="gpt-4-turbo",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}
    )
    
    result = json.loads(response.choices[0].message.content)
    return QueryIntent(**result)

async def retrieve_context(
    intent: QueryIntent,
    user_id: str,
    conversation_history: List[Dict[str, Any]]
) -> RAGContext:
    """Retrieve relevant context from Qdrant"""
    
    # Get embedding for the query
    embedding_response = await openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=conversation_history[-1]["content"] if conversation_history else "context"
    )
    query_vector = embedding_response.data[0].embedding
    
    # Search career context
    career_results = []
    try:
        career_search = qdrant_client.search(
            collection_name="user_profiles",
            query_vector=query_vector,
            query_filter=Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            ),
            limit=5
        )
        career_results = [
            RAGSource(
                id=str(hit.id),
                type="career_context",
                content=hit.payload.get("text", ""),
                relevanceScore=hit.score,
                metadata=hit.payload
            )
            for hit in career_search
        ]
    except Exception as e:
        print(f"Career context search failed: {e}")
    
    # Search job descriptions if job-related query
    job_results = []
    if intent.type in [QueryIntentType.MATCH_QUESTION, QueryIntentType.JOB_INQUIRY]:
        try:
            job_search = qdrant_client.search(
                collection_name="job_descriptions",
                query_vector=query_vector,
                limit=3
            )
            job_results = [
                RAGSource(
                    id=str(hit.id),
                    type="job_description",
                    content=hit.payload.get("description", ""),
                    relevanceScore=hit.score,
                    metadata=hit.payload
                )
                for hit in job_search
            ]
        except Exception as e:
            print(f"Job search failed: {e}")
    
    # Search skills knowledge
    skill_results = []
    try:
        skill_search = qdrant_client.search(
            collection_name="skills_knowledge",
            query_vector=query_vector,
            limit=10
        )
        skill_results = [
            RAGSource(
                id=str(hit.id),
                type="skill",
                content=hit.payload.get("skill_name", ""),
                relevanceScore=hit.score,
                metadata=hit.payload
            )
            for hit in skill_search
        ]
    except Exception as e:
        print(f"Skills search failed: {e}")
    
    # Format conversation history
    history_sources = [
        RAGSource(
            id=f"hist_{idx}",
            type="conversation_history",
            content=f"{msg['role']}: {msg['content']}",
            relevanceScore=1.0,
            metadata=msg
        )
        for idx, msg in enumerate(conversation_history[-5:])  # Last 5 messages
    ]
    
    return RAGContext(
        careerContext=career_results,
        jobs=job_results,
        skills=skill_results,
        conversationHistory=history_sources
    )

def build_prompt(
    conversation_type: ConversationType,
    user_message: str,
    rag_context: RAGContext
) -> List[Dict[str, str]]:
    """Build messages array for OpenAI"""
    
    # System prompt
    system_prompt = SYSTEM_PROMPTS.get(conversation_type.value, SYSTEM_PROMPTS["general"])
    
    # Build context section
    context = ""
    
    if rag_context.careerContext:
        context += "\n\nUSER CAREER CONTEXT:\n"
        for source in rag_context.careerContext[:3]:
            context += f"- {source.content}\n"
    
    if rag_context.jobs:
        context += "\n\nRELEVANT JOBS:\n"
        for source in rag_context.jobs:
            context += f"- {source.content[:200]}...\n"
    
    if rag_context.skills:
        context += "\n\nRELEVANT SKILLS:\n"
        skills = [s.content for s in rag_context.skills[:10]]
        context += f"{', '.join(skills)}\n"
    
    messages = [
        {"role": "system", "content": system_prompt + context},
    ]
    
    # Add conversation history
    for source in rag_context.conversationHistory:
        role = source.metadata.get("role", "user")
        content = source.metadata.get("content", "")
        messages.append({"role": role, "content": content})
    
    # Add current message
    messages.append({"role": "user", "content": user_message})
    
    return messages

async def stream_response(
    messages: List[Dict[str, str]],
    conversation_id: str
) -> AsyncIterator[str]:
    """Stream response from OpenAI"""
    
    stream = await openai_client.chat.completions.create(
        model="gpt-4-turbo",
        messages=messages,
        stream=True,
        temperature=0.7,
        max_tokens=1000
    )
    
    async for chunk in stream:
        if chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            yield f"data: {json.dumps({'id': f'msg_{datetime.now().timestamp()}', 'conversationId': conversation_id, 'content': content, 'done': False})}\n\n"
    
    yield f"data: {json.dumps({'id': f'msg_{datetime.now().timestamp()}', 'conversationId': conversation_id, 'content': '', 'done': True})}\n\n"
    yield "data: [DONE]\n\n"

# ==================== API ROUTES ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "ai-agent", "timestamp": datetime.now().isoformat()}

@app.post("/api/ai/chat/start")
async def start_conversation(
    request: StartConversationRequest,
    user_id: str = Depends(verify_token)
):
    """Start a new AI conversation"""
    conversation_id = f"conv_{datetime.now().timestamp()}_{user_id}"
    
    conversations[conversation_id] = {
        "id": conversation_id,
        "userId": user_id,
        "type": request.type,
        "createdAt": datetime.now().isoformat(),
        "metadata": request.metadata or {}
    }
    
    conversation_messages[conversation_id] = []
    
    return {"conversationId": conversation_id}

@app.post("/api/ai/chat/message")
async def send_message(
    request: SendMessageRequest,
    user_id: str = Depends(verify_token)
):
    """Send a message and get streaming response"""
    
    if request.conversationId not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conversations[request.conversationId]
    
    # Add user message to history
    user_msg = {
        "role": "user",
        "content": request.message,
        "timestamp": datetime.now().isoformat()
    }
    conversation_messages[request.conversationId].append(user_msg)
    
    # Understand query intent
    intent = await understand_query(request.message)
    
    # Retrieve RAG context
    rag_context = await retrieve_context(
        intent,
        user_id,
        conversation_messages[request.conversationId]
    )
    
    # Build prompt
    messages = build_prompt(
        ConversationType(conversation["type"]),
        request.message,
        rag_context
    )
    
    # Stream response
    return StreamingResponse(
        stream_response(messages, request.conversationId),
        media_type="text/event-stream"
    )

@app.get("/api/ai/chat/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    user_id: str = Depends(verify_token)
):
    """Get conversation history"""
    
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conversations[conversation_id]
    if conversation["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return {
        "conversation": conversation,
        "messages": conversation_messages.get(conversation_id, [])
    }

@app.get("/api/ai/chat")
async def get_conversations(
    user_id: str = Depends(verify_token),
    type: Optional[ConversationType] = None
):
    """Get all conversations for user"""
    
    user_conversations = [
        conv for conv in conversations.values()
        if conv["userId"] == user_id and (not type or conv["type"] == type)
    ]
    
    return user_conversations

@app.post("/api/ai/chat/message/{message_id}/feedback")
async def rate_message(
    message_id: str,
    request: RateMessageRequest,
    user_id: str = Depends(verify_token)
):
    """Rate an AI message"""
    # TODO: Store feedback in database
    return {"success": True}

@app.post("/api/ai/chat/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    user_id: str = Depends(verify_token)
):
    """Archive a conversation"""
    
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    conversation = conversations[conversation_id]
    if conversation["userId"] != user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    conversation["status"] = "archived"
    return {"success": True}

@app.get("/api/ai/explain/{match_id}")
async def explain_match(
    match_id: str,
    user_id: str = Depends(verify_token)
):
    """Get AI explanation for a match"""
    # TODO: Implement match explanation using RAG
    return {
        "matchId": match_id,
        "overallScore": 85,
        "explanation": "This job is a strong match based on your skills and experience.",
        "breakdown": [],
        "recommendation": "strong_yes",
        "nextSteps": ["Review the job description", "Prepare your application"]
    }

@app.post("/api/ai/compare")
async def compare_jobs(
    request: CompareJobsRequest,
    user_id: str = Depends(verify_token)
):
    """Compare multiple jobs"""
    # TODO: Implement job comparison using RAG
    return {
        "jobs": [],
        "comparison": [],
        "recommendation": "Consider Job A for growth potential",
        "rationale": "Job A offers better learning opportunities"
    }

@app.post("/api/ai/resume/analyze")
async def analyze_resume(
    request: AnalyzeResumeRequest,
    user_id: str = Depends(verify_token)
):
    """Analyze resume and provide feedback"""
    # TODO: Implement resume analysis using RAG
    return {
        "resumeId": request.resumeId,
        "overallScore": 75,
        "summary": "Your resume is strong but could be improved",
        "sections": [],
        "keywords": {"present": [], "missing": [], "recommended": []},
        "atsCompatibility": {"score": 80, "issues": [], "fixes": []}
    }

@app.get("/api/ai/resume/{resume_id}/suggestions")
async def get_resume_suggestions(
    resume_id: str,
    user_id: str = Depends(verify_token)
):
    """Get resume improvement suggestions"""
    # TODO: Implement resume suggestions
    return []

@app.get("/api/ai/suggestions")
async def get_suggestions(
    user_id: str = Depends(verify_token),
    type: Optional[str] = None,
    limit: int = 10
):
    """Get personalized suggestions"""
    # TODO: Implement suggestion generation
    return []

@app.post("/api/ai/suggestions/{suggestion_id}/dismiss")
async def dismiss_suggestion(
    suggestion_id: str,
    user_id: str = Depends(verify_token)
):
    """Dismiss a suggestion"""
    return {"success": True}

@app.post("/api/ai/suggestions/{suggestion_id}/action")
async def take_suggestion_action(
    suggestion_id: str,
    user_id: str = Depends(verify_token)
):
    """Mark suggestion action as taken"""
    return {"success": True}

# ==================== STARTUP ====================

@app.on_event("startup")
async def startup_event():
    """Initialize connections on startup"""
    print("AI Agent Service starting up...")
    print(f"Qdrant URL: {os.getenv('QDRANT_URL', 'http://localhost:6333')}")
    print(f"OpenAI API configured: {'Yes' if os.getenv('OPENAI_API_KEY') else 'No'}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
