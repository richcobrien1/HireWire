"""
HireWire Resume Archive Integration

Integrates the RAG-powered archive system with HireWire's resume parser.
This allows:
- Automatic archiving of parsed resumes
- Semantic search across all resume submissions
- Version tracking for candidate updates
- Skill evolution analysis
"""

import os
from pathlib import Path
from archive_manager_v2 import ArchiveManagerV2


class HireWireArchive:
    """HireWire-specific archive integration"""
    
    def __init__(self, enable_rag=True):
        """Initialize HireWire archive system
        
        Args:
            enable_rag: Enable semantic search capabilities
        """
        # Set archive root to HireWire's data directory
        hirewire_root = Path(__file__).parent
        self.archive_path = hirewire_root / "ARCHIVE" / "resumes"
        self.archive_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize archive manager with RAG
        self.manager = ArchiveManagerV2(
            project_root=str(self.archive_path),
            enable_rag=enable_rag
        )
    
    def archive_parsed_resume(self, resume_data, candidate_name, source="upload"):
        """Archive a parsed resume with metadata
        
        Args:
            resume_data: Parsed resume JSON data
            candidate_name: Candidate's name
            source: Source of resume (upload, linkedin, etc.)
            
        Returns:
            Path to archived file
        """
        import json
        import tempfile
        
        # Create temp file with parsed data
        with tempfile.NamedTemporaryFile(
            mode='w',
            suffix='.json',
            delete=False,
            encoding='utf-8'
        ) as f:
            json.dump(resume_data, f, indent=2)
            temp_path = f.name
        
        try:
            # Create snapshot with descriptive metadata
            description = f"{candidate_name} - {source}"
            archive_path = self.manager.create_snapshot(temp_path, description)
            
            return archive_path
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def search_resumes(self, query, n_results=10):
        """Semantic search across all archived resumes
        
        Args:
            query: Natural language search query
            n_results: Number of results to return
            
        Returns:
            List of matching resumes with metadata
        """
        return self.manager.search_archives(query, n_results=n_results)
    
    def get_candidate_history(self, candidate_name):
        """Get all resume versions for a candidate
        
        Args:
            candidate_name: Name of candidate
            
        Returns:
            List of archived resume versions
        """
        manifest = self.manager._load_manifest()
        
        # Filter archives by candidate name
        candidate_archives = [
            arch for arch in manifest['archives']
            if candidate_name.lower() in arch.get('description', '').lower()
        ]
        
        return candidate_archives
    
    def compare_candidate_versions(self, timestamp1, timestamp2):
        """Compare two versions of a candidate's resume
        
        Args:
            timestamp1: Earlier version timestamp
            timestamp2: Later version timestamp
            
        Returns:
            Comparison results with detected changes
        """
        return self.manager.compare_versions(timestamp1, timestamp2)


# Example usage for HireWire integration
if __name__ == "__main__":
    # Initialize archive
    archive = HireWireArchive(enable_rag=True)
    
    # Example: Archive a parsed resume
    sample_resume = {
        "name": "John Doe",
        "email": "john@example.com",
        "skills": ["Python", "FastAPI", "Docker", "ChromaDB"],
        "experience": [
            {
                "title": "Senior Backend Engineer",
                "company": "TechCorp",
                "duration": "2022-2025",
                "description": "Built scalable microservices with FastAPI and Docker"
            }
        ]
    }
    
    archive_path = archive.archive_parsed_resume(
        sample_resume,
        "John Doe",
        source="website_upload"
    )
    print(f"✅ Resume archived: {archive_path}")
    
    # Example: Search for candidates
    results = archive.search_resumes("Python backend engineer with Docker experience")
    print(f"\n🔍 Found {len(results)} matching candidates")
    for result in results[:3]:
        print(f"  - {result.get('metadata', {}).get('description', 'Unknown')}")
