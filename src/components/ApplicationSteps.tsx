'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

const BLUE2 = '#60cdff';

export interface ApplicationStep {
  /** '01', '02', '03' */
  num: string;
  text: string;
  /** Where this step takes you. Omit for steps the visitor can't action. */
  href?: string;
  /** Link wording, e.g. "Start the questionnaire". Required alongside href. */
  action?: string;
}

interface ApplicationStepsProps {
  steps: ApplicationStep[];
  /** Organization page uses a slightly stronger border than the rest. */
  borderColor?: string;
}

/**
 * The "01 / 02 / 03" application steps shown near the bottom of every role page.
 *
 * These used to be plain divs — styled as raised, bordered, rounded cards, which
 * is what a button looks like, but with nothing wired up. Michael clicked
 * "Complete the coach questionnaire" and "Coach Mike calls you personally" on the
 * Coach / Manager page and neither did anything.
 *
 * The block was copy-pasted across all five role pages, so it lives here now and
 * gets fixed once. Two rules keep it honest:
 *
 *   - a step with an href gets a pointer, a hover lift and a visible link line,
 *     so it reads as clickable and is clickable
 *   - a step without one (step 02 is always Michael's move, not the visitor's)
 *     keeps a default cursor and no link line, so it reads as information
 *
 * Nothing that looks clickable is dead, and nothing clickable looks inert.
 */
export function ApplicationSteps({ steps, borderColor = 'rgba(96,205,255,0.22)' }: ApplicationStepsProps) {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
      {steps.map((step) => {
        const isLink = Boolean(step.href);
        const isHovered = hovered === step.num;

        const card = (
          <>
            <p style={{ fontSize: '38px', fontWeight: 900, color: BLUE2, lineHeight: 1, marginBottom: '14px' }}>
              {step.num}
            </p>
            <p style={{ fontSize: '15px', color: 'rgba(155,200,228,0.9)', lineHeight: 1.65, margin: 0 }}>
              {step.text}
            </p>
            {isLink && step.action && (
              <p
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '16px',
                  marginBottom: 0,
                  fontSize: '12px',
                  fontWeight: 800,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: BLUE2,
                  borderBottom: `1px solid ${isHovered ? BLUE2 : 'rgba(96,205,255,0.35)'}`,
                  paddingBottom: '2px',
                  transition: 'border-color 0.2s',
                }}
              >
                {step.action}
                <ArrowRight size={13} strokeWidth={2.5} />
              </p>
            )}
          </>
        );

        const style: React.CSSProperties = {
          background: isLink && isHovered ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.07)',
          border: `1px solid ${isLink && isHovered ? 'rgba(96,205,255,0.5)' : borderColor}`,
          borderRadius: '16px',
          padding: '28px 24px',
          flex: '1',
          maxWidth: '240px',
          width: '100%',
          margin: '0 auto',
          textAlign: 'left',
          boxShadow: '0 2px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)',
          transform: isLink && isHovered ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'transform 0.2s, background 0.2s, border-color 0.2s',
        };

        if (!isLink) {
          return (
            <div key={step.num} style={style}>
              {card}
            </div>
          );
        }

        // A real button, not a div with an onClick — so it's reachable by keyboard
        // and announced as a control by a screen reader.
        return (
          <button
            key={step.num}
            type="button"
            onClick={() => router.push(step.href as string)}
            onMouseEnter={() => setHovered(step.num)}
            onMouseLeave={() => setHovered(null)}
            style={{ ...style, cursor: 'pointer', font: 'inherit' }}
          >
            {card}
          </button>
        );
      })}
    </div>
  );
}
