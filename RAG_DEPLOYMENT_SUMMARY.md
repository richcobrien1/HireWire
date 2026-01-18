# HireWire RAG System - Quick Reference

## ✅ System Deployed Successfully

**Location**: `c:\Users\richc\Projects\v2u\apps\hirewire`

**Python Version**: 3.10.11 (Required for ChromaDB compatibility)

## 📦 Installed Components

1. **archive_manager.py** - Basic archiving with SHA256 verification
2. **archive_manager_v2.py** - RAG-enabled archive manager  
3. **archive_rag.py** - ChromaDB integration for semantic search
4. **hirewire_archive.py** - HireWire-specific integration layer
5. **view_archive.py** - Interactive archive viewer
6. **reindex_archives.py** - Re-index existing archives
7. **test_hirewire_rag.py** - Test suite

## 🚀 Usage

### Archive a Parsed Resume

```python
from hirewire_archive import HireWireArchive

archive = HireWireArchive(enable_rag=True)

# Archive parsed resume data
archive_path = archive.archive_parsed_resume(
    resume_data=parsed_json,
    candidate_name="John Doe",
    source="website_upload"  # or "linkedin_import", "manual_entry", etc.
)
```

### Semantic Search

```python
# Search for candidates matching criteria
results = archive.search_resumes(
    "Python backend engineer with Docker and Kubernetes experience",
    n_results=10
)

for result in results:
    print(result['metadata']['description'])
    print(result['content'][:200])
```

### Get Candidate History

```python
# Get all resume versions for a candidate
versions = archive.get_candidate_history("John Doe")

for version in versions:
    print(f"{version['timestamp']}: {version['description']}")
```

### Compare Versions

```python
# Compare two resume versions
comparison = archive.compare_candidate_versions(
    timestamp1="2026-01-15_1030",
    timestamp2="2026-01-18_0900"
)
```

## 🧪 Testing

Run the test suite with Python 3.10:

```bash
py -3.10 test_hirewire_rag.py
```

## 📊 Test Results

✅ Archive initialization: Working  
✅ Resume archiving: 3/3 resumes archived  
✅ ChromaDB indexing: 2 chunks per resume  
✅ Semantic search: Working  
✅ Candidate history: Working  
✅ Archive statistics: 6 total documents indexed  

## 📂 Archive Structure

```
ARCHIVE/
└── resumes/
    ├── ARCHIVE/
    │   └── 2026/
    │       └── 01_January/
    │           ├── 2026-01-18_0939_Sarah_Chen_-_website_upload.json
    │           ├── 2026-01-18_0939_Michael_Rodriguez_-_linkedin_import.json
    │           └── 2026-01-18_0939_Emily_Watson_-_website_upload.json
    ├── .chromadb/          # Vector database
    ├── manifest.json       # Archive index
    └── README.md           # Auto-generated
```

## 🔧 Next Integration Steps

### 1. Add to Resume Parser API

Update `services/resume-parser/main_v2.py`:

```python
from hirewire_archive import HireWireArchive

archive = HireWireArchive(enable_rag=True)

@app.post("/parse-resume")
async def parse_resume(file: UploadFile):
    # Parse resume
    parsed_data = parser.parse(content)
    
    # Archive with RAG indexing
    archive.archive_parsed_resume(
        parsed_data,
        candidate_name=parsed_data.get('name', 'Unknown'),
        source='api_upload'
    )
    
    return parsed_data
```

### 2. Add Search Endpoint

```python
@app.get("/search-resumes")
async def search_resumes(query: str, limit: int = 10):
    results = archive.search_resumes(query, n_results=limit)
    return {"results": results}
```

### 3. Add to Docker Compose

Ensure Python 3.10 is used in resume-parser Dockerfile:

```dockerfile
FROM python:3.10-slim
# ... rest of Dockerfile
```

## 🎯 Key Features

- **Automatic Archiving**: Every parsed resume automatically archived
- **Semantic Search**: Find candidates by natural language queries
- **Version Tracking**: Track resume updates over time
- **Skill Evolution**: Analyze how candidate skills change
- **SHA256 Verification**: Ensure data integrity
- **Git Integration**: Track archives in version control (optional)

## ⚙️ Configuration

**Environment Variables** (optional):

```bash
OPENAI_API_KEY=sk-...  # For LLM-powered version comparison
```

**ChromaDB Path**: `ARCHIVE/resumes/.chromadb/`

**Archive Root**: `ARCHIVE/resumes/`

## 📝 Important Notes

- Always use Python 3.10.11 (not 3.14) for ChromaDB compatibility
- ChromaDB files are stored in `.chromadb/` directory
- Add `.chromadb/` to `.gitignore` if not tracking vector DB
- Resume archives are timestamped and immutable
- Semantic search works across all archived versions

## 🔍 Example Queries

```python
# Technical skills
archive.search_resumes("React TypeScript frontend developer")

# Domain expertise  
archive.search_resumes("enterprise microservices architecture")

# Specific technologies
archive.search_resumes("AWS Kubernetes Docker cloud infrastructure")

# Experience level
archive.search_resumes("senior full stack engineer 5+ years")
```

## ✅ Success Criteria

- [x] RAG system files deployed
- [x] ChromaDB installed (Python 3.10)
- [x] Test suite passing
- [x] 6 sample resumes indexed
- [x] Semantic search operational
- [ ] Integrated with resume parser API
- [ ] Search endpoint added to API Gateway
- [ ] Docker services updated

**Deployment Time**: ~15 minutes  
**Status**: ✅ Core system deployed and tested
