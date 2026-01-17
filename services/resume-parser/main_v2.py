from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import io
import json
from openai import OpenAI
import os
import sys

# Import our improved parser
from parser_v2 import HireWireParser

app = FastAPI(title="HireWire Resume Parser v2", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize parser
parser = HireWireParser(openai_api_key=os.getenv("OPENAI_API_KEY"))

# Models (keep existing for API compatibility)
class WorkHistory(BaseModel):
    company: str
    title: str
    start_date: str
    end_date: Optional[str]
    description: str
    technologies: List[str] = []
    location: Optional[str] = None
    employment_type: Optional[str] = None

class Education(BaseModel):
    school: str
    degree: str
    field: Optional[str] = None
    graduation_year: Optional[int] = None
    graduation_date: Optional[str] = None
    location: Optional[str] = None
    gpa: Optional[str] = None

class Project(BaseModel):
    name: str
    description: str
    technologies: List[str]
    url: Optional[str]

class CareerContext(BaseModel):
    """The human layer - motivations, interests, and ambitions"""
    past_motivations: List[str] = []
    proudest_achievements: List[str] = []
    lessons_learned: Optional[str] = None
    current_interests: List[str] = []
    learning_priorities: List[str] = []
    motivations: List[str] = []
    career_trajectory: Optional[str] = None
    five_year_goals: List[str] = []
    skills_to_develop: List[str] = []
    long_term_vision: Optional[str] = None

class ResumeData(BaseModel):
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    title: Optional[str] = None
    years_experience: Optional[int] = None
    summary: Optional[str]
    skills: List[str]
    work_history: List[WorkHistory] = []
    education: List[Education] = []
    projects: List[Project] = []
    target_salary: Optional[int] = None
    preferred_locations: List[str] = []
    career_context: Optional[CareerContext] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    location: Optional[str] = None
    certifications: List[str] = []
    # Metadata
    parsed_at: Optional[str] = None
    parser_version: Optional[str] = None
    parsing_method: Optional[str] = None

class JobRequirements(BaseModel):
    title: str
    company: Optional[str]
    required_skills: List[str]
    preferred_skills: List[str] = []
    min_experience: int
    max_experience: Optional[int]
    salary_min: Optional[int]
    salary_max: Optional[int]
    remote_type: str
    location: Optional[str]
    team_size: Optional[int]
    responsibilities: List[str]
    benefits: List[str] = []

class JobDescriptionInput(BaseModel):
    description: str

class ParserStats(BaseModel):
    """Statistics about parser performance"""
    formats_supported: List[str]
    has_llm: bool
    parser_version: str
    fallback_available: bool

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "resume-parser-v2",
        "version": "2.0.0",
        "features": {
            "formats": ["txt", "docx", "pdf"],
            "llm_enabled": parser.client is not None,
            "rule_fallback": True
        }
    }

# Parser statistics
@app.get("/stats", response_model=ParserStats)
async def get_parser_stats():
    """Get parser capabilities and statistics"""
    return ParserStats(
        formats_supported=["txt", "docx", "pdf"],
        has_llm=parser.client is not None,
        parser_version="2.0.0",
        fallback_available=True
    )

# Validate parsed data
@app.post("/validate")
async def validate_parsed_data(data: Dict[str, Any]):
    """Validate parsed resume data and return issues"""
    try:
        issues = parser.validate_parsed_data(data)
        return {
            "valid": len(issues['errors']) == 0,
            "errors": issues['errors'],
            "warnings": issues['warnings']
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Validation failed: {str(e)}")

# Parse resume (new multi-format version)
@app.post("/parse-resume", response_model=ResumeData)
async def parse_resume(file: UploadFile = File(...)):
    """
    Upload a resume (TXT, PDF, or DOCX) and extract structured data using AI
    Supports multi-format parsing with intelligent fallback
    """
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Check file extension
    supported_formats = ['.txt', '.pdf', '.docx']
    file_ext = None
    for ext in supported_formats:
        if file.filename.lower().endswith(ext):
            file_ext = ext
            break
    
    if not file_ext:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: {', '.join(supported_formats)}"
        )
    
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        # Save to temp file for parser
        import tempfile
        with tempfile.NamedTemporaryFile(mode='wb', suffix=file_ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name
        
        # Parse using our improved parser
        result = parser.parse_file(tmp_path)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Convert to API format (map fields)
        work_history = []
        for exp in result.get('experience', []):
            work_history.append(WorkHistory(
                company=exp.get('company', ''),
                title=exp.get('title', ''),
                start_date=exp.get('start_date', ''),
                end_date=exp.get('end_date'),
                description=exp.get('description', ''),
                technologies=exp.get('technologies', []),
                location=exp.get('location'),
                employment_type=exp.get('employment_type')
            ))
        
        education_list = []
        for edu in result.get('education', []):
            # Handle both graduation_year and graduation_date
            grad_year = None
            grad_date = edu.get('graduation_date')
            if grad_date and len(grad_date) >= 4:
                try:
                    grad_year = int(grad_date[:4])
                except:
                    pass
            
            education_list.append(Education(
                school=edu.get('school', ''),
                degree=edu.get('degree', ''),
                field=edu.get('field'),
                graduation_year=grad_year or edu.get('graduation_year'),
                graduation_date=grad_date,
                location=edu.get('location'),
                gpa=edu.get('gpa')
            ))
        
        # Extract years of experience from work history
        years_exp = None
        if work_history:
            years_exp = len(work_history)  # Simple estimation
        
        # Map to ResumeData format
        resume_data = ResumeData(
            name=result.get('name'),
            email=result.get('email'),
            phone=result.get('phone'),
            title=work_history[0].title if work_history else None,
            years_experience=years_exp,
            summary=result.get('summary'),
            skills=result.get('skills', []),
            work_history=work_history,
            education=education_list,
            projects=[],  # Parser doesn't extract projects yet
            linkedin=result.get('linkedin'),
            github=result.get('github'),
            location=result.get('location'),
            certifications=result.get('certifications', []),
            parsed_at=result.get('parsed_at'),
            parser_version=result.get('parser_version'),
            parsing_method=result.get('parsing_method')
        )
        
        return resume_data
        
    except Exception as e:
        # Clean up temp file if it exists
        try:
            if 'tmp_path' in locals():
                os.unlink(tmp_path)
        except:
            pass
        
        raise HTTPException(
            status_code=500,
            detail=f"Parsing failed: {str(e)}"
        )

# Extract job requirements from description (keep existing)
@app.post("/extract-job-requirements", response_model=JobRequirements)
async def extract_job_requirements(input: JobDescriptionInput):
    """
    Extract structured requirements from a job description using AI
    """
    
    if not parser.client:
        raise HTTPException(
            status_code=503,
            detail="LLM not available - set OPENAI_API_KEY"
        )
    
    description = input.description.strip()
    
    if not description or len(description) < 100:
        raise HTTPException(status_code=400, detail="Job description too short")
    
    prompt = f"""
Extract structured job requirements from this job description and return ONLY valid JSON.

Required JSON structure:
{{
  "title": "Job Title",
  "company": "Company Name" or null,
  "required_skills": ["must-have", "skills"],
  "preferred_skills": ["nice-to-have", "skills"],
  "min_experience": minimum years as integer,
  "max_experience": maximum years as integer or null,
  "salary_min": minimum salary as integer or null,
  "salary_max": maximum salary as integer or null,
  "remote_type": "remote" or "hybrid" or "onsite",
  "location": "City, State" or null,
  "team_size": team size as integer or null,
  "responsibilities": ["key", "responsibilities"],
  "benefits": ["benefits", "mentioned"]
}}

Job description:
{description}
"""
    
    try:
        response = parser.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "Extract job requirements. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        result = json.loads(response.choices[0].message.content)
        return JobRequirements(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

# Quick skill extraction
@app.post("/extract-skills")
async def extract_skills(text: str):
    """Extract just skills from any text (quick operation)"""
    
    if len(text) < 20:
        raise HTTPException(status_code=400, detail="Text too short")
    
    if not parser.client:
        raise HTTPException(
            status_code=503,
            detail="LLM not available - set OPENAI_API_KEY"
        )
    
    prompt = f"""
Extract technical skills from this text. Return ONLY a JSON array.
Format: ["Skill1", "Skill2"]

Text:
{text[:2000]}
"""
    
    try:
        response = parser.client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Extract skills and return JSON array only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        skills = json.loads(response.choices[0].message.content)
        return {"skills": skills}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
