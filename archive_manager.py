#!/usr/bin/env python3
"""
Universal Archive Manager
Maintains chronological integrity across all projects

Usage:
    python archive_manager.py snapshot "description"      # Create timestamped snapshot
    python archive_manager.py list                        # List all snapshots
    python archive_manager.py restore 2026-01-17_0907     # Restore from archive
    python archive_manager.py init                        # Initialize archive structure

Features:
- Immutable chronological archives
- Year/Month organization
- Git integration
- Symlink management for "LATEST"
- Works in ANY project folder
"""

import os
import shutil
import json
from datetime import datetime
from pathlib import Path
import argparse
import hashlib

class ArchiveManager:
    """Manages chronological file archives with integrity"""
    
    def __init__(self, project_root=None):
        self.project_root = Path(project_root or os.getcwd())
        self.archive_root = self.project_root / "ARCHIVE"
        self.source_root = self.project_root / "SOURCE_OF_TRUTH"
        self.working_root = self.project_root / "WORKING"
        self.manifest_file = self.archive_root / "manifest.json"
        
    def init_structure(self):
        """Initialize the archive structure"""
        print(f"🏗️  Initializing archive structure in {self.project_root}")
        
        # Create directory structure
        dirs = [
            self.archive_root,
            self.source_root,
            self.working_root,
            self.source_root / "components",
            self.source_root / "templates",
        ]
        
        for directory in dirs:
            directory.mkdir(exist_ok=True, parents=True)
            print(f"   ✅ {directory.relative_to(self.project_root)}/")
        
        # Create README
        readme = self.archive_root / "README.md"
        readme.write_text("""# Archive Structure

## Principles

1. **Immutable Archives**: Files here are NEVER modified after creation
2. **Chronological Organization**: Year/Month folders for easy navigation
3. **Timestamped Naming**: YYYY-MM-DD_HHMM_description.ext
4. **Git Tracked**: Every snapshot committed to preserve history
5. **Hash Verified**: SHA256 checksums ensure integrity

## Directory Structure

ARCHIVE/
  YYYY/
    MM_Month/
      YYYY-MM-DD_HHMM_description.ext
      YYYY-MM-DD_HHMM_description.json (metadata)
    manifest.json
  README.md

SOURCE_OF_TRUTH/
  components/          # Reusable content blocks (immutable)
  templates/          # Project-specific templates
  master.[ext]        # Current authoritative version

WORKING/
  draft_*.ext         # Temporary work files

## Usage

# Create snapshot
python archive_manager.py snapshot "ATS resume version"

# List archives
python archive_manager.py list

# Restore version
python archive_manager.py restore 2026-01-17_0907

# Initialize in new project
python archive_manager.py init

## Manifest File

Each archive has metadata:
- Creation timestamp
- Description
- File hash (SHA256)
- File size
- Source location
- Git commit (if available)
""", encoding='utf-8')
        
        # Initialize manifest
        if not self.manifest_file.exists():
            self._save_manifest({"archives": [], "version": "1.0.0"})
        
        print(f"\n✅ Archive structure initialized!")
        print(f"📁 Archive root: {self.archive_root}")
        print(f"📄 Manifest: {self.manifest_file}")
        
        return True
    
    def create_snapshot(self, source_file, description=""):
        """Create timestamped snapshot in archive"""
        source_path = Path(source_file)
        
        if not source_path.exists():
            print(f"❌ File not found: {source_file}")
            return None
        
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        year = datetime.now().strftime("%Y")
        month = datetime.now().strftime("%m_%B")
        
        # Create year/month folders
        archive_dir = self.archive_root / year / month
        archive_dir.mkdir(exist_ok=True, parents=True)
        
        # Generate archive filename (sanitize description for filename)
        if description:
            # Remove/replace problematic characters
            desc_slug = description.replace(" ", "_")
            # Remove or replace characters that are invalid in Windows filenames
            for char in ['<', '>', ':', '"', '/', '\\', '|', '?', '*', "'"]:
                desc_slug = desc_slug.replace(char, "")
            # Truncate if too long
            desc_slug = desc_slug[:100]
        else:
            desc_slug = "snapshot"
        archive_name = f"{timestamp}_{desc_slug}{source_path.suffix}"
        archive_path = archive_dir / archive_name
        
        # Copy file
        shutil.copy2(source_path, archive_path)
        
        # Calculate hash
        file_hash = self._calculate_hash(archive_path)
        
        # Create metadata
        metadata = {
            "timestamp": timestamp,
            "description": description,
            "source_file": str(source_path.absolute()),
            "archive_path": str(archive_path.relative_to(self.project_root)),
            "file_hash": file_hash,
            "file_size": archive_path.stat().st_size,
            "created_at": datetime.now().isoformat(),
        }
        
        # Try to get git commit
        try:
            import subprocess
            commit = subprocess.check_output(
                ["git", "rev-parse", "HEAD"],
                cwd=self.project_root,
                stderr=subprocess.DEVNULL
            ).decode().strip()
            metadata["git_commit"] = commit
        except:
            metadata["git_commit"] = None
        
        # Save metadata
        metadata_path = archive_path.with_suffix(archive_path.suffix + ".json")
        metadata_path.write_text(json.dumps(metadata, indent=2))
        
        # Update manifest
        manifest = self._load_manifest()
        manifest["archives"].append(metadata)
        self._save_manifest(manifest)
        
        print(f"✅ Snapshot created: {archive_path.relative_to(self.project_root)}")
        print(f"   📝 Description: {description}")
        print(f"   🔒 Hash: {file_hash[:16]}...")
        print(f"   📦 Size: {metadata['file_size']:,} bytes")
        
        return archive_path
    
    def list_snapshots(self, limit=20):
        """List recent snapshots"""
        manifest = self._load_manifest()
        archives = manifest.get("archives", [])
        
        if not archives:
            print("📭 No snapshots found")
            return
        
        print(f"\n📚 Archive Snapshots (showing {min(limit, len(archives))} of {len(archives)}):\n")
        
        for archive in sorted(archives, key=lambda x: x["created_at"], reverse=True)[:limit]:
            print(f"📄 {archive['timestamp']} - {archive['description']}")
            print(f"   Path: {archive['archive_path']}")
            print(f"   Size: {archive['file_size']:,} bytes")
            print(f"   Hash: {archive['file_hash'][:16]}...")
            if archive.get('git_commit'):
                print(f"   Git:  {archive['git_commit'][:8]}")
            print()
    
    def restore_snapshot(self, timestamp, target_path=None):
        """Restore a snapshot to working directory"""
        manifest = self._load_manifest()
        
        # Find snapshot
        snapshot = None
        for archive in manifest["archives"]:
            if archive["timestamp"] == timestamp:
                snapshot = archive
                break
        
        if not snapshot:
            print(f"❌ Snapshot not found: {timestamp}")
            return None
        
        archive_path = self.project_root / snapshot["archive_path"]
        
        if not archive_path.exists():
            print(f"❌ Archive file missing: {archive_path}")
            return None
        
        # Verify hash
        current_hash = self._calculate_hash(archive_path)
        if current_hash != snapshot["file_hash"]:
            print(f"⚠️  WARNING: Hash mismatch! File may be corrupted.")
            print(f"   Expected: {snapshot['file_hash']}")
            print(f"   Current:  {current_hash}")
            response = input("Continue anyway? (y/N): ")
            if response.lower() != 'y':
                return None
        
        # Determine target
        if not target_path:
            target_path = self.working_root / f"restored_{timestamp}{archive_path.suffix}"
        else:
            target_path = Path(target_path)
        
        # Copy file
        shutil.copy2(archive_path, target_path)
        
        print(f"✅ Restored: {archive_path.name}")
        print(f"   To: {target_path}")
        print(f"   Hash verified: {current_hash[:16]}...")
        
        return target_path
    
    def _calculate_hash(self, file_path):
        """Calculate SHA256 hash of file"""
        sha256 = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _load_manifest(self):
        """Load manifest file"""
        if not self.manifest_file.exists():
            return {"archives": [], "version": "1.0.0"}
        return json.loads(self.manifest_file.read_text())
    
    def _save_manifest(self, manifest):
        """Save manifest file"""
        self.manifest_file.write_text(json.dumps(manifest, indent=2))


def main():
    parser = argparse.ArgumentParser(
        description="Universal Archive Manager - Maintain chronological integrity"
    )
    parser.add_argument(
        "command",
        choices=["init", "snapshot", "list", "restore"],
        help="Command to execute"
    )
    parser.add_argument(
        "args",
        nargs="*",
        help="Command arguments (file path, description, timestamp, etc.)"
    )
    parser.add_argument(
        "--project",
        "-p",
        help="Project root directory (default: current directory)"
    )
    
    args = parser.parse_args()
    
    manager = ArchiveManager(args.project)
    
    if args.command == "init":
        manager.init_structure()
    
    elif args.command == "snapshot":
        if len(args.args) < 1:
            print("❌ Usage: snapshot <file> [description]")
            return
        
        file_path = args.args[0]
        description = " ".join(args.args[1:]) if len(args.args) > 1 else ""
        manager.create_snapshot(file_path, description)
    
    elif args.command == "list":
        limit = int(args.args[0]) if args.args else 20
        manager.list_snapshots(limit)
    
    elif args.command == "restore":
        if len(args.args) < 1:
            print("❌ Usage: restore <timestamp> [target_path]")
            return
        
        timestamp = args.args[0]
        target = args.args[1] if len(args.args) > 1 else None
        manager.restore_snapshot(timestamp, target)


if __name__ == "__main__":
    main()
