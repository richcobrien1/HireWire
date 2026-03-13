'use client';

import React, { useState } from 'react';

interface TextImporterProps {
  onImport: (text: string, isMarkdown?: boolean) => void;
}

export default function TextImporter({ onImport }: TextImporterProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [showImporter, setShowImporter] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = () => {
    if (text.trim()) {
      // Detect if the text is markdown by checking for common markdown patterns
      const isMarkdown = fileName.endsWith('.md') || 
        /^#{1,6}\s/.test(text) || // Headers
        /\*\*[^*]+\*\*/.test(text) || // Bold
        /^[-*]\s/.test(text); // Lists
      
      onImport(text, isMarkdown);
      setText('');
      setFileName('');
      setShowImporter(false);
    }
  };

  if (!showImporter) {
    return (
      <button
        onClick={() => setShowImporter(true)}
        className="bg-indigo-500 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-600 transition-colors shadow-md"
      >
        📥 Import Text/File
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Import Resume Text</h2>
            <button
              onClick={() => setShowImporter(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">Drag & drop your resume file here</p>
            <p className="text-sm text-gray-500 mb-4">or</p>
            <label className="inline-block bg-blue-500 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
              Choose File
              <input
                type="file"
                accept=".txt,.md,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {fileName && (
              <p className="mt-4 text-sm text-green-600">📄 {fileName}</p>
            )}
          </div>

          {/* Text Paste Area */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Or paste your resume text:
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your resume text here..."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm text-gray-900 bg-white"
            />
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-800 mb-2">💡 Tips:</h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Supported formats: .txt, .md, Word docs (text will be extracted)</li>
              <li>Clear section headings help (e.g., "WORK EXPERIENCE", "SKILLS")</li>
              <li>Company names and dates should be clearly formatted</li>
              <li>After import, you'll need to review and adjust the data</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={!text.trim()}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              ✅ Import & Parse
            </button>
            <button
              onClick={() => {
                setText('');
                setFileName('');
                setShowImporter(false);
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
