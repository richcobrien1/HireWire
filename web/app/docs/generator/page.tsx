'use client';

import React, { useRef, useState, useEffect } from 'react';
import ProfessionalResume from '@/components/resume/ProfessionalResume';
import TextImporter from '@/components/resume/TextImporter';
import ATSChecker from '@/components/resume/ATSChecker';
import JobMatcher from '@/components/resume/JobMatcher';
import { parseResumeText } from '@/lib/utils/resume-parser';
import { parseMarkdownResume } from '@/lib/utils/markdown-parser';

export default function DocumentGeneratorPage() {
  const [mounted, setMounted] = useState(false);
  const resumeRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState('');
  // Start with empty data instead of template
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      name: 'Your Name',
      emails: [],
      phone: '',
      location: '',
      linkedin: '',
      github: ''
    },
    profileSummary: 'Click "Import Text/File" to load your resume',
    technicalSkills: {},
    workExperience: [],
    priorExperience: [],
    education: {
      degree: '',
      field: '',
      institution: '',
      note: ''
    },
    certifications: [],
    coreCompetencies: ''
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyHTML = async () => {
    if (resumeRef.current) {
      const html = resumeRef.current.innerHTML;
      const styledHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resumeData.personalInfo.name} - Resume</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .resume-container { max-width: 100%; margin: 0; padding: 0.5in; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
      `.trim();

      try {
        await navigator.clipboard.writeText(styledHTML);
        setCopySuccess('HTML copied to clipboard!');
        setTimeout(() => setCopySuccess(''), 3000);
      } catch (err) {
        setCopySuccess('Failed to copy');
      }
    }
  };

  const handleDownloadHTML = () => {
    if (resumeRef.current) {
      const html = resumeRef.current.innerHTML;
      const styledHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resumeData.personalInfo.name} - Resume</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      body { margin: 0; padding: 0; }
      .resume-container { max-width: 100%; margin: 0; padding: 0.5in; }
    }
  </style>
</head>
<body>
  ${html}
</body>
</html>
      `.trim();

      const blob = new Blob([styledHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resumeData.personalInfo.name.replace(/ /g, '_')}_Resume.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyPlainText = async () => {
    if (resumeRef.current) {
      const text = resumeRef.current.innerText;
      try {
        await navigator.clipboard.writeText(text);
        setCopySuccess('Plain text copied!');
        setTimeout(() => setCopySuccess(''), 3000);
      } catch (err) {
        setCopySuccess('Failed to copy');
      }
    }
  };

  const handleTextImport = (text: string, isMarkdown = false) => {
    try {
      console.log('[Import] Starting import...');
      console.log('[Import] Text length:', text.length);
      console.log('[Import] Is markdown:', isMarkdown);
      
      // Parse based on format
      const parsed = isMarkdown 
        ? parseMarkdownResume(text)
        : parseResumeText(text);
      
      console.log('[Import] ===== PARSED DATA =====');
      console.log('[Import] Name:', parsed.personalInfo?.name);
      console.log('[Import] Emails:', parsed.personalInfo?.emails);
      console.log('[Import] Phone:', parsed.personalInfo?.phone);
      console.log('[Import] Location:', parsed.personalInfo?.location);
      console.log('[Import] LinkedIn:', parsed.personalInfo?.linkedin);
      console.log('[Import] GitHub:', parsed.personalInfo?.github);
      console.log('[Import] Skills count:', Object.keys(parsed.technicalSkills || {}).length);
      console.log('[Import] Skills:', Object.keys(parsed.technicalSkills || {}));
      console.log('[Import] Jobs found:', parsed.workExperience?.length);
      console.log('[Import] Jobs:', parsed.workExperience?.map(j => `${j.title} at ${j.company}`));
      console.log('[Import] Prior experience found:', parsed.priorExperience?.length);
      console.log('[Import] Certifications found:', parsed.certifications?.length);
      console.log('[Import] Education:', parsed.education);
      
      // Use ONLY parsed data (don't fall back to template)
      const updatedData = {
        personalInfo: {
          name: parsed.personalInfo?.name || '',
          emails: parsed.personalInfo?.emails || [],
          phone: parsed.personalInfo?.phone || '',
          location: parsed.personalInfo?.location || '',
          linkedin: parsed.personalInfo?.linkedin || '',
          github: parsed.personalInfo?.github || ''
        },
        profileSummary: parsed.profileSummary || '',
        technicalSkills: parsed.technicalSkills || {},
        workExperience: parsed.workExperience || [],
        priorExperience: parsed.priorExperience || [],
        education: {
          degree: parsed.education?.degree || '',
          field: parsed.education?.field || '',
          institution: parsed.education?.institution || '',
          note: parsed.education?.note || ''
        },
        certifications: parsed.certifications || [],
        coreCompetencies: parsed.coreCompetencies || ''
      };

      console.log('[Import] ===== FINAL DATA =====');
      console.log('[Import] Final jobs count:', updatedData.workExperience.length);
      console.log('[Import] Final prior jobs:', updatedData.priorExperience?.length);
      console.log('[Import] Final skills count:', Object.keys(updatedData.technicalSkills || {}).length);
      console.log('[Import] Final certifications:', updatedData.certifications?.length);
      
      setResumeData(updatedData as any);
      setCopySuccess(isMarkdown ? '✅ Markdown imported successfully!' : '✅ Text imported successfully!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      console.error('Failed to parse resume text:', err);
      setCopySuccess('Import failed - please check the format');
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  // Check if real data has been imported
  const hasImportedData = 
    resumeData.personalInfo.name !== 'Your Name' && 
    resumeData.personalInfo.name.length > 2;

  // Prevent hydration mismatch by only rendering on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="no-print bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">HireWire Document Studio</h1>
          <p className="text-blue-100 mb-6">Professional documents with instant export</p>
          
          <div className="flex flex-wrap gap-3">
            <TextImporter onImport={handleTextImport} />
            
            <button
              onClick={handlePrint}
              className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
            >
              🖨️ Print / Save as PDF
            </button>
            
            <button
              onClick={handleDownloadHTML}
              className="bg-green-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-md"
            >
              📄 Download HTML
            </button>
            
            <button
              onClick={handleCopyHTML}
              className="bg-purple-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-purple-600 transition-colors shadow-md"
            >
              📋 Copy HTML
            </button>
            
            <button
              onClick={handleCopyPlainText}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-md"
            >
              📝 Copy Plain Text
            </button>

            {copySuccess && (
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold animate-pulse">
                ✅ {copySuccess}
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-blue-100">
            <p>💡 <strong>Tip:</strong> Click &quot;Print / Save as PDF&quot; and choose &quot;Save as PDF&quot; in the print dialog for a perfect PDF export.</p>
          </div>
        </div>
      </div>

      {/* Resume Preview */}
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Resume Document - Takes 2/3 width on large screens */}
            <div className="xl:col-span-2">
              {hasImportedData ? (
                <div className="max-w-[8.5in] mx-auto bg-white shadow-2xl" ref={resumeRef}>
                  <ProfessionalResume data={resumeData} />
                </div>
              ) : (
                <div className="max-w-[8.5in] mx-auto bg-white shadow-2xl p-12 text-center">
                  <div className="text-8xl mb-6 animate-pulse">📄</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-4">
                    No Resume Loaded
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Click the <strong>&quot;📥 Import Text/File&quot;</strong> button above to load your resume.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">What you can do:</h4>
                    <ul className="text-left space-y-2 text-blue-800">
                      <li>✓ Import plain text (.txt) resumes</li>
                      <li>✓ Import Markdown (.md) resumes</li>
                      <li>✓ Get instant ATS compliance analysis</li>
                      <li>✓ Match against job descriptions</li>
                      <li>✓ Export as PDF or HTML</li>
                    </ul>
                  </div>
                  <div className="mt-6 text-sm text-gray-500">
                    🔒 Your data stays private • No server uploads • Processed locally
                  </div>
                </div>
              )}
            </div>

            {/* Analysis Panel - Takes 1/3 width on large screens */}
            <div className="space-y-6 no-print">
              {/* ATS Compliance Checker */}
              <ATSChecker resumeData={resumeData} />

              {/* Job Match Analyzer */}
              <JobMatcher resumeData={resumeData} />
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          .resume-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0.5in !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
