'use client';

import React, { useRef, useState } from 'react';
import ProfessionalResume from '@/components/resume/ProfessionalResume';
import resumeData from '@/lib/data/resume-data.json';

export default function DocumentGeneratorPage() {
  const resumeRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState('');

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Control Panel */}
      <div className="no-print bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">HireWire Document Studio</h1>
          <p className="text-blue-100 mb-6">Professional documents with instant export</p>
          
          <div className="flex flex-wrap gap-3">
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
        <div className="max-w-[8.5in] mx-auto bg-white shadow-2xl" ref={resumeRef}>
          <ProfessionalResume data={resumeData} />
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
