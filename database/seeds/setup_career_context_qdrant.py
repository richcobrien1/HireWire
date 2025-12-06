"""
Qdrant Career Context Collections Setup
Created: December 6, 2025
Purpose: Set up vector collections for semantic career matching
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from openai import OpenAI
import os

# Initialize clients
qdrant = QdrantClient(
    url="http://localhost:6333",
    api_key="hirewire_qdrant_api_key"
)
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def create_embedding(text: str) -> list[float]:
    """Generate embedding using OpenAI"""
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def setup_career_context_collections():
    """Create Qdrant collections for career context matching"""
    
    collections = [
        {
            "name": "candidate_career_context",
            "description": "Semantic embeddings of candidate motivations, interests, and goals",
            "vector_size": 768,
            "schema": {
                "candidate_id": "integer",
                "context_type": "string",  # "motivation", "interest", "goal", "vision"
                "text": "string",
                "category": "string",
                "importance": "float",  # 0-1 score
                "created_at": "string"
            }
        },
        {
            "name": "job_career_opportunities",
            "description": "Semantic embeddings of job growth opportunities, culture, and learning",
            "vector_size": 768,
            "schema": {
                "job_id": "integer",
                "company_id": "integer",
                "opportunity_type": "string",  # "learning", "growth", "culture", "impact"
                "text": "string",
                "category": "string",
                "strength": "float",  # 0-1 score
                "created_at": "string"
            }
        },
        {
            "name": "career_trajectory_patterns",
            "description": "Common career progression patterns and transitions",
            "vector_size": 768,
            "schema": {
                "pattern_id": "integer",
                "from_role": "string",
                "to_role": "string",
                "trajectory_type": "string",  # "ic", "management", "leadership"
                "common_skills": "string[]",
                "typical_timeline": "string",
                "success_factors": "string[]"
            }
        },
        {
            "name": "work_culture_embeddings",
            "description": "Semantic representations of work cultures and environments",
            "vector_size": 768,
            "schema": {
                "culture_id": "integer",
                "culture_type": "string",
                "description": "string",
                "characteristics": "string[]",
                "typical_companies": "string[]",
                "best_for": "string[]"
            }
        }
    ]
    
    for collection in collections:
        try:
            # Delete if exists (for clean setup)
            try:
                qdrant.delete_collection(collection["name"])
                print(f"🗑️  Deleted existing collection: {collection['name']}")
            except:
                pass
            
            # Create collection
            qdrant.create_collection(
                collection_name=collection["name"],
                vectors_config=VectorParams(
                    size=collection["vector_size"],
                    distance=Distance.COSINE
                )
            )
            print(f"✅ Created collection: {collection['name']}")
            print(f"   {collection['description']}")
            
        except Exception as e:
            print(f"❌ Error creating {collection['name']}: {e}")

def seed_work_culture_embeddings():
    """Seed common work cultures with embeddings"""
    
    cultures = [
        {
            "id": 1,
            "type": "Fast-paced startup",
            "description": "Rapid iteration, high autonomy, wear many hats. Move fast, break things, figure it out as you go.",
            "characteristics": ["rapid iteration", "high autonomy", "ambiguity", "ownership"],
            "best_for": ["self-starters", "generalists", "risk-tolerant"]
        },
        {
            "id": 2,
            "type": "Balanced growth-stage",
            "description": "Sustainable pace, defined processes, mentorship. Product-market fit found, scaling thoughtfully.",
            "characteristics": ["sustainable pace", "some structure", "mentorship", "growth"],
            "best_for": ["specialists", "mentees", "process-oriented"]
        },
        {
            "id": 3,
            "type": "Established enterprise",
            "description": "Structured environment, stability, resources. Clear career paths, work-life balance, benefits.",
            "characteristics": ["structure", "stability", "resources", "processes"],
            "best_for": ["specialists", "work-life balance seekers", "stability-oriented"]
        },
        {
            "id": 4,
            "type": "Remote-first async",
            "description": "Documentation culture, async communication, global team. Flexibility, written communication skills essential.",
            "characteristics": ["async", "documentation", "flexibility", "self-directed"],
            "best_for": ["independent workers", "writers", "global mindset"]
        },
        {
            "id": 5,
            "type": "Collaborative office-centric",
            "description": "Face-to-face collaboration, spontaneous brainstorming, tight team bonds. Whiteboard culture.",
            "characteristics": ["in-person", "collaborative", "spontaneous", "social"],
            "best_for": ["extroverts", "visual thinkers", "relationship builders"]
        },
        {
            "id": 6,
            "type": "Deep technical focus",
            "description": "Complex problems, technical excellence, research-oriented. Deep work, minimal meetings, high bar.",
            "characteristics": ["technical depth", "research", "autonomy", "excellence"],
            "best_for": ["technical experts", "problem solvers", "introverts"]
        },
        {
            "id": 7,
            "type": "Product-driven",
            "description": "User-centric, rapid experimentation, data-informed. Ship fast, measure, iterate. Impact focus.",
            "characteristics": ["user-focused", "data-driven", "experimentation", "impact"],
            "best_for": ["product thinkers", "pragmatists", "impact-oriented"]
        },
        {
            "id": 8,
            "type": "Mission-driven impact",
            "description": "Social good, meaningful work, purpose over profit. Change the world mentality.",
            "characteristics": ["mission", "purpose", "impact", "values"],
            "best_for": ["idealists", "mission-driven", "values-aligned"]
        }
    ]
    
    points = []
    for culture in cultures:
        # Create rich text for embedding
        text = f"{culture['type']}: {culture['description']} Characteristics: {', '.join(culture['characteristics'])}. Best for: {', '.join(culture['best_for'])}."
        
        embedding = create_embedding(text)
        
        point = PointStruct(
            id=culture["id"],
            vector=embedding,
            payload={
                "culture_type": culture["type"],
                "description": culture["description"],
                "characteristics": culture["characteristics"],
                "best_for": culture["best_for"]
            }
        )
        points.append(point)
    
    qdrant.upsert(
        collection_name="work_culture_embeddings",
        points=points
    )
    print(f"✅ Seeded {len(points)} work culture embeddings")

def seed_career_trajectory_patterns():
    """Seed common career progression patterns"""
    
    patterns = [
        {
            "id": 1,
            "from_role": "Mid-level Engineer",
            "to_role": "Senior Engineer",
            "trajectory_type": "individual_contributor",
            "description": "Deepen technical expertise, lead complex projects, mentor juniors, influence architecture decisions",
            "common_skills": ["System design", "Mentorship", "Technical leadership", "Cross-team collaboration"],
            "typical_timeline": "2-4 years",
            "success_factors": ["Technical depth", "Communication", "Project ownership", "Impact"]
        },
        {
            "id": 2,
            "from_role": "Senior Engineer",
            "to_role": "Staff Engineer",
            "trajectory_type": "individual_contributor",
            "description": "Organization-wide technical influence, strategic projects, drive technical standards, deep expertise",
            "common_skills": ["Strategic thinking", "Technical vision", "Cross-org influence", "Scaling systems"],
            "typical_timeline": "3-5 years",
            "success_factors": ["Broad impact", "Technical excellence", "Leadership", "Strategy"]
        },
        {
            "id": 3,
            "from_role": "Senior Engineer",
            "to_role": "Engineering Manager",
            "trajectory_type": "management",
            "description": "Transition from IC to people management, team health, delivery, career development",
            "common_skills": ["1-on-1s", "Performance management", "Hiring", "Team building", "Project planning"],
            "typical_timeline": "1-2 years transition",
            "success_factors": ["People skills", "Empathy", "Communication", "Organizational awareness"]
        },
        {
            "id": 4,
            "from_role": "Engineering Manager",
            "to_role": "Senior Engineering Manager / Director",
            "trajectory_type": "management",
            "description": "Manage multiple teams, strategic planning, cross-functional leadership, hiring/retention",
            "common_skills": ["Strategic planning", "Multi-team coordination", "Budget management", "Stakeholder management"],
            "typical_timeline": "3-5 years",
            "success_factors": ["Organizational impact", "Leadership", "Strategy", "Execution"]
        },
        {
            "id": 5,
            "from_role": "IC or Manager",
            "to_role": "Startup Founder",
            "trajectory_type": "entrepreneurship",
            "description": "Build from scratch, product-market fit, fundraising, team building, all hats",
            "common_skills": ["Product sense", "Sales", "Fundraising", "Resilience", "Full-stack building"],
            "typical_timeline": "Variable",
            "success_factors": ["Risk tolerance", "Adaptability", "Vision", "Execution"]
        }
    ]
    
    points = []
    for pattern in patterns:
        text = f"Career progression from {pattern['from_role']} to {pattern['to_role']} ({pattern['trajectory_type']}): {pattern['description']}. Common skills: {', '.join(pattern['common_skills'])}. Success factors: {', '.join(pattern['success_factors'])}."
        
        embedding = create_embedding(text)
        
        point = PointStruct(
            id=pattern["id"],
            vector=embedding,
            payload={
                "from_role": pattern["from_role"],
                "to_role": pattern["to_role"],
                "trajectory_type": pattern["trajectory_type"],
                "common_skills": pattern["common_skills"],
                "typical_timeline": pattern["typical_timeline"],
                "success_factors": pattern["success_factors"]
            }
        )
        points.append(point)
    
    qdrant.upsert(
        collection_name="career_trajectory_patterns",
        points=points
    )
    print(f"✅ Seeded {len(points)} career trajectory patterns")

if __name__ == "__main__":
    print("🚀 Setting up Qdrant Career Context Collections...\n")
    
    setup_career_context_collections()
    print()
    
    print("🌱 Seeding initial data...\n")
    seed_work_culture_embeddings()
    seed_career_trajectory_patterns()
    
    print("\n✅ Career context collections ready!")
    print("\nCollections created:")
    print("  1. candidate_career_context - Candidate motivations, interests, goals")
    print("  2. job_career_opportunities - Job growth, culture, learning opportunities")
    print("  3. career_trajectory_patterns - Career progression paths")
    print("  4. work_culture_embeddings - Work environment types")
