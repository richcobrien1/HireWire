"""
Career-Enhanced Matching Algorithm
Created: December 6, 2025
Purpose: Intelligent job matching using career context + skills
"""

import psycopg2
from neo4j import GraphDatabase
from qdrant_client import QdrantClient
from openai import OpenAI
import numpy as np
from typing import Dict, Any, List, Tuple
import os

class CareerEnhancedMatcher:
    """Advanced job matching with career context"""
    
    def __init__(self):
        # Database connections
        self.pg_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="hirewire_dev",
            user="hirewire",
            password="hirewire_dev_password"
        )
        
        self.neo4j_driver = GraphDatabase.driver(
            "bolt://localhost:7687",
            auth=("neo4j", "hirewire_neo4j_password")
        )
        
        self.qdrant = QdrantClient(
            url="http://localhost:6333",
            api_key="hirewire_qdrant_api_key"
        )
        
        self.openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Matching weights (total = 100%)
        self.weights = {
            "skill_overlap": 0.30,      # 30% - Core technical skills
            "career_fit": 0.25,         # 25% - Career goals alignment
            "culture_fit": 0.15,        # 15% - Work environment match
            "learning_opportunities": 0.15,  # 15% - Growth potential
            "motivation_alignment": 0.10,    # 10% - What drives them
            "experience_level": 0.05    # 5% - Years of experience match
        }
    
    def get_candidate_career_profile(self, candidate_id: int) -> Dict[str, Any]:
        """Fetch complete career context from PostgreSQL"""
        cursor = self.pg_conn.cursor()
        
        cursor.execute("""
            SELECT 
                cp.past_motivations,
                cp.proudest_achievements,
                cp.current_interests,
                cp.ideal_work_environment,
                cp.learning_priorities,
                cp.deal_breakers,
                cp.motivations,
                cp.career_trajectory,
                cp.five_year_goals,
                cp.dream_companies,
                cp.skills_to_develop,
                cp.long_term_vision,
                cp.years_experience,
                cp.title
            FROM candidate_profiles cp
            WHERE cp.id = %s
        """, (candidate_id,))
        
        row = cursor.fetchone()
        
        if not row:
            return None
        
        return {
            "past_motivations": row[0] or [],
            "proudest_achievements": row[1] or [],
            "current_interests": row[2] or [],
            "ideal_work_environment": row[3] or "",
            "learning_priorities": row[4] or [],
            "deal_breakers": row[5] or [],
            "motivations": row[6] or [],
            "career_trajectory": row[7] or "",
            "five_year_goals": row[8] or [],
            "dream_companies": row[9] or [],
            "skills_to_develop": row[10] or [],
            "long_term_vision": row[11] or "",
            "years_experience": row[12] or 0,
            "current_title": row[13] or ""
        }
    
    def get_job_opportunities(self, job_id: int) -> Dict[str, Any]:
        """Fetch job details and career opportunities"""
        cursor = self.pg_conn.cursor()
        
        cursor.execute("""
            SELECT 
                j.title,
                j.description,
                j.required_skills,
                j.nice_to_have_skills,
                j.min_experience,
                j.max_experience,
                j.min_salary,
                j.max_salary,
                c.name as company_name,
                c.description as company_description
            FROM jobs j
            JOIN companies c ON c.id = j.company_id
            WHERE j.id = %s
        """, (job_id,))
        
        row = cursor.fetchone()
        
        if not row:
            return None
        
        return {
            "title": row[0],
            "description": row[1],
            "required_skills": row[2] or [],
            "nice_to_have_skills": row[3] or [],
            "min_experience": row[4] or 0,
            "max_experience": row[5] or 20,
            "min_salary": row[6],
            "max_salary": row[7],
            "company_name": row[8],
            "company_description": row[9]
        }
    
    def calculate_skill_overlap(
        self,
        candidate_profile: Dict[str, Any],
        job: Dict[str, Any]
    ) -> float:
        """Calculate traditional skill match (30% weight)"""
        # This would integrate with existing skill matching logic
        # For now, return placeholder
        return 0.85
    
    def calculate_career_fit(
        self,
        candidate_profile: Dict[str, Any],
        job: Dict[str, Any]
    ) -> Tuple[float, str]:
        """Calculate career trajectory alignment (25% weight)"""
        score = 0.0
        reasons = []
        
        # Check if job title aligns with 5-year goals
        five_year_goals = candidate_profile.get("five_year_goals", [])
        job_title = job["title"].lower()
        
        for goal in five_year_goals:
            if goal.lower() in job_title or job_title in goal.lower():
                score += 0.4
                reasons.append(f"Job title matches 5-year goal: {goal}")
                break
        
        # Check trajectory alignment using Neo4j
        trajectory = candidate_profile.get("career_trajectory", "")
        
        if trajectory:
            with self.neo4j_driver.session() as session:
                result = session.run("""
                    MATCH (t:CareerTrajectory {key: $trajectory})
                    RETURN t.typical_roles as roles
                """, trajectory=trajectory).single()
                
                if result and result["roles"]:
                    typical_roles = result["roles"]
                    for role in typical_roles:
                        if role.lower() in job_title:
                            score += 0.3
                            reasons.append(f"Aligns with {trajectory} path")
                            break
        
        # Check learning opportunities match skills to develop
        skills_to_develop = candidate_profile.get("skills_to_develop", [])
        nice_to_have = job.get("nice_to_have_skills", [])
        
        learning_match = len(set(skills_to_develop) & set(nice_to_have))
        if learning_match > 0:
            score += min(0.3, learning_match * 0.1)
            reasons.append(f"Offers learning in {learning_match} desired skills")
        
        return min(score, 1.0), " | ".join(reasons)
    
    def calculate_culture_fit(
        self,
        candidate_profile: Dict[str, Any],
        job: Dict[str, Any]
    ) -> Tuple[float, str]:
        """Calculate work culture alignment (15% weight)"""
        ideal_env = candidate_profile.get("ideal_work_environment", "")
        
        if not ideal_env:
            return 0.5, "No culture preference specified"
        
        # Use Qdrant to find similar work cultures
        try:
            # Create embedding of candidate's ideal environment
            embedding_response = self.openai.embeddings.create(
                model="text-embedding-3-small",
                input=ideal_env
            )
            
            ideal_env_embedding = embedding_response.data[0].embedding
            
            # Search for similar work cultures
            search_results = self.qdrant.search(
                collection_name="work_culture_embeddings",
                query_vector=ideal_env_embedding,
                limit=3
            )
            
            if search_results:
                top_match = search_results[0]
                score = top_match.score
                culture_type = top_match.payload.get("culture_type", "")
                
                return score, f"Matches {culture_type} culture"
            
        except Exception as e:
            print(f"Culture fit calculation error: {e}")
        
        return 0.5, "Culture fit calculation unavailable"
    
    def calculate_learning_opportunities(
        self,
        candidate_profile: Dict[str, Any],
        job: Dict[str, Any]
    ) -> Tuple[float, str]:
        """Calculate growth and learning potential (15% weight)"""
        score = 0.0
        reasons = []
        
        skills_to_develop = set(candidate_profile.get("skills_to_develop", []))
        required_skills = set(job.get("required_skills", []))
        nice_to_have = set(job.get("nice_to_have_skills", []))
        
        # Skills they'll learn (in job but not mastered)
        learning_opportunities = (required_skills | nice_to_have) & skills_to_develop
        
        if learning_opportunities:
            score = min(len(learning_opportunities) * 0.25, 1.0)
            reasons.append(f"Learn {len(learning_opportunities)} desired skills")
        
        # Check if it's a growth opportunity (title progression)
        current_title = candidate_profile.get("current_title", "").lower()
        job_title = job["title"].lower()
        
        if "senior" in job_title and "senior" not in current_title:
            score += 0.2
            reasons.append("Step up to senior role")
        elif "staff" in job_title or "principal" in job_title:
            score += 0.2
            reasons.append("Advanced IC opportunity")
        
        return min(score, 1.0), " | ".join(reasons) if reasons else "Limited learning opportunities"
    
    def calculate_motivation_alignment(
        self,
        candidate_profile: Dict[str, Any],
        job: Dict[str, Any]
    ) -> Tuple[float, str]:
        """Calculate motivation-job alignment (10% weight)"""
        motivations = candidate_profile.get("motivations", [])
        
        if not motivations:
            return 0.5, "No motivations specified"
        
        score = 0.0
        matched = []
        
        job_description = job["description"].lower()
        company_description = job.get("company_description", "").lower()
        
        # Map motivations to job description keywords
        motivation_keywords = {
            "Technical challenges": ["complex", "challenging", "scale", "distributed", "architecture"],
            "Career growth": ["growth", "mentorship", "learning", "development", "advance"],
            "Making an impact": ["impact", "users", "mission", "change", "difference"],
            "Work-life balance": ["balance", "flexible", "remote", "hours", "pto"],
            "Team collaboration": ["team", "collaborative", "agile", "pair programming"],
            "Company mission": ["mission", "vision", "purpose", "values"],
            "Autonomy and ownership": ["ownership", "autonomy", "independent", "self-directed"],
            "Financial compensation": ["competitive", "equity", "stock", "options", "benefits"]
        }
        
        for motivation in motivations:
            keywords = motivation_keywords.get(motivation, [])
            for keyword in keywords:
                if keyword in job_description or keyword in company_description:
                    score += 0.3
                    matched.append(motivation)
                    break
        
        return min(score, 1.0), f"Aligns with: {', '.join(matched)}" if matched else "Limited motivation match"
    
    def calculate_match_score(
        self,
        candidate_id: int,
        job_id: int
    ) -> Dict[str, Any]:
        """Calculate comprehensive match score with career context"""
        
        # Fetch data
        candidate = self.get_candidate_career_profile(candidate_id)
        job = self.get_job_opportunities(job_id)
        
        if not candidate or not job:
            return None
        
        # Calculate component scores
        skill_score = self.calculate_skill_overlap(candidate, job)
        career_fit_score, career_reason = self.calculate_career_fit(candidate, job)
        culture_score, culture_reason = self.calculate_culture_fit(candidate, job)
        learning_score, learning_reason = self.calculate_learning_opportunities(candidate, job)
        motivation_score, motivation_reason = self.calculate_motivation_alignment(candidate, job)
        
        # Experience match (simple for now)
        exp_diff = abs(candidate["years_experience"] - job.get("min_experience", 0))
        experience_score = max(0, 1 - (exp_diff / 10))
        
        # Weighted total
        total_score = (
            skill_score * self.weights["skill_overlap"] +
            career_fit_score * self.weights["career_fit"] +
            culture_score * self.weights["culture_fit"] +
            learning_score * self.weights["learning_opportunities"] +
            motivation_score * self.weights["motivation_alignment"] +
            experience_score * self.weights["experience_level"]
        )
        
        return {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "job_title": job["title"],
            "company_name": job["company_name"],
            "overall_score": round(total_score, 3),
            "breakdown": {
                "skill_match": round(skill_score, 3),
                "career_fit": round(career_fit_score, 3),
                "culture_fit": round(culture_score, 3),
                "learning_opportunities": round(learning_score, 3),
                "motivation_alignment": round(motivation_score, 3),
                "experience_match": round(experience_score, 3)
            },
            "reasons": {
                "career": career_reason,
                "culture": culture_reason,
                "learning": learning_reason,
                "motivation": motivation_reason
            },
            "recommendation": self._get_recommendation(total_score)
        }
    
    def _get_recommendation(self, score: float) -> str:
        """Get human-readable recommendation"""
        if score >= 0.85:
            return "🔥 Excellent match - Highly recommended"
        elif score >= 0.70:
            return "✅ Strong match - Good fit"
        elif score >= 0.55:
            return "👍 Moderate match - Worth considering"
        else:
            return "🤔 Weak match - May not be ideal"
    
    def find_best_matches(
        self,
        candidate_id: int,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Find top job matches for candidate using career context"""
        
        cursor = self.pg_conn.cursor()
        
        # Get all active jobs
        cursor.execute("""
            SELECT id FROM jobs WHERE status = 'active'
        """)
        
        job_ids = [row[0] for row in cursor.fetchall()]
        
        # Calculate scores for all jobs
        matches = []
        for job_id in job_ids:
            score = self.calculate_match_score(candidate_id, job_id)
            if score:
                matches.append(score)
        
        # Sort by overall score
        matches.sort(key=lambda x: x["overall_score"], reverse=True)
        
        return matches[:limit]

# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    matcher = CareerEnhancedMatcher()
    
    print("🎯 Career-Enhanced Matching Algorithm Demo")
    print("=" * 60)
    
    # Example: Calculate match for specific candidate-job pair
    candidate_id = 1
    job_id = 1
    
    print(f"\nCalculating match for Candidate {candidate_id} and Job {job_id}...")
    
    result = matcher.calculate_match_score(candidate_id, job_id)
    
    if result:
        print(f"\n📊 Match Result:")
        print(f"   Job: {result['job_title']} at {result['company_name']}")
        print(f"   Overall Score: {result['overall_score']} - {result['recommendation']}")
        print(f"\n   Breakdown:")
        for component, score in result['breakdown'].items():
            print(f"     • {component}: {score}")
        print(f"\n   Why this match:")
        for reason_type, reason in result['reasons'].items():
            if reason:
                print(f"     • {reason_type.title()}: {reason}")
    else:
        print("❌ No match data available")
