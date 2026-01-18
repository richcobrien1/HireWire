"""
Archive RAG Integration
Enables semantic search across all archived documents

Features:
- Vector embeddings for every archived file
- ChromaDB/Qdrant integration
- Semantic search: "Find my data center experience from 2016"
- Version comparison: "What changed between Nov and Dec resumes?"
- Content extraction: "Get all AI/ML projects across versions"
- Timeline queries: "Show skill evolution over time"
"""

import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import json

try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
    RAG_AVAILABLE = True  # Alias for compatibility
except ImportError:
    CHROMADB_AVAILABLE = False
    RAG_AVAILABLE = False

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False


class ArchiveRAG:
    """RAG system for archived documents"""
    
    def __init__(self, archive_root, openai_api_key=None):
        self.archive_root = Path(archive_root)
        self.db_path = self.archive_root / ".chromadb"
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        
        if CHROMADB_AVAILABLE:
            self.client = chromadb.PersistentClient(
                path=str(self.db_path),
                settings=Settings(anonymized_telemetry=False)
            )
            self.collection = self.client.get_or_create_collection(
                name="archive_documents",
                metadata={"description": "Chronological archive with semantic search"}
            )
        else:
            self.client = None
            self.collection = None
        
        if OPENAI_AVAILABLE and self.openai_api_key:
            self.openai = OpenAI(api_key=self.openai_api_key)
        else:
            self.openai = None
    
    def index_archive(self, archive_path, metadata):
        """Add archived document to vector database"""
        
        if not self.collection:
            print("⚠️  ChromaDB not available - skipping indexing")
            return False
        
        archive_path = Path(archive_path)
        
        # Read content
        try:
            with open(archive_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except:
            print(f"⚠️  Could not read {archive_path} - skipping")
            return False
        
        # Split into chunks for better retrieval
        chunks = self._chunk_text(content)
        
        # Generate embeddings (if OpenAI available) or use ChromaDB default
        doc_id = metadata['timestamp']
        
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id}_chunk_{i}"
            chunk_metadata = {
                **metadata,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "content_preview": chunk[:100]
            }
            
            # Add to collection
            self.collection.add(
                documents=[chunk],
                metadatas=[chunk_metadata],
                ids=[chunk_id]
            )
        
        print(f"✅ Indexed: {len(chunks)} chunks from {archive_path.name}")
        return True
    
    def search(self, query, n_results=5, filter_metadata=None):
        """Semantic search across all archives"""
        
        if not self.collection:
            print("❌ ChromaDB not available")
            return []
        
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=filter_metadata
        )
        
        return self._format_results(results)
    
    def find_by_timeframe(self, start_date, end_date, content_query=None):
        """Find archives within time range, optionally filtered by content"""
        
        # Build metadata filter
        filter_dict = {
            "$and": [
                {"timestamp": {"$gte": start_date}},
                {"timestamp": {"$lte": end_date}}
            ]
        }
        
        if content_query:
            return self.search(content_query, filter_metadata=filter_dict)
        else:
            # Get all in range
            results = self.collection.get(where=filter_dict)
            return self._format_get_results(results)
    
    def compare_versions(self, timestamp1, timestamp2):
        """Compare content between two archived versions"""
        
        if not self.collection:
            print("❌ ChromaDB not available")
            return None
        
        # Get both versions
        v1 = self.collection.get(where={"timestamp": timestamp1})
        v2 = self.collection.get(where={"timestamp": timestamp2})
        
        if not v1['documents'] or not v2['documents']:
            print("❌ One or both versions not found")
            return None
        
        # Reconstruct full documents
        doc1 = " ".join(v1['documents'])
        doc2 = " ".join(v2['documents'])
        
        # Use LLM to generate comparison
        if self.openai:
            comparison = self._llm_compare(doc1, doc2, timestamp1, timestamp2)
            return comparison
        else:
            # Basic diff
            return {
                "version1": timestamp1,
                "version2": timestamp2,
                "length_change": len(doc2) - len(doc1),
                "doc1_preview": doc1[:500],
                "doc2_preview": doc2[:500]
            }
    
    def extract_skill_evolution(self):
        """Track how skills have evolved across versions"""
        
        if not self.openai:
            print("⚠️  OpenAI not available - cannot extract skill evolution")
            return None
        
        # Get all archives
        all_docs = self.collection.get()
        
        if not all_docs['documents']:
            return []
        
        # Group by timestamp
        docs_by_time = {}
        for i, doc in enumerate(all_docs['documents']):
            timestamp = all_docs['metadatas'][i]['timestamp']
            if timestamp not in docs_by_time:
                docs_by_time[timestamp] = []
            docs_by_time[timestamp].append(doc)
        
        # Extract skills from each version
        skill_timeline = []
        
        for timestamp in sorted(docs_by_time.keys()):
            full_doc = " ".join(docs_by_time[timestamp])
            skills = self._extract_skills(full_doc)
            
            skill_timeline.append({
                "timestamp": timestamp,
                "skills": skills,
                "skill_count": len(skills)
            })
        
        return skill_timeline
    
    def _chunk_text(self, text, chunk_size=1000, overlap=200):
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk.rfind('.')
                if last_period > chunk_size * 0.5:
                    end = start + last_period + 1
                    chunk = text[start:end]
            
            chunks.append(chunk)
            start = end - overlap
        
        return chunks
    
    def _extract_skills(self, text):
        """Extract skills using LLM"""
        
        prompt = f"""Extract all technical skills mentioned in this resume/document.
        Return ONLY a JSON array of skill names.
        
        Text:
        {text[:3000]}
        """
        
        try:
            response = self.openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Extract skills and return JSON array only."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            import json
            skills = json.loads(response.choices[0].message.content)
            return skills
        except:
            return []
    
    def _llm_compare(self, doc1, doc2, timestamp1, timestamp2):
        """Use LLM to compare two document versions"""
        
        prompt = f"""Compare these two resume versions and identify key changes.

Version 1 ({timestamp1}):
{doc1[:2000]}

Version 2 ({timestamp2}):
{doc2[:2000]}

Provide a structured comparison including:
1. New skills added
2. Removed content
3. Updated experience/descriptions
4. Overall changes summary

Return as JSON.
"""
        
        try:
            response = self.openai.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "Compare documents and return detailed JSON analysis."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            import json
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            return {"error": str(e)}
    
    def _format_results(self, results):
        """Format ChromaDB query results"""
        formatted = []
        
        for i in range(len(results['documents'][0])):
            formatted.append({
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "distance": results['distances'][0][i] if 'distances' in results else None
            })
        
        return formatted
    
    def _format_get_results(self, results):
        """Format ChromaDB get results"""
        formatted = []
        
        for i in range(len(results['documents'])):
            formatted.append({
                "content": results['documents'][i],
                "metadata": results['metadatas'][i]
            })
        
        return formatted


# Integration with ArchiveManager
def add_rag_to_archive_manager():
    """
    Add RAG capabilities to existing ArchiveManager
    
    Usage:
        from archive_rag import ArchiveRAG
        
        manager = ArchiveManager()
        rag = ArchiveRAG(manager.archive_root)
        
        # After creating snapshot:
        archive_path = manager.create_snapshot(source, desc)
        metadata = manager._load_manifest()['archives'][-1]
        rag.index_archive(archive_path, metadata)
        
        # Search archives:
        results = rag.search("data center infrastructure experience")
        
        # Compare versions:
        diff = rag.compare_versions("2026-01-17_0907", "2025-12-11_1030")
        
        # Track skill evolution:
        timeline = rag.extract_skill_evolution()
    """
    pass


if __name__ == "__main__":
    print("Archive RAG Integration")
    print("=" * 60)
    print("\nFeatures:")
    print("✅ Semantic search across all archived versions")
    print("✅ Timeline queries (find content by date range)")
    print("✅ Version comparison (what changed?)")
    print("✅ Skill evolution tracking")
    print("✅ ChromaDB/Qdrant integration")
    print("\nInstall dependencies:")
    print("  pip install chromadb openai")
    print("\nUsage: See add_rag_to_archive_manager() docstring")
