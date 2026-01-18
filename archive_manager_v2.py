#!/usr/bin/env python3
"""
Universal Archive Manager v2 - With RAG Integration
Maintains chronological integrity + semantic search across all projects

Usage:
    python archive_manager_v2.py init --rag                    # Initialize with RAG
    python archive_manager_v2.py snapshot <file> <desc> --rag  # Snapshot + index
    python archive_manager_v2.py search "data center exp"      # Semantic search
    python archive_manager_v2.py compare ts1 ts2               # Version diff
    python archive_manager_v2.py timeline                      # Skill evolution

Features:
- ✅ Immutable chronological archives (Year/Month folders)
- ✅ SHA256 integrity verification
- ✅ Git commit tracking
- ✅ Semantic search across all versions (ChromaDB)
- ✅ LLM-powered version comparison (GPT-4)
- ✅ Skill evolution tracking over time
- ✅ Timeline queries (find content by date range)
- ✅ Works in ANY project folder
"""

import os
import shutil
import json
from datetime import datetime
from pathlib import Path
import hashlib

# Import original archive manager
import sys
sys.path.insert(0, str(Path(__file__).parent))
from archive_manager import ArchiveManager as BaseArchiveManager

# RAG Integration (optional)
try:
    from archive_rag import ArchiveRAG
    RAG_AVAILABLE = True
except ImportError:
    RAG_AVAILABLE = False


class ArchiveManagerV2(BaseArchiveManager):
    """Archive Manager with RAG/semantic search capabilities"""
    
    def __init__(self, project_root=None, enable_rag=True):
        """Initialize archive manager with optional RAG
        
        Args:
            project_root: Root directory for archives (default: current directory)
            enable_rag: Enable RAG/semantic search capabilities
        """
        super().__init__(project_root)
        
        # RAG integration
        self.rag = None
        if enable_rag and RAG_AVAILABLE:
            try:
                self.rag = ArchiveRAG(self.archive_root)
                print("✅ RAG semantic search enabled")
            except Exception as e:
                print(f"⚠️  RAG initialization failed: {e}")
        elif enable_rag and not RAG_AVAILABLE:
            print("⚠️  RAG requested but dependencies not installed")
            print("   Install: pip install chromadb openai")
    
    def create_snapshot(self, source_file, description):
        """Create snapshot and index in RAG system"""
        
        # Create snapshot using base method
        archive_path = super().create_snapshot(source_file, description)
        
        # Index in RAG system
        if self.rag and archive_path:
            try:
                # Get metadata from manifest
                manifest = self._load_manifest()
                latest_archive = manifest['archives'][-1]
                
                # Index the archived file
                self.rag.index_archive(archive_path, latest_archive)
            except Exception as e:
                print(f"⚠️  RAG indexing failed: {e}")
        
        return archive_path
    
    def search_archives(self, query, n_results=5):
        """Semantic search across all archived documents"""
        
        if not self.rag:
            print("❌ RAG not enabled. Use --rag flag")
            return []
        
        return self.rag.search(query, n_results=n_results)
    
    def compare_versions(self, timestamp1, timestamp2):
        """Compare two archived versions using LLM"""
        
        if not self.rag:
            print("❌ RAG not enabled. Use --rag flag")
            return None
        
        return self.rag.compare_versions(timestamp1, timestamp2)
    
    def get_skill_timeline(self):
        """Track skill evolution across all versions"""
        
        if not self.rag:
            print("❌ RAG not enabled. Use --rag flag")
            return None
        
        return self.rag.extract_skill_evolution()
    
    def find_by_timeframe(self, start_date, end_date, content_query=None):
        """Find archives within date range, optionally filtered by content"""
        
        if not self.rag:
            print("❌ RAG not enabled. Use --rag flag")
            return []
        
        return self.rag.find_by_timeframe(start_date, end_date, content_query)
    
    def reindex_all(self):
        """Rebuild RAG index from all existing archives"""
        
        if not self.rag:
            print("❌ RAG not enabled")
            return
        
        manifest = self._load_manifest()
        
        print(f"\n🔄 Re-indexing {len(manifest['archives'])} archives...")
        
        for archive in manifest['archives']:
            archive_path = self.project_root / archive['archive_path']
            
            if archive_path.exists():
                try:
                    self.rag.index_archive(archive_path, archive)
                except Exception as e:
                    print(f"⚠️  Failed to index {archive_path.name}: {e}")
        
        print("✅ Re-indexing complete")


def main():
    """CLI interface with RAG support"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Universal Archive Manager v2 (with RAG)')
    parser.add_argument('command', choices=['init', 'snapshot', 'list', 'restore', 'search', 'compare', 'timeline', 'reindex'])
    parser.add_argument('args', nargs='*', help='Command arguments')
    parser.add_argument('--rag', action='store_true', help='Enable RAG semantic search')
    parser.add_argument('--year', type=str, help='Filter by year (for list)')
    parser.add_argument('--month', type=str, help='Filter by month (for list)')
    parser.add_argument('--results', type=int, default=5, help='Number of search results')
    
    args = parser.parse_args()
    
    # Create manager with RAG if requested
    manager = ArchiveManagerV2(enable_rag=args.rag)
    
    if args.command == 'init':
        manager.init_structure()
    
    elif args.command == 'snapshot':
        if len(args.args) < 2:
            print("Usage: python archive_manager_v2.py snapshot <source_file> <description> [--rag]")
            sys.exit(1)
        
        source_file = args.args[0]
        description = " ".join(args.args[1:])
        manager.create_snapshot(source_file, description)
    
    elif args.command == 'list':
        manager.list_snapshots(year=args.year, month=args.month)
    
    elif args.command == 'restore':
        if len(args.args) < 2:
            print("Usage: python archive_manager_v2.py restore <timestamp> <dest_file>")
            sys.exit(1)
        
        timestamp = args.args[0]
        dest_file = args.args[1]
        manager.restore_snapshot(timestamp, dest_file)
    
    elif args.command == 'search':
        if len(args.args) < 1:
            print("Usage: python archive_manager_v2.py search <query> --rag")
            sys.exit(1)
        
        query = " ".join(args.args)
        results = manager.search_archives(query, n_results=args.results)
        
        print(f"\n🔍 Search: '{query}'")
        print("=" * 70)
        
        for i, result in enumerate(results, 1):
            meta = result['metadata']
            print(f"\n{i}. {meta['timestamp']} - {meta.get('description', 'No description')}")
            print(f"   Preview: {result['content'][:200]}...")
            if result.get('distance') is not None:
                relevance = 1 - result['distance']
                print(f"   Relevance: {relevance:.2%}")
    
    elif args.command == 'compare':
        if len(args.args) < 2:
            print("Usage: python archive_manager_v2.py compare <timestamp1> <timestamp2> --rag")
            sys.exit(1)
        
        ts1, ts2 = args.args[0], args.args[1]
        comparison = manager.compare_versions(ts1, ts2)
        
        print(f"\n📊 Comparing: {ts1} vs {ts2}")
        print("=" * 70)
        
        if comparison:
            print(json.dumps(comparison, indent=2))
    
    elif args.command == 'timeline':
        timeline = manager.get_skill_timeline()
        
        print("\n📈 Skill Evolution Timeline")
        print("=" * 70)
        
        if timeline:
            for entry in timeline:
                print(f"\n{entry['timestamp']} - {entry['skill_count']} skills")
                print(f"   {', '.join(entry['skills'][:10])}...")
    
    elif args.command == 'reindex':
        manager.reindex_all()


if __name__ == '__main__':
    main()
