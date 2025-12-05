from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import PyPDF2
import docx
import io
import json
from openai import OpenAI
import os

app = FastAPI(title="HireWire Resume Parser", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Models
class WorkHistory(BaseModel):
    company: str
    title: str
    start_date: str  # YYYY-MM
    end_date: Optional[str]  # YYYY-MM or "present"
    description: str
    technologies: List[str] = []

class Education(BaseModel):
    school: str
    degree: str
    field: str
    graduation_year: Optional[int]

class Project(BaseModel):
    name: str
    description: str
    technologies: List[str]
    url: Optional[str]

class ResumeData(BaseModel):
    name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    title: str
    years_experience: int
    summary: Optional[str]
    skills: List[str]
    work_history: List[WorkHistory]
    education: List[Education]
    projects: List[Project] = []
    target_salary: Optional[int]
    preferred_locations: List[str] = []

class JobRequirements(BaseModel):
    title: str
    company: Optional[str]
    required_skills: List[str]
    preferred_skills: List[str] = []
    min_experience: int
    max_experience: Optional[int]
    salary_min: Optional[int]
    salary_max: Optional[int]
    remote_type: str  # "remote", "hybrid", "onsite"
    location: Optional[str]
    team_size: Optional[int]
    responsibilities: List[str]
    benefits: List[str] = []

class JobDescriptionInput(BaseModel):
    description: str

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "resume-parser"}

# Extract text from PDF
def extract_pdf_text(file_content: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

# Extract text from DOCX
def extract_docx_text(file_content: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse DOCX: {str(e)}")

# Parse resume using GPT-4
@app.post("/parse-resume", response_model=ResumeData)
async def parse_resume(file: UploadFile = File(...)):
    """
    Upload a resume (PDF or DOCX) and extract structured data using AI
    """
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Read file content
    content = await file.read()
    
    # Extract text based on file type
    if file.filename.endswith('.pdf'):
        text = extract_pdf_text(content)
    elif file.filename.endswith('.docx'):
        text = extract_docx_text(content)
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="Resume appears to be empty or too short")
    
    # Prepare prompt for GPT-4
    prompt = f"""
Extract structured data from this resume and return ONLY valid JSON with no additional text.

Required JSON structure:
{{
  "name": "Full Name" or null,
  "email": "email@example.com" or null,
  "phone": "phone number" or null,
  "title": "Current or most recent job title",
  "years_experience": total years of professional experience as integer,
  "summary": "Brief 2-3 sentence professional summary" or null,
  "skills": ["array", "of", "technical", "skills"],
  "work_history": [
    {{
      "company": "Company Name",
      "title": "Job Title",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM" or "present",
      "description": "Brief description of role and achievements",
      "technologies": ["tech", "used", "in", "role"]
    }}
  ],
  "education": [
    {{
      "school": "University Name",
      "degree": "Degree Type",
      "field": "Field of Study",
      "graduation_year": year as integer or null
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "What the project does",
      "technologies": ["tech", "stack"],
      "url": "github or website url" or null
    }}
  ],
  "target_salary": salary expectation as integer or null,
  "preferred_locations": ["city/state"] or []
}}

Rules:
- Extract years_experience by summing up work history durations
- Only include skills that are clearly technical/professional skills
- If dates are incomplete, use YYYY-01 format
- Extract only factual information, don't infer
- Return valid JSON only

Resume text:
{text}
"""
    
    try:
        # Call GPT-4 Turbo for extraction
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "You are a resume parser that extracts structured data. Return only valid JSON, no markdown, no extra text."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        # Parse JSON response
        result = json.loads(response.choices[0].message.content)
        
        # Validate and return
        return ResumeData(**result)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

# Extract job requirements from description
@app.post("/extract-job-requirements", response_model=JobRequirements)
async def extract_job_requirements(input: JobDescriptionInput):
    """
    Extract structured requirements from a job description using AI
    """
    
    description = input.description.strip()
    
    if not description or len(description) < 100:
        raise HTTPException(status_code=400, detail="Job description too short")
    
    prompt = f"""
Extract structured job requirements from this job description and return ONLY valid JSON with no additional text.

Required JSON structure:
{{
  "title": "Job Title",
  "company": "Company Name" or null,
  "required_skills": ["must-have", "technical", "skills"],
  "preferred_skills": ["nice-to-have", "skills"],
  "min_experience": minimum years as integer,
  "max_experience": maximum years as integer or null,
  "salary_min": minimum salary as integer or null,
  "salary_max": maximum salary as integer or null,
  "remote_type": "remote" or "hybrid" or "onsite",
  "location": "City, State" or null,
  "team_size": number of team members as integer or null,
  "responsibilities": ["key", "job", "responsibilities"],
  "benefits": ["mentioned", "benefits"]
}}

Rules:
- Extract only skills explicitly mentioned in requirements
- Differentiate between required (must-have) and preferred (nice-to-have) skills
- Infer remote_type from context (default to "hybrid" if unclear)
- Extract salary from ranges like "$120k-$160k" or "120-160K"
- Return valid JSON only

Job description:
{description}
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "You are a job description parser. Extract requirements accurately and return only valid JSON, no markdown, no extra text."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )
        
        result = json.loads(response.choices[0].message.content)
        return JobRequirements(**result)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

# Quick skill extraction (for real-time suggestions)
@app.post("/extract-skills")
async def extract_skills(text: str):
    """
    Extract just skills from any text (quick operation)
    """
    
    if len(text) < 20:
        raise HTTPException(status_code=400, detail="Text too short")
    
    prompt = f"""
Extract technical skills from this text. Return ONLY a JSON array of skill names.
Format: ["Skill1", "Skill2", "Skill3"]

Text:
{text[:2000]}  
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Faster/cheaper for simple extraction
            messages=[
                {"role": "system", "content": "Extract technical skills and return JSON array only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1
        )
        
        skills = json.loads(response.choices[0].message.content)
        return {"skills": skills}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Skill extraction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
