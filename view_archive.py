#!/usr/bin/env python3
"""
Archive Viewer - Explore and test archived data

Usage:
    python view_archive.py stats          # Show archive statistics
    python view_archive.py list           # List all archived files
    python view_archive.py search <term>  # Search descriptions/filenames
    python view_archive.py show <id>      # Show details of specific archive
    python view_archive.py timeline       # Show chronological timeline
    python view_archive.py duplicates     # Find duplicate files (by hash)
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from archive_manager_v2 import ArchiveManagerV2


class ArchiveViewer:
    """Interactive viewer for archived data"""
    
    def __init__(self):
        self.manager = ArchiveManagerV2(enable_rag=False)
        self.manifest = self.manager._load_manifest()
        self.archives = self.manifest.get('archives', [])
    
    def show_stats(self):
        """Display archive statistics"""
        print("\n" + "="*70)
        print("ARCHIVE STATISTICS")
        print("="*70)
        
        if not self.archives:
            print("No archives found.")
            return
        
        # Basic counts
        total_files = len(self.archives)
        total_size = sum(a.get('file_size', 0) for a in self.archives)
        
        # File types
        extensions = defaultdict(int)
        for archive in self.archives:
            source = archive.get('source_file', '')
            ext = Path(source).suffix.lower() or 'no extension'
            extensions[ext] += 1
        
        # Date range
        timestamps = [a.get('created_at', '') for a in self.archives if a.get('created_at')]
        if timestamps:
            timestamps.sort()
            first = datetime.fromisoformat(timestamps[0]).strftime('%Y-%m-%d %H:%M')
            last = datetime.fromisoformat(timestamps[-1]).strftime('%Y-%m-%d %H:%M')
        else:
            first = last = "N/A"
        
        # Unique hashes (dedupe check)
        unique_hashes = set(a.get('file_hash', '')[:16] for a in self.archives)
        
        print(f"\n📊 Overview:")
        print(f"   Total archives:    {total_files:,}")
        print(f"   Total size:        {total_size:,} bytes ({total_size/1024/1024:.2f} MB)")
        print(f"   Unique files:      {len(unique_hashes):,}")
        print(f"   Duplicates:        {total_files - len(unique_hashes):,}")
        print(f"   First archive:     {first}")
        print(f"   Latest archive:    {last}")
        
        print(f"\n📁 File Types:")
        for ext, count in sorted(extensions.items(), key=lambda x: x[1], reverse=True):
            pct = (count/total_files)*100
            print(f"   {ext:15s}  {count:4d} files ({pct:5.1f}%)")
        
        # Largest files
        print(f"\n📦 Largest Files:")
        largest = sorted(self.archives, key=lambda x: x.get('file_size', 0), reverse=True)[:5]
        for i, archive in enumerate(largest, 1):
            name = Path(archive.get('source_file', 'unknown')).name
            size = archive.get('file_size', 0)
            print(f"   {i}. {name:50s}  {size:8,} bytes")
        
        print()
    
    def list_archives(self, limit=None, search_term=None):
        """List all archives with optional filtering"""
        print("\n" + "="*70)
        print("ARCHIVED FILES")
        print("="*70)
        
        archives = self.archives
        
        # Filter by search term
        if search_term:
            search_lower = search_term.lower()
            archives = [a for a in archives 
                       if search_lower in a.get('description', '').lower() 
                       or search_lower in Path(a.get('source_file', '')).name.lower()]
            print(f"\nFiltered by: '{search_term}' ({len(archives)} matches)")
        
        if not archives:
            print("No archives found.")
            return
        
        # Sort by timestamp
        archives = sorted(archives, key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Apply limit
        if limit:
            archives = archives[:limit]
        
        print(f"\nShowing {len(archives)} of {len(self.archives)} total archives:\n")
        
        for i, archive in enumerate(archives, 1):
            timestamp = archive.get('timestamp', 'N/A')
            description = archive.get('description', 'No description')
            source = Path(archive.get('source_file', 'unknown')).name
            size = archive.get('file_size', 0)
            hash_short = archive.get('file_hash', 'N/A')[:16]
            
            print(f"{i:3d}. [{timestamp}] {source}")
            print(f"     {description}")
            print(f"     Size: {size:,} bytes | Hash: {hash_short}...")
            print()
    
    def show_details(self, archive_id):
        """Show detailed info about specific archive"""
        
        # Find by timestamp or index
        if archive_id.isdigit():
            idx = int(archive_id) - 1
            if 0 <= idx < len(self.archives):
                archive = self.archives[idx]
            else:
                print(f"❌ Archive index {archive_id} not found (max: {len(self.archives)})")
                return
        else:
            # Search by timestamp
            matches = [a for a in self.archives if archive_id in a.get('timestamp', '')]
            if matches:
                archive = matches[0]
            else:
                print(f"❌ Archive with timestamp '{archive_id}' not found")
                return
        
        print("\n" + "="*70)
        print("ARCHIVE DETAILS")
        print("="*70)
        
        print(f"\n📄 File Information:")
        print(f"   Timestamp:      {archive.get('timestamp', 'N/A')}")
        print(f"   Description:    {archive.get('description', 'N/A')}")
        print(f"   Source file:    {archive.get('source_file', 'N/A')}")
        print(f"   Archive path:   {archive.get('archive_path', 'N/A')}")
        
        print(f"\n🔒 Integrity:")
        print(f"   File hash:      {archive.get('file_hash', 'N/A')}")
        print(f"   File size:      {archive.get('file_size', 0):,} bytes")
        
        if archive.get('git_commit'):
            print(f"\n📝 Git:")
            print(f"   Commit:         {archive.get('git_commit', 'N/A')}")
        
        print(f"\n⏰ Timestamps:")
        created = archive.get('created_at', 'N/A')
        if created != 'N/A':
            created = datetime.fromisoformat(created).strftime('%Y-%m-%d %H:%M:%S')
        print(f"   Created:        {created}")
        
        # Show content preview
        archive_path = Path(archive.get('archive_path', ''))
        if archive_path.exists():
            print(f"\n📖 Content Preview (first 500 chars):")
            print("-" * 70)
            try:
                with open(archive_path, 'r', encoding='utf-8') as f:
                    content = f.read(500)
                    print(content)
                    if len(content) == 500:
                        print("\n... (truncated)")
            except:
                print("   (Unable to read file)")
            print("-" * 70)
        
        print()
    
    def show_timeline(self):
        """Show chronological timeline of archives"""
        print("\n" + "="*70)
        print("ARCHIVE TIMELINE")
        print("="*70)
        
        if not self.archives:
            print("No archives found.")
            return
        
        # Group by date
        by_date = defaultdict(list)
        for archive in self.archives:
            timestamp = archive.get('timestamp', '')
            if timestamp:
                date = timestamp.split('_')[0]  # YYYY-MM-DD
                by_date[date].append(archive)
        
        # Sort by date
        for date in sorted(by_date.keys(), reverse=True):
            archives = by_date[date]
            print(f"\n📅 {date} ({len(archives)} files)")
            print("-" * 70)
            
            for archive in sorted(archives, key=lambda x: x.get('timestamp', '')):
                timestamp = archive.get('timestamp', 'N/A')
                time = timestamp.split('_')[1] if '_' in timestamp else 'N/A'
                source = Path(archive.get('source_file', 'unknown')).name
                desc = archive.get('description', 'No description')
                
                print(f"   {time}  {source:40s}  {desc[:40]}")
        
        print()
    
    def find_duplicates(self):
        """Find files with identical content (by hash)"""
        print("\n" + "="*70)
        print("DUPLICATE FILES")
        print("="*70)
        
        # Group by hash
        by_hash = defaultdict(list)
        for archive in self.archives:
            file_hash = archive.get('file_hash', '')
            if file_hash:
                by_hash[file_hash].append(archive)
        
        # Find duplicates
        duplicates = {h: archives for h, archives in by_hash.items() if len(archives) > 1}
        
        if not duplicates:
            print("\n✅ No duplicates found! All files are unique.")
            return
        
        print(f"\n⚠️  Found {len(duplicates)} sets of duplicate files:\n")
        
        for i, (file_hash, archives) in enumerate(sorted(duplicates.items()), 1):
            print(f"{i}. Hash: {file_hash[:16]}... ({len(archives)} copies)")
            
            for archive in archives:
                timestamp = archive.get('timestamp', 'N/A')
                source = Path(archive.get('source_file', 'unknown')).name
                print(f"   - [{timestamp}] {source}")
            
            print()
    
    def search(self, term):
        """Search archives by term"""
        self.list_archives(search_term=term)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    
    command = sys.argv[1].lower()
    viewer = ArchiveViewer()
    
    if command == 'stats':
        viewer.show_stats()
    
    elif command == 'list':
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else None
        viewer.list_archives(limit=limit)
    
    elif command == 'search':
        if len(sys.argv) < 3:
            print("Usage: python view_archive.py search <term>")
            return
        term = ' '.join(sys.argv[2:])
        viewer.search(term)
    
    elif command == 'show':
        if len(sys.argv) < 3:
            print("Usage: python view_archive.py show <id|timestamp>")
            return
        archive_id = sys.argv[2]
        viewer.show_details(archive_id)
    
    elif command == 'timeline':
        viewer.show_timeline()
    
    elif command == 'duplicates':
        viewer.find_duplicates()
    
    else:
        print(f"Unknown command: {command}")
        print(__doc__)


if __name__ == "__main__":
    main()
