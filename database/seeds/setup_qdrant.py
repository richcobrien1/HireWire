#!/usr/bin/env python3
"""
HireWire - Qdrant Vector Database Setup
Created: December 5, 2025

This script initializes Qdrant collections for semantic matching:
1. candidate_profiles - Vector embeddings of candidate bios
2. job_descriptions - Vector embeddings of job descriptions
3. skills_semantic - Vector embeddings of skills for semantic clustering

Usage:
    python setup_qdrant.py

Environment Variables:
    QDRANT_URL (default: http://localhost:6333)
    QDRANT_API_KEY (default: hirewire_qdrant_api_key)
    OPENAI_API_KEY (required for generating test embeddings)
"""

import os
import sys
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

# Configuration
QDRANT_URL = os.getenv('QDRANT_URL', 'http://localhost:6333')
QDRANT_API_KEY = os.getenv('QDRANT_API_KEY', 'hirewire_qdrant_api_key')
EMBEDDING_DIMENSION = 768  # OpenAI text-embedding-3-small dimension


def create_collections(client: QdrantClient):
    """Create all required Qdrant collections."""
    
    print("Creating Qdrant collections...")
    
    # Collection 1: Candidate Profiles
    print("  - Creating 'candidate_profiles' collection...")
    try:
        client.create_collection(
            collection_name="candidate_profiles",
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=Distance.COSINE  # Cosine similarity (0-1, higher = more similar)
            )
        )
        print("    ✓ Created 'candidate_profiles'")
    except Exception as e:
        print(f"    ⚠ Collection may already exist: {e}")
    
    # Collection 2: Job Descriptions
    print("  - Creating 'job_descriptions' collection...")
    try:
        client.create_collection(
            collection_name="job_descriptions",
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=Distance.COSINE
            )
        )
        print("    ✓ Created 'job_descriptions'")
    except Exception as e:
        print(f"    ⚠ Collection may already exist: {e}")
    
    # Collection 3: Skills Semantic (for skill similarity/clustering)
    print("  - Creating 'skills_semantic' collection...")
    try:
        client.create_collection(
            collection_name="skills_semantic",
            vectors_config=VectorParams(
                size=EMBEDDING_DIMENSION,
                distance=Distance.COSINE
            )
        )
        print("    ✓ Created 'skills_semantic'")
    except Exception as e:
        print(f"    ⚠ Collection may already exist: {e}")


def create_test_data(client: QdrantClient):
    """Insert test/sample data (requires OpenAI API key)."""
    
    print("\nInserting sample data...")
    
    # Check for OpenAI API key
    openai_api_key = os.getenv('OPENAI_API_KEY')
    if not openai_api_key:
        print("  ⚠ OPENAI_API_KEY not set. Skipping sample data insertion.")
        print("    Set OPENAI_API_KEY to generate embeddings for test data.")
        return
    
    try:
        from openai import OpenAI
        openai_client = OpenAI(api_key=openai_api_key)
        
        # Sample candidate profile
        print("  - Inserting sample candidate profile...")
        candidate_text = """
        Senior Full Stack Engineer with 20 years of experience building scalable web applications.
        Expert in React, TypeScript, Node.js, and PostgreSQL. Built real-time video platforms using WebRTC.
        Passionate about clean code, mentoring junior developers, and shipping products users love.
        Looking for remote opportunities with fast-paced startups working on innovative products.
        """
        
        candidate_embedding = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=candidate_text
        ).data[0].embedding
        
        client.upsert(
            collection_name="candidate_profiles",
            points=[
                PointStruct(
                    id=1,  # Sample candidate ID
                    vector=candidate_embedding,
                    payload={
                        "candidate_id": 1,
                        "name": "Sample Candidate",
                        "years_experience": 20,
                        "salary_min": 180000,
                        "salary_max": 250000,
                        "location": "Remote",
                        "preferred_locations": ["Remote", "Denver, CO"],
                        "validation_score": 87.5,
                        "skills": ["React", "TypeScript", "Node.js", "PostgreSQL", "WebRTC"],
                        "availability": "2_weeks",
                        "remote_preference": "remote_only"
                    }
                )
            ]
        )
        print("    ✓ Inserted sample candidate")
        
        # Sample job description
        print("  - Inserting sample job description...")
        job_text = """
        Cloudflare is looking for a Senior Full Stack Engineer to build our next-generation edge computing platform.
        You'll work with React, TypeScript, and Go to create blazing-fast web applications that serve millions of users.
        We value engineers who care about performance, security, and developer experience.
        This is a remote position with flexible hours and competitive compensation.
        """
        
        job_embedding = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=job_text
        ).data[0].embedding
        
        client.upsert(
            collection_name="job_descriptions",
            points=[
                PointStruct(
                    id=1,  # Sample job ID
                    vector=job_embedding,
                    payload={
                        "job_id": 1,
                        "company_id": 1,
                        "company_name": "Cloudflare",
                        "title": "Senior Full Stack Engineer",
                        "salary_min": 200000,
                        "salary_max": 260000,
                        "location": "Remote",
                        "locations": ["Remote"],
                        "required_skills": ["React", "TypeScript", "Go"],
                        "nice_to_have_skills": ["WebRTC", "Rust"],
                        "status": "active"
                    }
                )
            ]
        )
        print("    ✓ Inserted sample job")
        
        # Sample skills (for semantic clustering)
        print("  - Inserting sample skills...")
        skills = [
            ("React", "Modern JavaScript framework for building user interfaces"),
            ("Vue.js", "Progressive JavaScript framework for building web interfaces"),
            ("Angular", "TypeScript-based web application framework"),
            ("Node.js", "JavaScript runtime for building server-side applications"),
            ("PostgreSQL", "Advanced open-source relational database"),
            ("MongoDB", "NoSQL document database for modern applications"),
            ("Docker", "Platform for containerizing and running applications"),
            ("Kubernetes", "Container orchestration system for automating deployment"),
        ]
        
        skill_points = []
        for idx, (skill_name, skill_description) in enumerate(skills, start=1):
            embedding = openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=f"{skill_name}: {skill_description}"
            ).data[0].embedding
            
            skill_points.append(
                PointStruct(
                    id=idx,
                    vector=embedding,
                    payload={
                        "skill_id": idx,
                        "skill_name": skill_name,
                        "description": skill_description,
                        "category": "Technology"
                    }
                )
            )
        
        client.upsert(
            collection_name="skills_semantic",
            points=skill_points
        )
        print(f"    ✓ Inserted {len(skills)} sample skills")
        
    except ImportError:
        print("  ⚠ OpenAI library not installed. Run: pip install openai")
    except Exception as e:
        print(f"  ✗ Error inserting sample data: {e}")


def verify_setup(client: QdrantClient):
    """Verify that collections were created successfully."""
    
    print("\nVerifying setup...")
    
    try:
        collections = client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        expected = ["candidate_profiles", "job_descriptions", "skills_semantic"]
        
        for name in expected:
            if name in collection_names:
                info = client.get_collection(name)
                print(f"  ✓ {name}: {info.points_count} points, {info.vectors_count} vectors")
            else:
                print(f"  ✗ {name}: NOT FOUND")
        
        print("\n✓ Qdrant setup complete!")
        
    except Exception as e:
        print(f"  ✗ Error verifying setup: {e}")


def main():
    """Main setup function."""
    
    print("=" * 60)
    print("HireWire - Qdrant Vector Database Setup")
    print("=" * 60)
    print(f"Qdrant URL: {QDRANT_URL}")
    print()
    
    try:
        # Connect to Qdrant
        print("Connecting to Qdrant...")
        client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY
        )
        
        # Test connection
        health = client.health()
        print(f"  ✓ Connected! Health: {health}")
        print()
        
        # Create collections
        create_collections(client)
        
        # Insert sample data (optional, requires OpenAI API key)
        create_test_data(client)
        
        # Verify setup
        verify_setup(client)
        
    except Exception as e:
        print(f"\n✗ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
