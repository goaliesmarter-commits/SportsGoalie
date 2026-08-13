'use client';

import { useEffect, useRef, useState } from 'react';

const BLUE  = '#37b5ff';
const BLUE2 = '#60cdff';
const MUTED = 'rgba(200,230,255,0.55)';

const MAX_PANEL_H = 268;

interface ThemedSelectProps {
  name: string;
  value: string;
  options: string[];
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  invalid?: boolean;
  label?: string;
  /** Base field styling, shared with the form's text inputs. */
  style?: React.CSSProperties;
}

/**
 * Dark-theme dropdown for the contact form.
 *
 * A native <select> renders its popup with the browser's own colours — the
 * highlighted row comes out light grey behind white text and hover cannot be
 * styled — so the list is rendered here as a real listbox instead.
 */
export function ThemedSelect({
  name, value, options, onChange, placeholder = 'Select…', invalid = false, label, style,
}: ThemedSelectProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [dropUp, setDropUp] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed   = useRef({ text: '', at: 0 });

  // Close on outside click / scroll away
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Keep the highlighted row in view
  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function openList() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      const below = window.innerHeight - rect.bottom;
      setDropUp(below < MAX_PANEL_H + 24 && rect.top > below);
    }
    setActive(value ? options.indexOf(value) : 0);
    setOpen(true);
  }

  function choose(i: number) {
    onChange(name, options[i]);
    setOpen(false);
    btnRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); return; }

    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); openList(); }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive(i => Math.min(i + 1, options.length - 1)); break;
      case 'ArrowUp':   e.preventDefault(); setActive(i => Math.max(i - 1, 0)); break;
      case 'Home':      e.preventDefault(); setActive(0); break;
      case 'End':       e.preventDefault(); setActive(options.length - 1); break;
      case 'Tab':       setOpen(false); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (active >= 0) choose(active);
        break;
      default:
        if (e.key.length === 1) {
          const now = e.timeStamp;
          typed.current.text = now - typed.current.at > 700 ? e.key : typed.current.text + e.key;
          typed.current.at = now;
          const hit = options.findIndex(o => o.toLowerCase().startsWith(typed.current.text.toLowerCase()));
          if (hit >= 0) setActive(hit);
        }
    }
  }

  const listId = `${name}-listbox`;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-haspopup="listbox"
        aria-label={label}
        aria-activedescendant={open && active >= 0 ? `${name}-opt-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={handleKeyDown}
        className="contact-input contact-select-trigger"
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          textAlign: 'left',
          cursor: 'pointer',
          border: invalid ? '1px solid rgba(248,113,113,0.65)' : style?.border,
          color: value ? '#fff' : 'rgba(200,230,255,0.4)',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"
          style={{ flexShrink: 0, transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke={BLUE2} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="contact-select-panel"
          style={{
            position: 'absolute',
            zIndex: 40,
            left: 0,
            right: 0,
            [dropUp ? 'bottom' : 'top']: 'calc(100% + 6px)',
            maxHeight: `${MAX_PANEL_H}px`,
          }}
        >
          {options.map((opt, i) => {
            const selected = opt === value;
            return (
              <li
                key={opt}
                id={`${name}-opt-${i}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className="contact-select-option"
                data-active={i === active ? 'true' : undefined}
                data-selected={selected ? 'true' : undefined}
              >
                <span>{opt}</span>
                {selected && (
                  <svg width="13" height="13" viewBox="0 0 12 12" aria-hidden="true" style={{ flexShrink: 0 }}>
                    <path d="M2 6.3 4.7 9 10 3.2" fill="none" stroke={BLUE} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Styles for the trigger + panel — injected once by the contact page. */
export const themedSelectCss = `
  .contact-select-trigger { -webkit-appearance: none; appearance: none; }
  .contact-select-trigger:hover { border-color: rgba(55,181,255,0.42); }

  .contact-select-panel {
    margin: 0;
    padding: 5px;
    list-style: none;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: linear-gradient(150deg, #082a4d 0%, #04182f 100%);
    border: 1px solid rgba(55,181,255,0.32);
    border-radius: 12px;
    box-shadow: 0 20px 44px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.35);
    animation: contact-select-in .14s ease-out;
  }
  @keyframes contact-select-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: none; }
  }

  .contact-select-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    min-height: 40px;
    border-radius: 8px;
    font-size: 14px;
    line-height: 1.35;
    color: ${MUTED};
    cursor: pointer;
    transition: background .12s, color .12s;
  }
  .contact-select-option[data-selected='true'] { color: ${BLUE2}; font-weight: 600; }
  .contact-select-option[data-active='true'] {
    background: rgba(55,181,255,0.16);
    color: #fff;
    box-shadow: inset 0 0 0 1px rgba(55,181,255,0.28);
  }

  .contact-select-panel::-webkit-scrollbar { width: 8px; }
  .contact-select-panel::-webkit-scrollbar-track { background: transparent; }
  .contact-select-panel::-webkit-scrollbar-thumb {
    background: rgba(55,181,255,0.28);
    border-radius: 99px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  .contact-select-panel::-webkit-scrollbar-thumb:hover { background: rgba(55,181,255,0.45); background-clip: content-box; }

  @media (max-width: 640px) {
    .contact-select-option { min-height: 44px; font-size: 15px; }
  }
`;
