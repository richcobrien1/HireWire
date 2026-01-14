"""
Redis Cache Patterns for Career Context Matching
Created: December 6, 2025
Purpose: Cache strategies for career-based match results
"""

import redis
import json
from typing import List, Dict, Any, Optional
from datetime import timedelta

class CareerContextCache:
    """Redis caching for career context and matching"""
    
    def __init__(self):
        self.redis = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True
        )
        
        # Cache TTLs
        self.TTL_CAREER_PROFILE = 3600  # 1 hour
        self.TTL_CAREER_MATCHES = 1800  # 30 minutes
        self.TTL_CULTURE_FIT = 3600  # 1 hour
        self.TTL_TRAJECTORY_MATCHES = 3600  # 1 hour
        self.TTL_LEARNING_OPPORTUNITIES = 1800  # 30 minutes
    
    # =============================================================================
    # CAREER PROFILE CACHING
    # =============================================================================
    
    def cache_career_profile(self, candidate_id: int, profile: Dict[str, Any]) -> None:
        """Cache complete career context profile"""
        key = f"career:profile:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_CAREER_PROFILE,
            json.dumps(profile)
        )
    
    def get_career_profile(self, candidate_id: int) -> Optional[Dict[str, Any]]:
        """Get cached career profile"""
        key = f"career:profile:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def cache_career_summary(self, candidate_id: int, summary: str) -> None:
        """Cache AI-generated career summary"""
        key = f"career:summary:{candidate_id}"
        self.redis.setex(key, self.TTL_CAREER_PROFILE, summary)
    
    def get_career_summary(self, candidate_id: int) -> Optional[str]:
        """Get cached career summary"""
        key = f"career:summary:{candidate_id}"
        return self.redis.get(key)
    
    # =============================================================================
    # CAREER-BASED MATCH CACHING
    # =============================================================================
    
    def cache_career_matches(
        self, 
        candidate_id: int, 
        matches: List[Dict[str, Any]]
    ) -> None:
        """Cache career-fit matches for candidate"""
        key = f"career:matches:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_CAREER_MATCHES,
            json.dumps(matches)
        )
    
    def get_career_matches(self, candidate_id: int) -> Optional[List[Dict[str, Any]]]:
        """Get cached career matches"""
        key = f"career:matches:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def cache_match_score_breakdown(
        self,
        candidate_id: int,
        job_id: int,
        breakdown: Dict[str, float]
    ) -> None:
        """Cache detailed match score breakdown"""
        key = f"career:match_breakdown:{candidate_id}:{job_id}"
        self.redis.setex(
            key,
            self.TTL_CAREER_MATCHES,
            json.dumps(breakdown)
        )
    
    def get_match_score_breakdown(
        self,
        candidate_id: int,
        job_id: int
    ) -> Optional[Dict[str, float]]:
        """Get cached match score breakdown"""
        key = f"career:match_breakdown:{candidate_id}:{job_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    # =============================================================================
    # CULTURE FIT CACHING
    # =============================================================================
    
    def cache_culture_fit_scores(
        self,
        candidate_id: int,
        company_scores: Dict[int, float]
    ) -> None:
        """Cache culture fit scores for all companies"""
        key = f"career:culture_fit:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_CULTURE_FIT,
            json.dumps(company_scores)
        )
    
    def get_culture_fit_scores(
        self,
        candidate_id: int
    ) -> Optional[Dict[int, float]]:
        """Get cached culture fit scores"""
        key = f"career:culture_fit:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def cache_culture_explanation(
        self,
        candidate_id: int,
        company_id: int,
        explanation: str
    ) -> None:
        """Cache AI-generated culture fit explanation"""
        key = f"career:culture_explain:{candidate_id}:{company_id}"
        self.redis.setex(key, self.TTL_CULTURE_FIT, explanation)
    
    def get_culture_explanation(
        self,
        candidate_id: int,
        company_id: int
    ) -> Optional[str]:
        """Get cached culture fit explanation"""
        key = f"career:culture_explain:{candidate_id}:{company_id}"
        return self.redis.get(key)
    
    # =============================================================================
    # CAREER TRAJECTORY CACHING
    # =============================================================================
    
    def cache_trajectory_matches(
        self,
        candidate_id: int,
        trajectory: str,
        similar_candidates: List[int]
    ) -> None:
        """Cache candidates with similar trajectory"""
        key = f"career:trajectory:{trajectory}:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_TRAJECTORY_MATCHES,
            json.dumps(similar_candidates)
        )
    
    def get_trajectory_matches(
        self,
        candidate_id: int,
        trajectory: str
    ) -> Optional[List[int]]:
        """Get candidates with similar trajectory"""
        key = f"career:trajectory:{trajectory}:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def cache_trajectory_insights(
        self,
        candidate_id: int,
        insights: Dict[str, Any]
    ) -> None:
        """Cache AI-generated trajectory insights"""
        key = f"career:trajectory_insights:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_TRAJECTORY_MATCHES,
            json.dumps(insights)
        )
    
    def get_trajectory_insights(
        self,
        candidate_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get cached trajectory insights"""
        key = f"career:trajectory_insights:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    # =============================================================================
    # LEARNING OPPORTUNITIES CACHING
    # =============================================================================
    
    def cache_learning_opportunities(
        self,
        candidate_id: int,
        opportunities: List[Dict[str, Any]]
    ) -> None:
        """Cache jobs offering desired learning opportunities"""
        key = f"career:learning_opps:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_LEARNING_OPPORTUNITIES,
            json.dumps(opportunities)
        )
    
    def get_learning_opportunities(
        self,
        candidate_id: int
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached learning opportunities"""
        key = f"career:learning_opps:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def cache_skill_gap_analysis(
        self,
        candidate_id: int,
        job_id: int,
        analysis: Dict[str, Any]
    ) -> None:
        """Cache skill gap analysis for candidate-job pair"""
        key = f"career:skill_gap:{candidate_id}:{job_id}"
        self.redis.setex(
            key,
            self.TTL_LEARNING_OPPORTUNITIES,
            json.dumps(analysis)
        )
    
    def get_skill_gap_analysis(
        self,
        candidate_id: int,
        job_id: int
    ) -> Optional[Dict[str, Any]]:
        """Get cached skill gap analysis"""
        key = f"career:skill_gap:{candidate_id}:{job_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    # =============================================================================
    # MOTIVATION ALIGNMENT CACHING
    # =============================================================================
    
    def cache_motivation_matches(
        self,
        candidate_id: int,
        jobs_by_motivation: Dict[str, List[int]]
    ) -> None:
        """Cache jobs aligned with candidate motivations"""
        key = f"career:motivation_matches:{candidate_id}"
        self.redis.setex(
            key,
            self.TTL_CAREER_MATCHES,
            json.dumps(jobs_by_motivation)
        )
    
    def get_motivation_matches(
        self,
        candidate_id: int
    ) -> Optional[Dict[str, List[int]]]:
        """Get cached motivation-aligned jobs"""
        key = f"career:motivation_matches:{candidate_id}"
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    # =============================================================================
    # CACHE INVALIDATION
    # =============================================================================
    
    def invalidate_candidate_career_cache(self, candidate_id: int) -> None:
        """Invalidate all career-related caches for candidate"""
        patterns = [
            f"career:profile:{candidate_id}",
            f"career:summary:{candidate_id}",
            f"career:matches:{candidate_id}",
            f"career:match_breakdown:{candidate_id}:*",
            f"career:culture_fit:{candidate_id}",
            f"career:culture_explain:{candidate_id}:*",
            f"career:trajectory:*:{candidate_id}",
            f"career:trajectory_insights:{candidate_id}",
            f"career:learning_opps:{candidate_id}",
            f"career:skill_gap:{candidate_id}:*",
            f"career:motivation_matches:{candidate_id}"
        ]
        
        for pattern in patterns:
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
    
    def invalidate_job_career_cache(self, job_id: int) -> None:
        """Invalidate all career-related caches for job"""
        patterns = [
            f"career:match_breakdown:*:{job_id}",
            f"career:skill_gap:*:{job_id}"
        ]
        
        for pattern in patterns:
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
    
    # =============================================================================
    # REAL-TIME COUNTERS
    # =============================================================================
    
    def increment_career_profile_completeness(self, candidate_id: int) -> int:
        """Track career profile completeness updates"""
        key = f"career:profile_updates:{candidate_id}"
        return self.redis.incr(key)
    
    def track_career_context_usage(self, feature: str) -> None:
        """Track which career features are used most"""
        key = f"career:feature_usage:{feature}"
        self.redis.incr(key)
        self.redis.expire(key, 86400)  # 24 hours
    
    def get_career_feature_stats(self) -> Dict[str, int]:
        """Get career feature usage stats"""
        keys = self.redis.keys("career:feature_usage:*")
        stats = {}
        for key in keys:
            feature = key.split(":")[-1]
            stats[feature] = int(self.redis.get(key) or 0)
        return stats

# =============================================================================
# EXAMPLE USAGE
# =============================================================================

if __name__ == "__main__":
    cache = CareerContextCache()
    
    # Example: Cache career profile
    profile = {
        "candidate_id": 123,
        "past_motivations": ["Learning new technologies", "Building user-facing products"],
        "current_interests": ["AI/ML", "System design"],
        "career_trajectory": "individual_contributor",
        "five_year_goals": ["Staff Engineer", "Open source contributor"],
        "ideal_work_environment": "Remote-first, small team, high autonomy",
        "skills_to_develop": ["Rust", "Distributed systems"],
        "motivations": ["Technical challenges", "Work-life balance"]
    }
    
    cache.cache_career_profile(123, profile)
    print("✅ Cached career profile")
    
    # Example: Cache match breakdown
    breakdown = {
        "skill_match": 0.85,
        "career_fit": 0.92,
        "culture_fit": 0.88,
        "learning_opportunities": 0.95,
        "motivation_alignment": 0.90,
        "trajectory_match": 0.87,
        "overall_score": 0.89
    }
    
    cache.cache_match_score_breakdown(123, 456, breakdown)
    print("✅ Cached match breakdown")
    
    # Example: Track feature usage
    cache.track_career_context_usage("culture_fit_scoring")
    cache.track_career_context_usage("learning_opportunities")
    cache.track_career_context_usage("trajectory_matching")
    
    stats = cache.get_career_feature_stats()
    print(f"✅ Feature stats: {stats}")
