'use client';

interface SliderInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  leftLabel?: string;
  rightLabel?: string;
}

export default function SliderInput({
  value,
  onChange,
  min = 0,
  max = 10,
  step = 1,
  label,
  leftLabel,
  rightLabel,
}: SliderInputProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
        {label}
      </label>
      <div className="relative pt-2 pb-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-[var(--card-bg)] rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${percentage}%, var(--card-bg) ${percentage}%, var(--card-bg) 100%)`,
          }}
        />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-6 px-2 py-1 bg-[var(--primary)] text-white text-xs rounded font-bold">
          {value}
        </div>
      </div>
      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-[var(--text-muted)]">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
