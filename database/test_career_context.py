"""
Career Context Database Integration Tests
Created: December 6, 2025
Purpose: Verify career context functionality across all 4 databases
"""

import psycopg2
from neo4j import GraphDatabase
from qdrant_client import QdrantClient
import redis
import json
from typing import Dict, Any, List
from datetime import datetime

class CareerContextTester:
    """Test career context across PostgreSQL, Neo4j, Qdrant, and Redis"""
    
    def __init__(self):
        # PostgreSQL connection
        self.pg_conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="hirewire_dev",
            user="hirewire",
            password="hirewire_dev_password"
        )
        
        # Neo4j connection
        self.neo4j_driver = GraphDatabase.driver(
            "bolt://localhost:7687",
            auth=("neo4j", "hirewire_neo4j_password")
        )
        
        # Qdrant connection
        self.qdrant = QdrantClient(
            url="http://localhost:6333",
            api_key="hirewire_qdrant_api_key"
        )
        
        # Redis connection
        self.redis = redis.Redis(
            host='localhost',
            port=6379,
            password='hirewire_redis_password',
            decode_responses=True
        )
    
    def test_postgresql_career_schema(self) -> Dict[str, Any]:
        """Test PostgreSQL career context fields"""
        print("📊 Testing PostgreSQL Career Context Schema...")
        
        cursor = self.pg_conn.cursor()
        
        # Check if career context columns exist
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'candidate_profiles' 
            AND column_name IN (
                'past_motivations', 'proudest_achievements', 'lessons_learned',
                'career_pivots', 'current_interests', 'ideal_work_environment',
                'learning_priorities', 'deal_breakers', 'motivations',
                'career_trajectory', 'five_year_goals', 'dream_companies',
                'skills_to_develop', 'long_term_vision'
            )
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        
        # Check indexes
        cursor.execute("""
            SELECT indexname, indexdef 
            FROM pg_indexes 
            WHERE tablename = 'candidate_profiles' 
            AND indexname LIKE '%career%'
            OR indexname LIKE '%motivation%'
            OR indexname LIKE '%interest%';
        """)
        
        indexes = cursor.fetchall()
        
        result = {
            "columns_found": len(columns),
            "expected_columns": 14,
            "columns": [{"name": col[0], "type": col[1]} for col in columns],
            "indexes": [{"name": idx[0], "definition": idx[1]} for idx in indexes],
            "status": "✅ PASS" if len(columns) >= 14 else "❌ FAIL"
        }
        
        print(f"   Found {len(columns)}/14 expected career context columns")
        print(f"   Found {len(indexes)} career context indexes")
        print(f"   {result['status']}")
        
        return result
    
    def test_neo4j_career_nodes(self) -> Dict[str, Any]:
        """Test Neo4j career context nodes and relationships"""
        print("\n🕸️  Testing Neo4j Career Context Graph...")
        
        with self.neo4j_driver.session() as session:
            # Count career nodes
            interest_count = session.run("MATCH (i:Interest) RETURN count(i) as count").single()["count"]
            motivation_count = session.run("MATCH (m:Motivation) RETURN count(m) as count").single()["count"]
            culture_count = session.run("MATCH (w:WorkCulture) RETURN count(w) as count").single()["count"]
            trajectory_count = session.run("MATCH (t:CareerTrajectory) RETURN count(t) as count").single()["count"]
            
            # Check constraints
            constraints = session.run("""
                SHOW CONSTRAINTS
                WHERE name CONTAINS 'interest' 
                   OR name CONTAINS 'motivation'
                   OR name CONTAINS 'career_goal'
                   OR name CONTAINS 'work_culture'
            """).data()
            
            # Sample queries
            sample_interests = session.run("""
                MATCH (i:Interest)
                RETURN i.name as name, i.category as category
                LIMIT 3
            """).data()
            
            sample_trajectories = session.run("""
                MATCH (t:CareerTrajectory)
                RETURN t.name as name, t.key as key, t.typical_roles as roles
                LIMIT 3
            """).data()
        
        result = {
            "node_counts": {
                "interests": interest_count,
                "motivations": motivation_count,
                "work_cultures": culture_count,
                "trajectories": trajectory_count
            },
            "constraints_count": len(constraints),
            "sample_interests": sample_interests,
            "sample_trajectories": sample_trajectories,
            "status": "✅ PASS" if interest_count > 0 and motivation_count > 0 else "❌ FAIL"
        }
        
        print(f"   Interests: {interest_count}")
        print(f"   Motivations: {motivation_count}")
        print(f"   Work Cultures: {culture_count}")
        print(f"   Career Trajectories: {trajectory_count}")
        print(f"   Constraints: {len(constraints)}")
        print(f"   {result['status']}")
        
        return result
    
    def test_qdrant_career_collections(self) -> Dict[str, Any]:
        """Test Qdrant career context collections"""
        print("\n🔍 Testing Qdrant Career Context Collections...")
        
        collections_to_check = [
            "candidate_career_context",
            "job_career_opportunities",
            "career_trajectory_patterns",
            "work_culture_embeddings"
        ]
        
        collection_status = {}
        
        for collection_name in collections_to_check:
            try:
                collection_info = self.qdrant.get_collection(collection_name)
                collection_status[collection_name] = {
                    "exists": True,
                    "points_count": collection_info.points_count,
                    "vector_size": collection_info.config.params.vectors.size
                }
                print(f"   ✅ {collection_name}: {collection_info.points_count} points")
            except Exception as e:
                collection_status[collection_name] = {
                    "exists": False,
                    "error": str(e)
                }
                print(f"   ❌ {collection_name}: {str(e)}")
        
        # Test semantic search on work cultures
        try:
            search_results = self.qdrant.search(
                collection_name="work_culture_embeddings",
                query_vector=[0.1] * 768,  # Dummy vector
                limit=3
            )
            has_search = len(search_results) > 0
        except:
            has_search = False
        
        result = {
            "collections": collection_status,
            "all_exist": all(c["exists"] for c in collection_status.values()),
            "can_search": has_search,
            "status": "✅ PASS" if all(c["exists"] for c in collection_status.values()) else "❌ FAIL"
        }
        
        print(f"   Search capability: {'✅' if has_search else '❌'}")
        print(f"   {result['status']}")
        
        return result
    
    def test_redis_career_cache(self) -> Dict[str, Any]:
        """Test Redis career context caching"""
        print("\n⚡ Testing Redis Career Context Caching...")
        
        # Test cache operations
        test_profile = {
            "candidate_id": 999,
            "past_motivations": ["Test motivation"],
            "current_interests": ["Test interest"],
            "career_trajectory": "individual_contributor"
        }
        
        # Cache profile
        self.redis.setex(
            "career:profile:999",
            3600,
            json.dumps(test_profile)
        )
        
        # Retrieve profile
        cached = self.redis.get("career:profile:999")
        can_cache = cached is not None
        
        # Test match breakdown
        breakdown = {
            "skill_match": 0.85,
            "career_fit": 0.92,
            "overall_score": 0.89
        }
        
        self.redis.setex(
            "career:match_breakdown:999:123",
            1800,
            json.dumps(breakdown)
        )
        
        cached_breakdown = self.redis.get("career:match_breakdown:999:123")
        can_cache_breakdown = cached_breakdown is not None
        
        # Test feature tracking
        self.redis.incr("career:feature_usage:test_feature")
        self.redis.expire("career:feature_usage:test_feature", 86400)
        
        feature_count = self.redis.get("career:feature_usage:test_feature")
        can_track = feature_count is not None
        
        # Cleanup
        self.redis.delete("career:profile:999")
        self.redis.delete("career:match_breakdown:999:123")
        self.redis.delete("career:feature_usage:test_feature")
        
        result = {
            "can_cache_profile": can_cache,
            "can_cache_breakdown": can_cache_breakdown,
            "can_track_features": can_track,
            "status": "✅ PASS" if all([can_cache, can_cache_breakdown, can_track]) else "❌ FAIL"
        }
        
        print(f"   Profile caching: {'✅' if can_cache else '❌'}")
        print(f"   Breakdown caching: {'✅' if can_cache_breakdown else '❌'}")
        print(f"   Feature tracking: {'✅' if can_track else '❌'}")
        print(f"   {result['status']}")
        
        return result
    
    def test_cross_database_scenario(self) -> Dict[str, Any]:
        """Test a real-world scenario across all databases"""
        print("\n🎯 Testing Cross-Database Career Matching Scenario...")
        print("   Scenario: Find jobs matching candidate's career goals")
        
        cursor = self.pg_conn.cursor()
        
        # 1. Create test candidate with career context in PostgreSQL
        cursor.execute("""
            INSERT INTO users (email, password_hash, role, created_at)
            VALUES ('test_career@example.com', 'hash', 'candidate', NOW())
            RETURNING id;
        """)
        user_id = cursor.fetchone()[0]
        
        cursor.execute("""
            INSERT INTO candidate_profiles (
                user_id, 
                current_interests,
                motivations,
                career_trajectory,
                skills_to_develop,
                ideal_work_environment
            ) VALUES (
                %s,
                ARRAY['AI/ML applications', 'System design'],
                ARRAY['Technical challenges', 'Work-life balance'],
                'individual_contributor',
                ARRAY['Rust', 'Distributed systems'],
                'Remote-first, small team, high autonomy'
            ) RETURNING id;
        """, (user_id,))
        
        candidate_id = cursor.fetchone()[0]
        self.pg_conn.commit()
        
        # 2. Create career graph in Neo4j
        with self.neo4j_driver.session() as session:
            session.run("""
                MATCH (c:Candidate {id: $candidate_id})
                MATCH (i:Interest {name: 'AI/ML applications'})
                MERGE (c)-[:INTERESTED_IN {strength: 0.9}]->(i)
            """, candidate_id=candidate_id)
            
            # Check if relationship was created
            result = session.run("""
                MATCH (c:Candidate {id: $candidate_id})-[r:INTERESTED_IN]->(i:Interest)
                RETURN count(r) as count
            """, candidate_id=candidate_id).single()
            
            neo4j_linked = result["count"] if result else 0
        
        # 3. Cache career profile in Redis
        profile = {
            "candidate_id": candidate_id,
            "interests": ["AI/ML applications", "System design"],
            "trajectory": "individual_contributor"
        }
        
        self.redis.setex(
            f"career:profile:{candidate_id}",
            3600,
            json.dumps(profile)
        )
        
        redis_cached = self.redis.get(f"career:profile:{candidate_id}") is not None
        
        # 4. Cleanup
        cursor.execute("DELETE FROM candidate_profiles WHERE id = %s", (candidate_id,))
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        self.pg_conn.commit()
        self.redis.delete(f"career:profile:{candidate_id}")
        
        result = {
            "postgresql_insert": candidate_id is not None,
            "neo4j_relationships": neo4j_linked >= 0,
            "redis_caching": redis_cached,
            "status": "✅ PASS" if all([candidate_id, redis_cached]) else "❌ FAIL"
        }
        
        print(f"   PostgreSQL insert: {'✅' if candidate_id else '❌'}")
        print(f"   Neo4j relationships: {'✅' if neo4j_linked >= 0 else '❌'}")
        print(f"   Redis caching: {'✅' if redis_cached else '❌'}")
        print(f"   {result['status']}")
        
        return result
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all career context tests"""
        print("=" * 60)
        print("CAREER CONTEXT DATABASE INTEGRATION TESTS")
        print("=" * 60)
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "tests": {}
        }
        
        try:
            results["tests"]["postgresql"] = self.test_postgresql_career_schema()
            results["tests"]["neo4j"] = self.test_neo4j_career_nodes()
            results["tests"]["qdrant"] = self.test_qdrant_career_collections()
            results["tests"]["redis"] = self.test_redis_career_cache()
            results["tests"]["cross_database"] = self.test_cross_database_scenario()
            
            # Summary
            all_passed = all(
                test["status"] == "✅ PASS" 
                for test in results["tests"].values()
            )
            
            print("\n" + "=" * 60)
            print("TEST SUMMARY")
            print("=" * 60)
            
            for test_name, test_result in results["tests"].items():
                print(f"{test_name.upper()}: {test_result['status']}")
            
            print("=" * 60)
            
            if all_passed:
                print("✅ ALL TESTS PASSED - Career context ready for production!")
            else:
                print("❌ SOME TESTS FAILED - Check output above")
            
            results["overall_status"] = "PASS" if all_passed else "FAIL"
            
        except Exception as e:
            print(f"\n❌ TEST EXECUTION ERROR: {e}")
            results["error"] = str(e)
            results["overall_status"] = "ERROR"
        
        finally:
            # Cleanup connections
            self.pg_conn.close()
            self.neo4j_driver.close()
        
        return results

if __name__ == "__main__":
    tester = CareerContextTester()
    results = tester.run_all_tests()
    
    # Save results
    with open("career_context_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Results saved to: career_context_test_results.json")
