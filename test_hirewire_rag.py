#!/usr/bin/env python3
"""
Test HireWire RAG Archive Integration

Quick test to verify:
1. Archive system initialization
2. Resume archiving functionality
3. Semantic search capabilities
4. ChromaDB integration
"""

from hirewire_archive import HireWireArchive
import json


def test_hirewire_rag():
    """Test HireWire RAG archive system"""
    
    print("=" * 60)
    print("🧪 Testing HireWire RAG Archive System")
    print("=" * 60)
    
    # Test 1: Initialize archive
    print("\n📦 Test 1: Initialize Archive System")
    try:
        archive = HireWireArchive(enable_rag=True)
        print("✅ Archive initialized successfully")
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
        return
    
    # Test 2: Archive sample resumes
    print("\n📄 Test 2: Archive Sample Resumes")
    
    test_resumes = [
        {
            "data": {
                "name": "Sarah Chen",
                "email": "sarah.chen@example.com",
                "phone": "555-0101",
                "skills": ["Python", "FastAPI", "Docker", "Kubernetes", "PostgreSQL", "React"],
                "experience": [
                    {
                        "title": "Senior Full Stack Engineer",
                        "company": "CloudTech Solutions",
                        "duration": "2022-2025",
                        "description": "Led development of microservices architecture using FastAPI and Docker. Implemented CI/CD pipelines with Kubernetes deployment."
                    },
                    {
                        "title": "Backend Developer",
                        "company": "StartupXYZ",
                        "duration": "2020-2022",
                        "description": "Built REST APIs with Python and PostgreSQL. Developed real-time data processing pipelines."
                    }
                ],
                "education": [
                    {
                        "degree": "BS Computer Science",
                        "school": "University of California",
                        "year": "2020"
                    }
                ]
            },
            "name": "Sarah Chen",
            "source": "website_upload"
        },
        {
            "data": {
                "name": "Michael Rodriguez",
                "email": "m.rodriguez@example.com",
                "phone": "555-0102",
                "skills": ["JavaScript", "React", "Node.js", "TypeScript", "AWS", "GraphQL"],
                "experience": [
                    {
                        "title": "Frontend Engineer",
                        "company": "Digital Media Corp",
                        "duration": "2021-2025",
                        "description": "Built responsive web applications with React and TypeScript. Implemented GraphQL APIs for data fetching."
                    },
                    {
                        "title": "Junior Developer",
                        "company": "WebDev Agency",
                        "duration": "2019-2021",
                        "description": "Developed client websites using modern JavaScript frameworks."
                    }
                ],
                "education": [
                    {
                        "degree": "BS Software Engineering",
                        "school": "Texas A&M University",
                        "year": "2019"
                    }
                ]
            },
            "name": "Michael Rodriguez",
            "source": "linkedin_import"
        },
        {
            "data": {
                "name": "Emily Watson",
                "email": "emily.w@example.com",
                "phone": "555-0103",
                "skills": ["Java", "Spring Boot", "Microservices", "AWS", "MongoDB", "Jenkins"],
                "experience": [
                    {
                        "title": "Senior Backend Engineer",
                        "company": "Enterprise Solutions Inc",
                        "duration": "2020-2025",
                        "description": "Designed and implemented scalable microservices using Spring Boot. Managed AWS infrastructure and MongoDB databases."
                    },
                    {
                        "title": "Software Engineer",
                        "company": "Tech Innovations",
                        "duration": "2017-2020",
                        "description": "Developed enterprise applications with Java and Spring framework."
                    }
                ],
                "education": [
                    {
                        "degree": "MS Computer Science",
                        "school": "Stanford University",
                        "year": "2017"
                    }
                ]
            },
            "name": "Emily Watson",
            "source": "website_upload"
        }
    ]
    
    archived_count = 0
    for resume in test_resumes:
        try:
            archive_path = archive.archive_parsed_resume(
                resume["data"],
                resume["name"],
                resume["source"]
            )
            archived_count += 1
            print(f"  ✅ Archived: {resume['name']} ({resume['source']})")
        except Exception as e:
            print(f"  ❌ Failed to archive {resume['name']}: {e}")
    
    print(f"\n📊 Archived {archived_count}/{len(test_resumes)} resumes")
    
    # Test 3: Semantic search
    print("\n🔍 Test 3: Semantic Search Queries")
    
    test_queries = [
        "Python backend engineer with Docker experience",
        "React and TypeScript frontend developer",
        "Microservices architecture and AWS",
        "Full stack developer with PostgreSQL"
    ]
    
    for query in test_queries:
        try:
            results = archive.search_resumes(query, n_results=3)
            print(f"\n  Query: '{query}'")
            print(f"  Results: {len(results)} matches")
            for i, result in enumerate(results[:2], 1):
                metadata = result.get('metadata', {})
                desc = metadata.get('description', 'Unknown')
                print(f"    {i}. {desc}")
        except Exception as e:
            print(f"  ❌ Search failed for '{query}': {e}")
    
    # Test 4: Candidate history
    print("\n📚 Test 4: Candidate History Lookup")
    try:
        history = archive.get_candidate_history("Sarah Chen")
        print(f"  Found {len(history)} version(s) for Sarah Chen")
        for version in history:
            print(f"    - {version.get('timestamp', 'Unknown time')}: {version.get('description', 'No desc')}")
    except Exception as e:
        print(f"  ❌ History lookup failed: {e}")
    
    # Test 5: Archive stats
    print("\n📊 Test 5: Archive Statistics")
    try:
        manifest = archive.manager._load_manifest()
        total_archives = len(manifest.get('archives', []))
        print(f"  Total archived documents: {total_archives}")
        print(f"  Archive location: {archive.archive_path}")
        print(f"  RAG enabled: {archive.manager.rag is not None}")
    except Exception as e:
        print(f"  ❌ Stats retrieval failed: {e}")
    
    print("\n" + "=" * 60)
    print("✅ HireWire RAG Archive Test Complete")
    print("=" * 60)
    print("\nNext steps:")
    print("  1. Integrate with resume parser API endpoint")
    print("  2. Add search endpoint to HireWire API")
    print("  3. Test with real resume uploads")
    print("  4. Add to Docker compose services")
    

if __name__ == "__main__":
    test_hirewire_rag()
