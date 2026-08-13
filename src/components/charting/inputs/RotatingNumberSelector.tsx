'use client';

export interface SelectorOption {
  value: string | number;
  label: string;
}

interface RotatingNumberSelectorProps {
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  options: SelectorOption[];
  label?: string;
  helpText?: string;
}

export function RotatingNumberSelector({
  value,
  onChange,
  options,
}: RotatingNumberSelectorProps) {
  /**
   * No value means no button is lit.
   *
   * This used to fall back to `options[0]`, which lit the first option — border,
   * checkmark and all — on a field nobody had touched. That reads as a deliberate
   * answer, so an unanswered question and a genuine "1" looked identical.
   */
  const effectiveValue = value ?? null;

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex gap-2">
        {options.map((option) => {
          const isSelected = option.value === effectiveValue;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className="relative flex-shrink-0 rounded-xl px-4 py-2.5 text-sm text-left transition-all duration-200 active:scale-[0.97] whitespace-nowrap"
              style={isSelected ? {
                background: 'rgba(55,181,255,0.13)',
                border: '1.5px solid rgba(55,181,255,0.55)',
                color: '#7dd3fc',
                fontWeight: 600,
                boxShadow: '0 2px 12px rgba(55,181,255,0.1)',
              } : {
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.55)',
              }}
            >
              {option.label}
              {isSelected && (
                <span
                  className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(55,181,255,0.35)' }}
                >
                  <svg width="7" height="5.5" viewBox="0 0 7 5.5" fill="none">
                    <path d="M0.75 2.75L2.5 4.5L6.25 0.75" stroke="#7dd3fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
