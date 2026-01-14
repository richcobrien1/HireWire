'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProgressBar from '@/components/ProgressBar';
import MultiSelect from '@/components/MultiSelect';
import SliderInput from '@/components/SliderInput';
import { api, CareerContextData } from '@/lib/api';

const TOTAL_STEPS = 6;

// Option constants
const MOTIVATIONS = [
  'Career Growth',
  'Work-Life Balance',
  'High Compensation',
  'Learning Opportunities',
  'Meaningful Impact',
  'Innovative Technology',
  'Team Collaboration',
  'Autonomy & Independence',
  'Job Security',
  'Company Mission',
];

const WORK_STYLES = [
  'Independent Work',
  'Team Collaboration',
  'Fast-Paced Environment',
  'Structured Processes',
  'Creative Freedom',
  'Data-Driven Decisions',
  'Agile Methodology',
  'Cross-Functional Projects',
];

const COMPANY_CULTURES = [
  'Startup Culture',
  'Corporate Structure',
  'Mission-Driven',
  'Innovation-Focused',
  'Work-Life Balance',
  'High Performance',
  'Collaborative',
  'Competitive',
  'Inclusive & Diverse',
  'Remote-First',
];

const SKILLS_TO_DEVELOP = [
  'Leadership',
  'Technical Depth',
  'System Design',
  'Machine Learning',
  'Cloud Architecture',
  'Communication',
  'Product Management',
  'Data Analysis',
  'DevOps',
  'Frontend Development',
  'Backend Development',
  'Mobile Development',
];

const CORE_VALUES = [
  'Innovation',
  'Integrity',
  'Collaboration',
  'Excellence',
  'Diversity & Inclusion',
  'Sustainability',
  'Customer Focus',
  'Continuous Learning',
  'Transparency',
  'Social Impact',
];

const IMPACT_AREAS = [
  'Healthcare',
  'Education',
  'Climate Change',
  'Financial Inclusion',
  'Privacy & Security',
  'Accessibility',
  'Open Source',
  'Developer Tools',
  'Consumer Products',
  'Enterprise Solutions',
];

const LEARNING_STYLES = [
  'Hands-On Projects',
  'Mentorship',
  'Online Courses',
  'Reading Documentation',
  'Pair Programming',
  'Conference Talks',
  'Code Reviews',
  'Self-Directed Learning',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CareerContextData>({
    short_term_goals: '',
    long_term_goals: '',
    dream_role: '',
    primary_motivations: [],
    deal_breakers: [],
    work_style_preferences: [],
    company_culture_preferences: [],
    team_size_preference: '',
    skills_to_develop: [],
    learning_style: '',
    mentorship_importance: 5,
    core_values: [],
    impact_areas: [],
    social_responsibility_importance: 5,
    career_change_openness: 5,
    industry_pivot_interest: [],
    leadership_interest: 5,
    location_flexibility: 5,
    remote_preference: '',
    relocation_willingness: 5,
  });

  const updateField = <K extends keyof CareerContextData>(
    field: K,
    value: CareerContextData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // TODO: Get actual candidate ID from auth context
      const candidateId = 'temp-candidate-id';
      await api.submitQuestionnaire(candidateId, formData);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to submit questionnaire:', error);
      alert('Failed to submit. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark py-12">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-electric bg-clip-text text-transparent mb-2">
            Career Context
          </h1>
          <p className="text-[var(--text-secondary)]">
            Help us understand your career goals and preferences
          </p>
        </div>

        <div className="bg-[var(--card-bg)] rounded-xl p-8 shadow-lg border-2 border-[var(--primary)] border-opacity-20">
          <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />

          {/* Step 1: Career Goals */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-4">Career Goals</h2>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What are your short-term career goals? (1-2 years)
                </label>
                <textarea
                  value={formData.short_term_goals}
                  onChange={(e) => updateField('short_term_goals', e.target.value)}
                  placeholder="e.g., Become a senior engineer, lead a project team..."
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--secondary)]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What are your long-term career goals? (5+ years)
                </label>
                <textarea
                  value={formData.long_term_goals}
                  onChange={(e) => updateField('long_term_goals', e.target.value)}
                  placeholder="e.g., Become a CTO, start my own company, be a principal engineer..."
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--secondary)]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What's your dream role?
                </label>
                <input
                  type="text"
                  value={formData.dream_role}
                  onChange={(e) => updateField('dream_role', e.target.value)}
                  placeholder="e.g., Staff Engineer at a mission-driven startup"
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--secondary)]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Motivations & Deal Breakers */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--secondary)] mb-4">
                Motivations & Deal Breakers
              </h2>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What motivates you most in a job? (Select up to 5)
                </label>
                <MultiSelect
                  options={MOTIVATIONS}
                  selected={formData.primary_motivations || []}
                  onChange={(selected) => updateField('primary_motivations', selected)}
                  placeholder="Select your top motivations"
                  maxSelections={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What are your deal breakers? (Things you absolutely won't accept)
                </label>
                <textarea
                  value={formData.deal_breakers?.join(', ')}
                  onChange={(e) =>
                    updateField(
                      'deal_breakers',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="e.g., No remote work, long commute, on-call 24/7..."
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--secondary)]"
                  rows={3}
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">Separate with commas</p>
              </div>
            </div>
          )}

          {/* Step 3: Work Preferences */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--success)] mb-4">Work Preferences</h2>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What's your preferred work style? (Select up to 4)
                </label>
                <MultiSelect
                  options={WORK_STYLES}
                  selected={formData.work_style_preferences || []}
                  onChange={(selected) => updateField('work_style_preferences', selected)}
                  placeholder="Select your work style preferences"
                  maxSelections={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What company culture resonates with you? (Select up to 4)
                </label>
                <MultiSelect
                  options={COMPANY_CULTURES}
                  selected={formData.company_culture_preferences || []}
                  onChange={(selected) => updateField('company_culture_preferences', selected)}
                  placeholder="Select culture preferences"
                  maxSelections={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  Preferred team size
                </label>
                <select
                  value={formData.team_size_preference}
                  onChange={(e) => updateField('team_size_preference', e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white focus:outline-none focus:border-[var(--secondary)]"
                >
                  <option value="">Select team size</option>
                  <option value="small">Small (2-5 people)</option>
                  <option value="medium">Medium (6-15 people)</option>
                  <option value="large">Large (16+ people)</option>
                  <option value="flexible">Flexible / No preference</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 4: Learning & Growth */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--primary)] mb-4">Learning & Growth</h2>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What skills do you want to develop? (Select up to 5)
                </label>
                <MultiSelect
                  options={SKILLS_TO_DEVELOP}
                  selected={formData.skills_to_develop || []}
                  onChange={(selected) => updateField('skills_to_develop', selected)}
                  placeholder="Select skills to develop"
                  maxSelections={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What's your preferred learning style?
                </label>
                <select
                  value={formData.learning_style}
                  onChange={(e) => updateField('learning_style', e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white focus:outline-none focus:border-[var(--secondary)]"
                >
                  <option value="">Select learning style</option>
                  {LEARNING_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>

              <SliderInput
                value={formData.mentorship_importance || 5}
                onChange={(value) => updateField('mentorship_importance', value)}
                label="How important is mentorship to you?"
                leftLabel="Not important"
                rightLabel="Very important"
              />
            </div>
          )}

          {/* Step 5: Values & Impact */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--secondary)] mb-4">Values & Impact</h2>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What are your core values? (Select up to 5)
                </label>
                <MultiSelect
                  options={CORE_VALUES}
                  selected={formData.core_values || []}
                  onChange={(selected) => updateField('core_values', selected)}
                  placeholder="Select your core values"
                  maxSelections={5}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  What impact areas interest you? (Select up to 4)
                </label>
                <MultiSelect
                  options={IMPACT_AREAS}
                  selected={formData.impact_areas || []}
                  onChange={(selected) => updateField('impact_areas', selected)}
                  placeholder="Select impact areas"
                  maxSelections={4}
                />
              </div>

              <SliderInput
                value={formData.social_responsibility_importance || 5}
                onChange={(value) => updateField('social_responsibility_importance', value)}
                label="How important is social responsibility to you?"
                leftLabel="Not important"
                rightLabel="Very important"
              />
            </div>
          )}

          {/* Step 6: Career Trajectory & Location */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-[var(--success)] mb-4">
                Career Trajectory & Location
              </h2>

              <SliderInput
                value={formData.career_change_openness || 5}
                onChange={(value) => updateField('career_change_openness', value)}
                label="How open are you to career changes?"
                leftLabel="Not open"
                rightLabel="Very open"
              />

              <SliderInput
                value={formData.leadership_interest || 5}
                onChange={(value) => updateField('leadership_interest', value)}
                label="Interest in leadership roles?"
                leftLabel="Individual contributor"
                rightLabel="Management track"
              />

              <div>
                <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  Remote work preference
                </label>
                <select
                  value={formData.remote_preference}
                  onChange={(e) => updateField('remote_preference', e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--background)] border-2 border-[var(--primary)] rounded-lg text-white focus:outline-none focus:border-[var(--secondary)]"
                >
                  <option value="">Select preference</option>
                  <option value="full_remote">Fully Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                  <option value="flexible">Flexible / No preference</option>
                </select>
              </div>

              <SliderInput
                value={formData.location_flexibility || 5}
                onChange={(value) => updateField('location_flexibility', value)}
                label="Location flexibility"
                leftLabel="Must stay local"
                rightLabel="Willing to relocate"
              />

              <SliderInput
                value={formData.relocation_willingness || 5}
                onChange={(value) => updateField('relocation_willingness', value)}
                label="Willingness to relocate for the right opportunity"
                leftLabel="Not willing"
                rightLabel="Very willing"
              />
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-[var(--primary)] border-opacity-20">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-[var(--card-bg)] text-white rounded-lg font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-all"
            >
              ← Previous
            </button>

            {currentStep < TOTAL_STEPS ? (
              <button
                onClick={nextStep}
                className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-semibold transition-all transform hover:scale-105"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-8 py-3 bg-gradient-electric text-white rounded-lg font-semibold transition-all transform hover:scale-105 shadow-lg"
              >
                Complete Onboarding ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
