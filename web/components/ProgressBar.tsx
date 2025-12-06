'use client';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full mb-8">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-[var(--text-secondary)]">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-[var(--primary)]">{Math.round(percentage)}%</span>
      </div>
      <div className="w-full bg-[var(--card-bg)] rounded-full h-2">
        <div
          className="bg-gradient-electric h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
