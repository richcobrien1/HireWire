'use client';

import { useState } from 'react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  maxSelections?: number;
}

export default function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  maxSelections,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((item) => item !== option));
    } else {
      if (maxSelections && selected.length >= maxSelections) {
        return;
      }
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-[var(--card-bg)] border-2 border-[var(--primary)] rounded-lg text-left text-white hover:opacity-80 transition-all"
      >
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((item) => (
              <span
                key={item}
                className="px-2 py-1 bg-[var(--primary)] text-white rounded text-sm"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[var(--text-muted)]">{placeholder}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-[var(--card-bg)] border-2 border-[var(--primary)] rounded-lg max-h-60 overflow-y-auto">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              className={`w-full px-4 py-2 text-left hover:bg-[var(--primary)] hover:bg-opacity-20 transition-all ${
                selected.includes(option) ? 'bg-[var(--primary)] bg-opacity-10' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                    selected.includes(option)
                      ? 'bg-[var(--primary)] border-[var(--primary)]'
                      : 'border-[var(--text-muted)]'
                  }`}
                >
                  {selected.includes(option) && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
                {option}
              </span>
            </button>
          ))}
        </div>
      )}
      {maxSelections && (
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Select up to {maxSelections} options ({selected.length}/{maxSelections} selected)
        </p>
      )}
    </div>
  );
}
