"""
HireWire Resume Parser - The One That Actually Works
Parses .txt, .docx, and .pdf resumes with GPT-4 assistance
"""

import re
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path
import docx
import PyPDF2
import pdfplumber
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

class HireWireParser:
    """Resume parser that actually works (unlike ZipRecruiter)"""
    
    def __init__(self, openai_api_key: Optional[str] = None):
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            self.client = OpenAI(api_key=self.openai_api_key)
        else:
            self.client = None
            print("⚠️  Warning: No OpenAI API key - using rule-based parsing only")
    
    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse resume from file (supports .txt, .docx, .pdf)"""
        path = Path(file_path)
        
        if not path.exists():
            raise FileNotFoundError(f"Resume not found: {file_path}")
        
        # Extract text based on file type
        suffix = path.suffix.lower()
        
        if suffix == '.txt':
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
        elif suffix == '.docx':
            text = self._extract_from_docx(path)
        elif suffix == '.pdf':
            text = self._extract_from_pdf(path)
        else:
            raise ValueError(f"Unsupported file type: {suffix}. Supported: .txt, .docx, .pdf")
        
        # Parse with LLM if available, otherwise use rules
        if self.client:
            return self._parse_with_llm(text)
        else:
            return self._parse_with_rules(text)
    
    def _extract_from_docx(self, path: Path) -> str:
        """Extract text from DOCX file"""
        doc = docx.Document(path)
        return '\n'.join([para.text for para in doc.paragraphs])
    
    def _extract_from_pdf(self, path: Path) -> str:
        """Extract text from PDF file using dual extraction methods"""
        text = ""
        
        # Method 1: Try pdfplumber first (better for formatted PDFs)
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            if text.strip():
                print(f"   ✓ Extracted {len(text)} chars using pdfplumber")
                return text
        except Exception as e:
            print(f"   ⚠ pdfplumber failed: {e}")
        
        # Method 2: Fallback to PyPDF2 (better for text-based PDFs)
        try:
            with open(path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            
            if text.strip():
                print(f"   ✓ Extracted {len(text)} chars using PyPDF2")
                return text
        except Exception as e:
            print(f"   ⚠ PyPDF2 failed: {e}")
        
        if not text.strip():
            raise ValueError("Could not extract text from PDF - file may be image-based or corrupted")
        
        return text
    
    def _parse_with_llm(self, text: str) -> Dict[str, Any]:
        """Parse resume using GPT-4 (the smart way)"""
        
        prompt = f"""Parse this resume and extract structured information. Be VERY careful with names - preserve apostrophes, spaces, and special characters EXACTLY as written.

Resume:
{text}

Extract and return ONLY valid JSON with this structure:
{{
    "name": "Full name EXACTLY as written (preserve apostrophes!)",
    "email": "Primary email address",
    "phone": "Phone number",
    "location": "City, State",
    "linkedin": "LinkedIn URL if present",
    "github": "GitHub URL if present",
    "summary": "Professional summary/objective",
    "skills": ["skill1", "skill2", ...],
    "experience": [
        {{
            "company": "Company name (even if 1-3 characters!)",
            "title": "Job title",
            "location": "Location",
            "employment_type": "Full-time/Contract/Part-time",
            "start_date": "Month Year",
            "end_date": "Month Year or Present",
            "description": "Key responsibilities and achievements",
            "technologies": ["tech1", "tech2", ...]
        }}
    ],
    "education": [
        {{
            "school": "School name",
            "degree": "Degree type and major",
            "location": "Location",
            "graduation_date": "Year or Month Year",
            "gpa": "GPA if mentioned"
        }}
    ],
    "certifications": ["cert1", "cert2", ...]
}}

CRITICAL RULES:
- Name: Keep EXACT spelling including apostrophes (O'Brien not OBrien)
- Company: Include even if 1-3 characters (v2u, IBM, GE)
- Dates: Parse "January 2023 to Present" correctly
- Skills: Extract ALL technologies mentioned
- Be thorough but accurate"""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are an expert resume parser. Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            import json
            parsed = json.loads(response.choices[0].message.content)
            
            # Add metadata
            parsed['parsed_at'] = datetime.now().isoformat()
            parsed['parser_version'] = '1.0.0'
            parsed['parsing_method'] = 'llm'
            
            return parsed
            
        except Exception as e:
            print(f"⚠️  LLM parsing failed: {e}")
            print("Falling back to rule-based parsing...")
            return self._parse_with_rules(text)
    
    def _parse_with_rules(self, text: str) -> Dict[str, Any]:
        """Parse resume using regex rules (fallback method)"""
        
        lines = text.split('\n')
        
        # Initialize result
        result = {
            'name': '',
            'email': '',
            'phone': '',
            'location': '',
            'linkedin': '',
            'github': '',
            'summary': '',
            'skills': [],
            'experience': [],
            'education': [],
            'certifications': [],
            'parsed_at': datetime.now().isoformat(),
            'parser_version': '1.0.0',
            'parsing_method': 'rules'
        }
        
        # Parse name (first non-empty line)
        for line in lines:
            if line.strip():
                result['name'] = line.strip()
                break
        
        # Parse email
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        if emails:
            result['email'] = emails[0]
        
        # Parse phone
        phone_pattern = r'(\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4})'
        phones = re.findall(phone_pattern, text)
        if phones:
            result['phone'] = phones[0]
        
        # Parse LinkedIn
        linkedin_pattern = r'linkedin\.com/in/[\w-]+'
        linkedin = re.search(linkedin_pattern, text.lower())
        if linkedin:
            result['linkedin'] = f"https://{linkedin.group()}"
        
        # Parse GitHub
        github_pattern = r'github\.com/[\w-]+'
        github = re.search(github_pattern, text.lower())
        if github:
            result['github'] = f"https://{github.group()}"
        
        # Parse sections
        current_section = None
        section_content = []
        
        for line in lines:
            line_upper = line.strip().upper()
            
            # Detect section headers
            if line_upper in ['SUMMARY', 'PROFESSIONAL SUMMARY', 'SUMMARY:', 'OBJECTIVE']:
                if current_section and section_content:
                    self._process_section(result, current_section, section_content)
                current_section = 'summary'
                section_content = []
            elif line_upper in ['SKILLS', 'TECHNICAL SKILLS', 'SKILLS:']:
                if current_section and section_content:
                    self._process_section(result, current_section, section_content)
                current_section = 'skills'
                section_content = []
            elif line_upper in ['EXPERIENCE', 'WORK EXPERIENCE', 'EXPERIENCE:', 'PROFESSIONAL EXPERIENCE']:
                if current_section and section_content:
                    self._process_section(result, current_section, section_content)
                current_section = 'experience'
                section_content = []
            elif line_upper in ['EDUCATION', 'EDUCATION:']:
                if current_section and section_content:
                    self._process_section(result, current_section, section_content)
                current_section = 'education'
                section_content = []
            elif line_upper in ['CERTIFICATIONS', 'CERTIFICATIONS:', 'LICENSES']:
                if current_section and section_content:
                    self._process_section(result, current_section, section_content)
                current_section = 'certifications'
                section_content = []
            elif current_section and line.strip():
                section_content.append(line.strip())
        
        # Process last section
        if current_section and section_content:
            self._process_section(result, current_section, section_content)
        
        return result
    
    def _process_section(self, result: Dict, section: str, content: List[str]):
        """Process a section's content"""
        
        if section == 'summary':
            result['summary'] = ' '.join(content)
        
        elif section == 'skills':
            # Extract skills from lines
            for line in content:
                # Split by common delimiters
                skills = re.split(r'[,;:|]', line)
                # Clean and filter
                for skill in skills:
                    skill = skill.strip()
                    if skill and len(skill) > 1:
                        # Remove leading bullets or dashes
                        skill = re.sub(r'^[-•*]\s*', '', skill)
                        if skill:
                            result['skills'].append(skill)
        
        elif section == 'certifications':
            for line in content:
                # Split by common delimiters
                certs = re.split(r'[-–](?=\s*[A-Z])', line)
                for cert in certs:
                    cert = cert.strip()
                    if cert and len(cert) > 3:
                        result['certifications'].append(cert)
        
        # Experience and education would need more complex parsing
        # For now, store as raw content
        # TODO: Implement detailed parsing
    
    def validate_parsed_data(self, data: Dict[str, Any]) -> Dict[str, List[str]]:
        """Validate parsed data and return issues"""
        
        issues = {
            'errors': [],
            'warnings': []
        }
        
        # Check required fields
        if not data.get('name'):
            issues['errors'].append("Name is missing")
        elif len(data['name']) < 2:
            issues['warnings'].append("Name seems too short")
        
        if not data.get('email'):
            issues['warnings'].append("Email is missing")
        
        if not data.get('experience'):
            issues['warnings'].append("No work experience found")
        
        # Check name for common parsing errors
        name = data.get('name', '')
        if len(name.split()) == 1 and len(name) < 10:
            issues['warnings'].append("Name might be incomplete (only one word)")
        
        # Check for ZipRecruiter-style failures
        if 'O' == name.split()[-1]:
            issues['errors'].append("Name parsing failed - last name is just 'O' (ZipRecruiter bug detected!)")
        
        return issues


def main():
    """Demo the parser"""
    
    # Parse the resume that broke ZipRecruiter
    parser = HireWireParser()
    
    resume_path = "../_Current/Resumes/RESUME_ATS_01_FIXED.txt"
    
    print("🔍 HireWire Parser - Parsing resume...")
    print(f"   File: {resume_path}")
    print()
    
    try:
        result = parser.parse_file(resume_path)
        
        print("✅ PARSING SUCCESSFUL!")
        print()
        print(f"📝 Name: {result['name']}")
        print(f"📧 Email: {result['email']}")
        print(f"📱 Phone: {result['phone']}")
        print(f"📍 Location: {result['location']}")
        print(f"🔗 LinkedIn: {result['linkedin']}")
        print(f"🔗 GitHub: {result['github']}")
        print()
        print(f"💼 Experience: {len(result['experience'])} positions")
        print(f"🎓 Education: {len(result['education'])} entries")
        print(f"🏆 Certifications: {len(result['certifications'])} certifications")
        print(f"⚡ Skills: {len(result['skills'])} skills")
        print()
        
        # Validate
        issues = parser.validate_parsed_data(result)
        
        if issues['errors']:
            print("❌ ERRORS:")
            for error in issues['errors']:
                print(f"   - {error}")
            print()
        
        if issues['warnings']:
            print("⚠️  WARNINGS:")
            for warning in issues['warnings']:
                print(f"   - {warning}")
            print()
        
        if not issues['errors']:
            print("✨ HireWire successfully parsed what ZipRecruiter couldn't!")
            print()
            print("Comparison:")
            print(f"   ZipRecruiter: Richard O. (FAILED)")
            print(f"   HireWire:     {result['name']} (SUCCESS)")
        
        # Save result
        import json
        output_path = "parsed_resume.json"
        with open(output_path, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n💾 Full results saved to: {output_path}")
        
    except Exception as e:
        print(f"❌ Parsing failed: {e}")
        raise


if __name__ == "__main__":
    main()
