#!/usr/bin/env python3
"""
Re-index Existing Archives - Index all archived files into ChromaDB

This adds all existing archives to the RAG system without re-archiving.
"""

import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent))

from archive_manager_v2 import ArchiveManagerV2
from archive_rag import ArchiveRAG, RAG_AVAILABLE


def reindex_archives():
    """Re-index all existing archives into ChromaDB"""
    
    print("="*70)
    print("RE-INDEX EXISTING ARCHIVES")
    print("="*70)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    if not RAG_AVAILABLE:
        print("❌ ChromaDB not available")
        print("   Install: pip install chromadb openai")
        return
    
    # Initialize manager with RAG
    manager = ArchiveManagerV2(enable_rag=True)
    
    if not manager.rag:
        print("❌ RAG system not initialized")
        return
    
    # Load manifest
    manifest = manager._load_manifest()
    archives = manifest.get('archives', [])
    
    if not archives:
        print("⚠️  No archives found in manifest")
        return
    
    print(f"📁 Found {len(archives)} archives to index\n")
    
    # Check current collection
    current_count = manager.rag.collection.count()
    print(f"📊 Current ChromaDB count: {current_count}\n")
    
    if current_count > 0:
        print("⚠️  Collection already has documents.")
        response = input("Clear and re-index? (y/n): ").strip().lower()
        if response == 'y':
            # Delete and recreate collection
            try:
                manager.rag.client.delete_collection("archive_documents")
                manager.rag.collection = manager.rag.client.create_collection(
                    name="archive_documents",
                    metadata={"description": "Chronological archive with semantic search"}
                )
                print("✅ Collection cleared\n")
            except Exception as e:
                print(f"⚠️  Could not clear collection: {e}\n")
    
    # Index each archive
    indexed = 0
    failed = 0
    skipped = 0
    
    print("Indexing archives:\n")
    
    for i, archive_meta in enumerate(archives, 1):
        archive_path = Path(archive_meta.get('archive_path', ''))
        
        # Check if file exists
        if not archive_path.exists():
            print(f"[{i}/{len(archives)}] ⚠️  Skipped: {archive_path.name} (not found)")
            skipped += 1
            continue
        
        try:
            # Index the archive
            success = manager.rag.index_archive(archive_path, archive_meta)
            
            if success:
                indexed += 1
                if indexed % 10 == 0:
                    print(f"[{i}/{len(archives)}] ✅ Indexed {indexed} files...")
            else:
                failed += 1
                
        except Exception as e:
            print(f"[{i}/{len(archives)}] ❌ Failed: {archive_path.name} - {e}")
            failed += 1
    
    # Final count
    final_count = manager.rag.collection.count()
    
    print("\n" + "="*70)
    print("INDEXING COMPLETE")
    print("="*70)
    print(f"\n📊 Results:")
    print(f"   Archives processed: {len(archives)}")
    print(f"   Successfully indexed: {indexed}")
    print(f"   Failed: {failed}")
    print(f"   Skipped: {skipped}")
    print(f"\n📚 ChromaDB Collection:")
    print(f"   Total documents: {final_count:,}")
    print(f"\n✅ RAG system ready for semantic search!")
    print("="*70)


if __name__ == "__main__":
    reindex_archives()
