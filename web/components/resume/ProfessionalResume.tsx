'use client';

import React from 'react';

interface ResumeData {
  personalInfo: {
    name: string;
    emails: string[];
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  profileSummary: string;
  technicalSkills: Record<string, string>;
  workExperience: Array<{
    title: string;
    company: string;
    duration: string;
    website?: string;
    description?: string;
    projects?: Array<{
      name: string;
      description: string;
      links?: string[];
    }>;
    achievements?: string[];
  }>;
  education: {
    degree: string;
    field: string;
    institution: string;
    note: string;
  };
}

export default function ProfessionalResume({ data }: { data: ResumeData }) {
  return (
    <div className="resume-container bg-white text-black p-8 max-w-[8.5in] mx-auto">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{data.personalInfo.name}</h1>
        <div className="text-sm text-blue-600 space-x-2 mb-1">
          {data.personalInfo.emails.map((email, i) => (
            <React.Fragment key={email}>
              <a href={`mailto:${email}`} className="hover:underline">{email}</a>
              {i < data.personalInfo.emails.length - 1 && <span>|</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="text-sm mb-1">
          <span className="font-semibold">{data.personalInfo.phone}</span>
          <span className="mx-2">|</span>
          <span>{data.personalInfo.location}</span>
        </div>
        <div className="text-sm text-blue-600 space-x-2">
          <a href={data.personalInfo.linkedin} className="hover:underline">
            {data.personalInfo.linkedin}
          </a>
          <br />
          <a href={data.personalInfo.github} className="hover:underline">
            {data.personalInfo.github}
          </a>
        </div>
      </header>

      {/* Profile Summary */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b-2 border-black pb-1 mb-3">
          PROFILE SUMMARY
        </h2>
        <div className="text-sm space-y-3">
          {data.profileSummary.split('\n\n').map((para, i) => (
            <p key={i} className={i === 0 ? 'font-bold' : ''}>{para}</p>
          ))}
        </div>
      </section>

      {/* Technical Skills */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b-2 border-black pb-1 mb-3">
          TECHNICAL SKILLS
        </h2>
        <ul className="text-sm space-y-1.5 list-disc list-inside">
          {Object.values(data.technicalSkills).map((skill, i) => (
            <li key={i}>{skill}</li>
          ))}
        </ul>
      </section>

      {/* Work Experience */}
      <section className="mb-6">
        <h2 className="text-sm font-bold border-b-2 border-black pb-1 mb-3">
          WORK EXPERIENCE
        </h2>
        <div className="space-y-5">
          {data.workExperience.map((job, i) => (
            <div key={i}>
              <div className="mb-2">
                <div className="font-bold text-sm">
                  Job Title: {job.title}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Company:</span> {job.company}
                </div>
                <div className="text-sm italic">{job.duration}</div>
                {job.website && (
                  <div className="text-sm">
                    <a href={`https://${job.website}`} className="text-blue-600 hover:underline">
                      {job.website}
                    </a>
                  </div>
                )}
              </div>

              {job.description && (
                <p className="text-sm mb-2">{job.description}</p>
              )}

              {job.projects && job.projects.length > 0 && (
                <div className="text-sm space-y-1.5">
                  {job.projects.map((project, j) => (
                    <div key={j}>
                      <span className="font-semibold">{project.name}:</span> {project.description}
                      {project.links && project.links.length > 0 && (
                        <span> ({project.links.join(', ')})</span>
                      )}
                      .
                    </div>
                  ))}
                </div>
              )}

              {job.achievements && job.achievements.length > 0 && (
                <ul className="text-sm list-disc list-inside space-y-1 mt-2">
                  {job.achievements.map((achievement, j) => (
                    <li key={j}>{achievement}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section>
        <h2 className="text-sm font-bold border-b-2 border-black pb-1 mb-3">
          EDUCATION
        </h2>
        <div className="text-sm">
          <div className="font-bold">{data.education.degree}</div>
          <div>{data.education.field}</div>
          <div className="italic">{data.education.institution}</div>
          <div className="text-xs mt-1">{data.education.note}</div>
        </div>
      </section>
    </div>
  );
}
