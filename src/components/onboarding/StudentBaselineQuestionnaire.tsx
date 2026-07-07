'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { generateStudentV2IntelligenceProfile } from '@/lib/scoring/v2-baseline-scoring';
import {
  STUDENT_BASELINE_SECTIONS,
  getActiveQuestions,
} from '@/data/student-baseline-profile-v2';
import type {
  V2Question,
  V2Section,
  V2QuestionOption,
  SectionKey,
} from '@/data/student-baseline-profile-v2';
import {
  Mic,
  ChevronRight,
  ChevronLeft,
  Info,
  Check,
  Loader2,
  X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const BLUE = '#37b5ff';
const AMBER = '#fbbf24';
const GREEN = '#4ade80';

const cardStyle: React.CSSProperties = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
  border: 'none',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: '12px',
  fontWeight: 800,
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'opacity 0.2s, transform 0.2s',
  boxShadow: `0 8px 32px rgba(55,181,255,0.25)`,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'hero' | 'privacy_gate' | 'section_intro' | 'question' | 'poise_note' | 'closing';

interface QState {
  phase: Phase;
  sectionIndex: number;
  questionIndex: number;
  responses: Record<string, string | string[]>;
  openExtras: Record<string, string>;
}

// ─── Draft persistence ──────────────────────────────────────────────────────
// Answers are auto-saved to localStorage so a failed submit, a dropped
// connection, or an accidental refresh never costs the user their progress
// through the full 74-question form.

const DRAFT_KEY_PREFIX = 'sbq-draft-';

function isQState(value: unknown): value is QState {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.phase === 'string' &&
    typeof v.sectionIndex === 'number' &&
    typeof v.questionIndex === 'number' &&
    typeof v.responses === 'object' &&
    typeof v.openExtras === 'object'
  );
}

function loadDraft(userId: string): QState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}${userId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isQState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveDraft(userId: string, state: QState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${DRAFT_KEY_PREFIX}${userId}`, JSON.stringify(state));
  } catch {
    // Best-effort — draft saving should never block the main flow.
  }
}

function clearDraft(userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${DRAFT_KEY_PREFIX}${userId}`);
  } catch {
    // ignore
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  userName: string;
  onComplete: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentBaselineQuestionnaire({ userId, userName: _userName, onComplete }: Props): React.ReactElement {
  const [state, setState] = useState<QState>(
    () =>
      loadDraft(userId) ?? {
        phase: 'hero',
        sectionIndex: 0,
        questionIndex: 0,
        responses: {},
        openExtras: {},
      }
  );

  // Auto-save progress so a failed submit or dropped connection never loses answers.
  useEffect(() => {
    saveDraft(userId, state);
  }, [userId, state]);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [privacyRejected, setPrivacyRejected] = useState<boolean>(false);
  const [micTooltip, setMicTooltip] = useState<boolean>(false);

  // ── Derived state ──────────────────────────────────────────────────────────

  const currentSection: V2Section = STUDENT_BASELINE_SECTIONS[state.sectionIndex];

  const activeQuestions: V2Question[] = useMemo(
    () => getActiveQuestions(currentSection, state.responses),
    [currentSection, state.responses]
  );

  const currentQuestion: V2Question | undefined = activeQuestions[state.questionIndex];

  const totalSections = STUDENT_BASELINE_SECTIONS.length;

  // ── Progress ───────────────────────────────────────────────────────────────

  const progressPct = useMemo((): number => {
    if (state.phase === 'hero' || state.phase === 'privacy_gate') return 0;
    if (state.phase === 'closing') return 100;
    const sectionContrib = state.sectionIndex / totalSections;
    const questionContrib =
      activeQuestions.length > 0
        ? state.questionIndex / activeQuestions.length / totalSections
        : 0;
    return Math.round((sectionContrib + questionContrib) * 100);
  }, [state.phase, state.sectionIndex, state.questionIndex, activeQuestions.length, totalSections]);

  // ── Response helpers ───────────────────────────────────────────────────────

  const setResponse = (key: string, value: string | string[]): void => {
    setState((prev) => ({
      ...prev,
      responses: { ...prev.responses, [key]: value },
    }));
  };

  const setOpenExtra = (key: string, value: string): void => {
    setState((prev) => ({
      ...prev,
      openExtras: { ...prev.openExtras, [key]: value },
    }));
  };

  const toggleMultiSelect = (questionId: string, optionId: string): void => {
    const current = state.responses[questionId];
    const arr: string[] = Array.isArray(current) ? current : [];
    const next = arr.includes(optionId)
      ? arr.filter((v) => v !== optionId)
      : [...arr, optionId];
    setResponse(questionId, next);
  };

  // ── canProceed ─────────────────────────────────────────────────────────────

  const canProceed = useMemo((): boolean => {
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;

    const val = state.responses[currentQuestion.id];

    if (currentQuestion.inputType === 'email_phone') {
      const emailVal = state.responses[`${currentQuestion.id}-email`];
      return typeof emailVal === 'string' && emailVal.trim().length > 0;
    }
    if (currentQuestion.inputType === 'location') {
      const cityVal = state.responses[`${currentQuestion.id}-city`];
      return typeof cityVal === 'string' && cityVal.trim().length > 0;
    }
    if (currentQuestion.inputType === 'multi_select') {
      return Array.isArray(val) && val.length > 0;
    }
    if (currentQuestion.inputType === 'open_text') return true; // open_text with skip always passable
    if (!val) return false;
    if (typeof val === 'string') return val.trim().length > 0;
    return Array.isArray(val) && val.length > 0;
  }, [currentQuestion, state.responses]);

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = (): void => {
    setShowTooltip(false);

    if (state.phase === 'hero') {
      setState((prev) => ({ ...prev, phase: 'privacy_gate' }));
      return;
    }

    if (state.phase === 'privacy_gate') {
      setState((prev) => ({ ...prev, phase: 'section_intro', sectionIndex: 0, questionIndex: 0 }));
      return;
    }

    if (state.phase === 'section_intro') {
      setState((prev) => ({ ...prev, phase: 'question', questionIndex: 0 }));
      return;
    }

    if (state.phase === 'poise_note') {
      setState((prev) => ({ ...prev, phase: 'section_intro', sectionIndex: 1 }));
      return;
    }

    if (state.phase === 'question') {
      const isLastQuestion = state.questionIndex >= activeQuestions.length - 1;

      if (!isLastQuestion) {
        setState((prev) => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
        return;
      }

      // Last question of this section
      const isLastSection = state.sectionIndex >= totalSections - 1;

      if (isLastSection) {
        setState((prev) => ({ ...prev, phase: 'closing' }));
        return;
      }

      // After section A → poise note
      if (currentSection.key === 'A') {
        setState((prev) => ({ ...prev, phase: 'poise_note' }));
        return;
      }

      // Next section intro
      setState((prev) => ({
        ...prev,
        phase: 'section_intro',
        sectionIndex: prev.sectionIndex + 1,
        questionIndex: 0,
      }));
      return;
    }
  };

  const goBack = (): void => {
    setShowTooltip(false);

    if (state.phase === 'question') {
      if (state.questionIndex > 0) {
        setState((prev) => ({ ...prev, questionIndex: prev.questionIndex - 1 }));
        return;
      }
      // First question of a section — go back to section intro
      if (state.sectionIndex === 0) {
        setState((prev) => ({ ...prev, phase: 'privacy_gate' }));
      } else {
        setState((prev) => ({ ...prev, phase: 'section_intro' }));
      }
      return;
    }

    if (state.phase === 'section_intro') {
      if (state.sectionIndex === 0) {
        setState((prev) => ({ ...prev, phase: 'privacy_gate' }));
      } else if (state.sectionIndex === 1) {
        setState((prev) => ({ ...prev, phase: 'poise_note' }));
      } else {
        setState((prev) => ({
          ...prev,
          sectionIndex: prev.sectionIndex - 1,
          phase: 'question',
          questionIndex: Math.max(
            0,
            getActiveQuestions(STUDENT_BASELINE_SECTIONS[prev.sectionIndex - 1], prev.responses).length - 1
          ),
        }));
      }
      return;
    }

    if (state.phase === 'poise_note') {
      setState((prev) => ({
        ...prev,
        phase: 'question',
        sectionIndex: 0,
        questionIndex: Math.max(0, getActiveQuestions(STUDENT_BASELINE_SECTIONS[0], prev.responses).length - 1),
      }));
      return;
    }

    if (state.phase === 'closing') {
      const lastSectionIdx = totalSections - 1;
      const lastSection = STUDENT_BASELINE_SECTIONS[lastSectionIdx];
      const lastSectionQuestions = getActiveQuestions(lastSection, state.responses);
      setState((prev) => ({
        ...prev,
        phase: 'question',
        sectionIndex: lastSectionIdx,
        questionIndex: Math.max(0, lastSectionQuestions.length - 1),
      }));
      return;
    }

    if (state.phase === 'privacy_gate') {
      setState((prev) => ({ ...prev, phase: 'hero' }));
      return;
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const MAX_SAVE_ATTEMPTS = 3;

  const attemptSaveProfile = async (): Promise<void> => {
    const sectionKeys: SectionKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    // Run scoring engine on raw V2 responses to produce an Intelligence Profile
    const intelligenceProfile = generateStudentV2IntelligenceProfile(userId, state.responses);

    // Write both documents atomically — either both land or neither does, so a
    // partial failure can never strand the account in a half-onboarded state.
    const batch = writeBatch(db);
    batch.set(doc(db, 'studentBaselineProfiles', userId), {
      userId,
      submittedAt: serverTimestamp(),
      responses: state.responses,
      openExtras: state.openExtras,
      sectionsCompleted: sectionKeys,
      intelligenceProfile: {
        overallScore: intelligenceProfile.overallScore,
        pacingLevel: intelligenceProfile.pacingLevel,
        categoryScores: intelligenceProfile.categoryScores,
        identifiedGaps: intelligenceProfile.identifiedGaps,
        identifiedStrengths: intelligenceProfile.identifiedStrengths,
        contentRecommendations: intelligenceProfile.contentRecommendations,
        chartingEmphasis: intelligenceProfile.chartingEmphasis,
      },
    });
    batch.update(doc(db, 'users', userId), {
      onboardingCompleted: true,
      onboardingCompletedAt: serverTimestamp(),
      pacingLevel: intelligenceProfile.pacingLevel,
      overallScore: intelligenceProfile.overallScore,
    });
    await batch.commit();
  };

  const saveProfile = async (): Promise<void> => {
    setSaving(true);
    setError(null);

    for (let attempt = 1; attempt <= MAX_SAVE_ATTEMPTS; attempt++) {
      try {
        await attemptSaveProfile();
        clearDraft(userId);
        onComplete();
        return;
      } catch (err) {
        console.error(`saveProfile attempt ${attempt} failed:`, err);
        if (attempt === MAX_SAVE_ATTEMPTS) {
          setError(
            'Unable to save your profile — please check your internet connection and try again. Your answers are saved on this device, so nothing will be lost.'
          );
          setSaving(false);
        } else {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderProgressBar = (): React.ReactElement => (
    <div style={{ width: '100%', height: '3px', background: 'rgba(255,255,255,0.07)', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progressPct}%`,
          background: `linear-gradient(90deg, ${BLUE}, #0ea5e9)`,
          transition: 'width 0.5s ease',
          borderRadius: '99px',
        }}
      />
    </div>
  );

  const renderSectionBadge = (key: string, size: number = 36): React.ReactElement => (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '10px',
        background: `rgba(55,181,255,0.15)`,
        border: `1px solid rgba(55,181,255,0.3)`,
        color: BLUE,
        fontWeight: 900,
        fontSize: `${Math.round(size * 0.44)}px`,
        flexShrink: 0,
      }}
    >
      {key}
    </div>
  );

  // ── Input renderers ────────────────────────────────────────────────────────

  const renderTextInput = (q: V2Question): React.ReactElement => {
    const val = state.responses[q.id];
    return (
      <input
        type="text"
        value={typeof val === 'string' ? val : ''}
        onChange={(e) => setResponse(q.id, e.target.value)}
        placeholder="Type your answer here..."
        style={{
          width: '100%',
          padding: '14px 16px',
          background: 'rgba(2,18,44,0.7)',
          border: `1px solid rgba(55,181,255,0.18)`,
          borderRadius: '12px',
          color: '#fff',
          fontSize: '15px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
        className="sbq-input"
      />
    );
  };

  const renderEmailPhone = (q: V2Question): React.ReactElement => {
    const emailVal = state.responses[`${q.id}-email`];
    const phoneVal = state.responses[`${q.id}-phone`];
    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="email"
          value={typeof emailVal === 'string' ? emailVal : ''}
          onChange={(e) => setResponse(`${q.id}-email`, e.target.value)}
          placeholder="Email address"
          style={{
            flex: '1 1 200px',
            padding: '14px 16px',
            background: 'rgba(2,18,44,0.7)',
            border: `1px solid rgba(55,181,255,0.18)`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="sbq-input"
        />
        <input
          type="tel"
          value={typeof phoneVal === 'string' ? phoneVal : ''}
          onChange={(e) => setResponse(`${q.id}-phone`, e.target.value)}
          placeholder="Phone number"
          style={{
            flex: '1 1 200px',
            padding: '14px 16px',
            background: 'rgba(2,18,44,0.7)',
            border: `1px solid rgba(55,181,255,0.18)`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="sbq-input"
        />
      </div>
    );
  };

  const renderLocation = (q: V2Question): React.ReactElement => {
    const cityVal = state.responses[`${q.id}-city`];
    const stateVal = state.responses[`${q.id}-state`];
    const countryVal = state.responses[`${q.id}-country`];
    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { key: 'city', label: 'City', val: cityVal },
          { key: 'state', label: 'State / Province', val: stateVal },
          { key: 'country', label: 'Country', val: countryVal },
        ].map(({ key, label, val }) => (
          <input
            key={key}
            type="text"
            value={typeof val === 'string' ? val : ''}
            onChange={(e) => setResponse(`${q.id}-${key}`, e.target.value)}
            placeholder={label}
            style={{
              flex: '1 1 150px',
              padding: '14px 16px',
              background: 'rgba(2,18,44,0.7)',
              border: `1px solid rgba(55,181,255,0.18)`,
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            className="sbq-input"
          />
        ))}
      </div>
    );
  };

  const renderOptionCard = (
    q: V2Question,
    option: V2QuestionOption,
    index: number,
    isMulti: boolean
  ): React.ReactElement => {
    const currentVal = state.responses[q.id];
    const selected = isMulti
      ? Array.isArray(currentVal) && currentVal.includes(option.id)
      : currentVal === option.id;

    const letter = String.fromCharCode(65 + index);
    const extraKey = `${q.id}::${option.id}`;
    const extraVal = state.openExtras[extraKey] ?? '';

    const handleClick = (): void => {
      if (isMulti) {
        toggleMultiSelect(q.id, option.id);
      } else {
        setResponse(q.id, option.id);
      }
    };

    return (
      <div key={option.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={handleClick}
          className={selected ? undefined : 'sbq-opt'}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: selected ? `2px solid ${BLUE}` : '2px solid rgba(255,255,255,0.08)',
            background: selected ? 'rgba(55,181,255,0.1)' : 'rgba(2,18,44,0.55)',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
            boxShadow: selected
              ? `0 0 0 1px rgba(55,181,255,0.25), 0 4px 16px rgba(55,181,255,0.12)`
              : 'none',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '14px',
              transition: 'all 0.2s',
              background: selected ? BLUE : 'rgba(255,255,255,0.07)',
              color: selected ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            {selected ? <Check style={{ width: '16px', height: '16px' }} /> : letter}
          </div>
          <span
            style={{
              flex: 1,
              fontWeight: 600,
              fontSize: '15px',
              color: selected ? '#fff' : 'rgba(255,255,255,0.75)',
            }}
          >
            {option.text}
          </span>
        </button>

        {option.hasOpenText && selected && (
          <textarea
            value={extraVal}
            onChange={(e) => setOpenExtra(extraKey, e.target.value)}
            placeholder="Tell us in your own words..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: 'rgba(2,18,44,0.7)',
              border: `1px solid rgba(55,181,255,0.25)`,
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              marginLeft: '46px',
              maxWidth: 'calc(100% - 46px)',
            }}
            className="sbq-textarea"
          />
        )}
      </div>
    );
  };

  const renderRadio = (q: V2Question): React.ReactElement => {
    const options = q.options ?? [];
    const currentRadioVal = state.responses[q.id];
    const showSub =
      q.subQuestion &&
      typeof currentRadioVal === 'string' &&
      q.subQuestion.showWhenParentValues.includes(currentRadioVal);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option, index) =>
          renderOptionCard(q, option, index, false)
        )}
        {showSub && q.subQuestion && (
          <div style={{ marginTop: '8px' }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', marginBottom: '8px' }}>
              {q.subQuestion.question}
            </p>
            <textarea
              value={state.openExtras[`${q.id}::sub`] ?? ''}
              onChange={(e) => setOpenExtra(`${q.id}::sub`, e.target.value)}
              placeholder="Write your answer here..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(2,18,44,0.7)',
                border: `1px solid rgba(55,181,255,0.18)`,
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              className="sbq-textarea"
            />
          </div>
        )}
      </div>
    );
  };

  const renderMultiSelect = (q: V2Question): React.ReactElement => {
    const options = q.options ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 4px' }}>
          Select all that apply
        </p>
        {options.map((option, index) =>
          renderOptionCard(q, option, index, true)
        )}
      </div>
    );
  };

  const renderScale = (q: V2Question): React.ReactElement => {
    const currentVal = state.responses[q.id];
    const selected = typeof currentVal === 'string' ? currentVal : '';
    return (
      <div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '12px' }}>
          {['1', '2', '3', '4', '5'].map((n) => {
            const isActive = selected === n;
            return (
              <button
                key={n}
                onClick={() => setResponse(q.id, n)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  border: isActive ? `2px solid ${BLUE}` : '2px solid rgba(255,255,255,0.15)',
                  background: isActive ? BLUE : 'rgba(2,18,44,0.7)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontWeight: 800,
                  fontSize: '17px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? `0 0 12px rgba(55,181,255,0.35)` : 'none',
                }}
                className="sbq-scale-dot"
              >
                {n}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '40%' }}>
            {q.scaleLeft}
          </span>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', maxWidth: '40%', textAlign: 'right' }}>
            {q.scaleRight}
          </span>
        </div>
      </div>
    );
  };

  const renderScale3 = (q: V2Question): React.ReactElement => {
    const currentVal = state.responses[q.id];
    const selected = typeof currentVal === 'string' ? currentVal : '';
    const opts: Array<{ value: string; label: string | undefined }> = [
      { value: '1', label: q.scaleLeft },
      { value: '2', label: q.scaleMid },
      { value: '3', label: q.scaleRight },
    ];
    return (
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {opts.map(({ value, label }) => {
          const isActive = selected === value;
          return (
            <button
              key={value}
              onClick={() => setResponse(q.id, value)}
              style={{
                flex: '1 1 120px',
                padding: '14px 12px',
                borderRadius: '12px',
                border: isActive ? `2px solid ${BLUE}` : '2px solid rgba(255,255,255,0.1)',
                background: isActive ? 'rgba(55,181,255,0.12)' : 'rgba(2,18,44,0.6)',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'center',
                boxShadow: isActive ? `0 0 12px rgba(55,181,255,0.25)` : 'none',
              }}
              className="sbq-scale3-btn"
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderOpenText = (q: V2Question): React.ReactElement => {
    const currentVal = state.responses[q.id];
    const textVal = typeof currentVal === 'string' ? currentVal : '';
    const skipOption = q.options?.find((o) => o.isSkip);
    const preferNotOption = q.options?.find((o) => o.isPreferNot);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative' }}>
          <textarea
            value={textVal}
            onChange={(e) => setResponse(q.id, e.target.value)}
            placeholder="Write your answer here..."
            rows={5}
            style={{
              width: '100%',
              padding: '14px 50px 14px 14px',
              background: 'rgba(2,18,44,0.7)',
              border: `1px solid rgba(55,181,255,0.18)`,
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
            className="sbq-textarea"
          />
          <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
            <div style={{ position: 'relative' }}>
              <button
                onMouseEnter={() => setMicTooltip(true)}
                onMouseLeave={() => setMicTooltip(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(55,181,255,0.12)',
                  border: `1px solid rgba(55,181,255,0.25)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  color: 'rgba(55,181,255,0.6)',
                }}
              >
                <Mic style={{ width: '15px', height: '15px' }} />
              </button>
              {micTooltip && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '38px',
                    right: 0,
                    background: 'rgba(2,18,44,0.95)',
                    border: `1px solid rgba(55,181,255,0.2)`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.6)',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                  }}
                >
                  Voice recording — Coming Soon
                </div>
              )}
            </div>
          </div>
        </div>

        {skipOption && (
          <button
            onClick={() => setResponse(q.id, skipOption.id)}
            style={{
              alignSelf: 'flex-start',
              padding: '7px 16px',
              borderRadius: '99px',
              border: `1px solid rgba(255,255,255,0.15)`,
              background:
                textVal === skipOption.id
                  ? 'rgba(55,181,255,0.12)'
                  : 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            className="sbq-skip-pill"
          >
            {skipOption.text}
          </button>
        )}

        {preferNotOption && (
          <button
            onClick={() => setResponse(q.id, preferNotOption.id)}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              transition: 'color 0.2s',
            }}
            className="sbq-prefer-not"
          >
            {preferNotOption.text}
          </button>
        )}
      </div>
    );
  };

  const renderInputForQuestion = (q: V2Question): React.ReactElement => {
    switch (q.inputType) {
      case 'text':
        return renderTextInput(q);
      case 'email_phone':
        return renderEmailPhone(q);
      case 'location':
        return renderLocation(q);
      case 'radio':
        return renderRadio(q);
      case 'multi_select':
        return renderMultiSelect(q);
      case 'scale':
        return renderScale(q);
      case 'scale_3':
        return renderScale3(q);
      case 'open_text':
        return renderOpenText(q);
      default:
        return <div />;
    }
  };

  // ── Phase renders ──────────────────────────────────────────────────────────

  const renderHero = (): React.ReactElement => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '660px', width: '100%', textAlign: 'center' }} className="sbq-fade">
        <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: `${BLUE}99`, marginBottom: '14px' }}>
          Smarter Goalie
        </p>
        <h1 style={{ fontSize: 'clamp(26px,5vw,44px)', fontWeight: 900, color: '#fff', marginBottom: '10px', lineHeight: 1.1, letterSpacing: '-0.01em' }}>
          THE STUDENT BASELINE PROFILE
        </h1>
        <p style={{ fontSize: 'clamp(14px,1.8vw,17px)', fontStyle: 'italic', color: 'rgba(255,255,255,0.55)', marginBottom: '28px' }}>
          Tell us who you are and what brought you here.
        </p>

        <div style={{ ...cardStyle, padding: '24px', textAlign: 'left', marginBottom: '20px' }}>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, fontStyle: 'italic', margin: 0 }}>
            Welcome. This is the first conversation Smarter Goalie has with you. There are no wrong answers. There is no rush. There is no judgment. Some questions you will know exactly how to answer. Others you might think about, and that is okay too. If a question is not clear, click the &lsquo;?&rsquo; next to it for help. If you are not sure how to answer, &ldquo;I&apos;m not sure yet&rdquo; is always available — and it is just as valuable as any other answer. We are here to know you. So we can build with you.
          </p>
        </div>

        <div
          style={{
            ...cardStyle,
            padding: '18px 22px',
            border: `1px solid rgba(55,181,255,0.28)`,
            marginBottom: '20px',
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, margin: 0 }}>
            <span style={{ color: BLUE, fontWeight: 700 }}>Smarter Goalie</span> was built from six decades of learning, observing, and refining the position. What you are about to build with us is the product of that work.
          </p>
        </div>

        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', marginBottom: '24px' }}>
          74 questions &middot; 8 sections &middot; 18–25 minutes &middot; Progress saves automatically
        </p>

        <button
          onClick={goNext}
          style={btnPrimary}
          className="sbq-btn sbq-cta"
        >
          BEGIN THE STUDENT BASELINE PROFILE
          <ChevronRight style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
    </div>
  );

  const renderPrivacyGate = (): React.ReactElement => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '540px', width: '100%' }} className="sbq-fade">
        <div style={{ ...cardStyle, padding: '32px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 16px',
              background: `${AMBER}18`,
              border: `1px solid ${AMBER}40`,
              borderRadius: '99px',
              marginBottom: '20px',
            }}
          >
            <span style={{ color: AMBER, fontWeight: 800, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              IMPORTANT
            </span>
          </div>

          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.75, marginBottom: '32px' }}>
            This must be completed by <strong style={{ color: '#fff' }}>you alone</strong>. Please do not have anyone with you while you answer. Your honest, independent answers are what make Smarter Goalie work.
          </p>

          {privacyRejected && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(251,191,36,0.08)',
                border: `1px solid ${AMBER}30`,
                borderRadius: '10px',
                marginBottom: '20px',
              }}
            >
              <p style={{ color: AMBER, fontSize: '14px', margin: 0 }}>
                Please come back when you are alone.
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => {
                setPrivacyRejected(false);
                goNext();
              }}
              style={{
                ...btnPrimary,
                background: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`,
                boxShadow: '0 8px 24px rgba(34,197,94,0.2)',
                justifyContent: 'center',
                fontSize: '15px',
                padding: '14px 24px',
              }}
              className="sbq-btn"
            >
              <Check style={{ width: '18px', height: '18px' }} />
              Yes — I am completing this on my own
            </button>
            <button
              onClick={() => setPrivacyRejected(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.45)',
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              className="sbq-btn-ghost"
            >
              <X style={{ width: '16px', height: '16px' }} />
              No — someone is with me
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPoiseNote = (): React.ReactElement => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '600px', width: '100%' }} className="sbq-fade">
        <div style={{ ...cardStyle, padding: '36px', borderColor: `rgba(55,181,255,0.22)` }} className="sbq-card-pad">
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${BLUE}, #0ea5e9, transparent)`, borderRadius: '99px', marginBottom: '28px' }} />
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: `${BLUE}99`, marginBottom: '18px' }}>
            A note before you continue
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '20px' }}>
            If you are feeling pressure answering these questions — that pressure is not coming from us. It is coming from you. And that brings us to your first lesson at Smarter Goalie:
          </p>
          <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
            Relax. Stay focused. Answer with purpose.
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '20px' }}>
            The state you are reaching for — on the ice and off the ice — has a name:{' '}
            <strong style={{ color: BLUE }}>POISE</strong>.
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '20px' }}>
            Calm on the outside. Steady on the inside. Reacting with purpose, not panic.
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, marginBottom: '28px' }}>
            Poise is not the absence of pressure. It is the presence of control in the face of it. It is the state we want you to live in — and it begins right now, with this conversation.
          </p>
          <button
            onClick={goNext}
            style={{ ...btnPrimary, fontSize: '15px' }}
            className="sbq-btn sbq-cta"
          >
            CONTINUE
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderSectionIntro = (): React.ReactElement => {
    const section = STUDENT_BASELINE_SECTIONS[state.sectionIndex];
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '560px', width: '100%' }} className="sbq-fade">
          <div style={{ ...cardStyle, padding: '32px', borderColor: `rgba(55,181,255,0.2)` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              {renderSectionBadge(section.key, 44)}
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `${BLUE}80`, marginBottom: '4px' }}>
                  Section {state.sectionIndex + 1} of {totalSections}
                </p>
                <h2 style={{ fontSize: 'clamp(16px,2.5vw,22px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, margin: 0 }}>
                  {section.title}
                </h2>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: section.intro ? '16px' : '24px', fontStyle: 'italic' }}>
              {section.categoryLabel}
            </p>

            {section.intro && (
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, marginBottom: '24px' }}>
                {section.intro}
              </p>
            )}

            <button
              onClick={goNext}
              style={{ ...btnPrimary, fontSize: '15px' }}
              className="sbq-btn sbq-cta"
            >
              START SECTION {section.key}
              <ChevronRight style={{ width: '16px', height: '16px' }} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuestion = (): React.ReactElement => {
    if (!currentQuestion) return <div />;

    const sectionLetter = currentSection.key;
    const questionNum = state.questionIndex + 1;
    const totalQ = activeQuestions.length;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '760px', margin: '0 auto', padding: '20px 24px 16px', boxSizing: 'border-box' }}>

        {/* Section + progress */}
        <div style={{ flexShrink: 0, marginBottom: '20px' }} className="sbq-fade">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            {renderSectionBadge(sectionLetter, 32)}
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Section {state.sectionIndex + 1} of {totalSections} — Question {questionNum} of {totalQ}
            </p>
          </div>
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${Math.round((questionNum / totalQ) * 100)}%`,
                background: `linear-gradient(90deg, ${BLUE}, #0ea5e9)`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Question */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }} className="sbq-fade sbq-scroll">
          {/* Question text */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: 'clamp(16px,2.2vw,22px)', fontWeight: 800, color: '#fff', lineHeight: 1.4, margin: 0, flex: 1 }}>
              {currentQuestion.question}
            </h2>
            {currentQuestion.tooltip && (
              <button
                onClick={() => setShowTooltip((s) => !s)}
                style={{
                  flexShrink: 0,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  marginTop: '2px',
                  color: showTooltip ? BLUE : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.2s',
                }}
              >
                <Info style={{ width: '18px', height: '18px' }} />
              </button>
            )}
          </div>

          {/* subLabel */}
          {currentQuestion.subLabel && (
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.45)', marginBottom: '10px', fontStyle: 'italic' }}>
              {currentQuestion.subLabel}
            </p>
          )}

          {/* Tooltip */}
          {showTooltip && currentQuestion.tooltip && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px 14px',
                background: 'rgba(55,181,255,0.07)',
                border: `1px solid rgba(55,181,255,0.2)`,
                borderRadius: '10px',
                fontSize: '13px',
                color: 'rgba(255,255,255,0.6)',
                lineHeight: 1.55,
              }}
            >
              {currentQuestion.tooltip}
            </div>
          )}

          {/* Note */}
          {currentQuestion.note && (
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', marginBottom: '16px', lineHeight: 1.6 }}>
              <span style={{ color: `${BLUE}99`, fontWeight: 600 }}>Smarter Goalie: </span>
              {currentQuestion.note}
            </p>
          )}

          {/* Input */}
          <div style={{ marginBottom: '16px' }}>
            {renderInputForQuestion(currentQuestion)}
          </div>
        </div>

        {/* Nav */}
        <div
          style={{
            flexShrink: 0,
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <button
            onClick={goBack}
            disabled={state.sectionIndex === 0 && state.questionIndex === 0}
            className="sbq-nav-back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.45)',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: state.sectionIndex === 0 && state.questionIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: state.sectionIndex === 0 && state.questionIndex === 0 ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={!canProceed}
            className="sbq-nav-next"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: canProceed
                ? `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`
                : 'rgba(55,181,255,0.25)',
              border: 'none',
              color: '#fff',
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.2s',
              boxShadow: canProceed ? `0 4px 16px rgba(55,181,255,0.25)` : 'none',
            }}
          >
            Next
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    );
  };

  const renderClosing = (): React.ReactElement => (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '620px', width: '100%', textAlign: 'center' }} className="sbq-fade">
        <div style={{ ...cardStyle, padding: '36px', marginBottom: '24px' }} className="sbq-card-pad">
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${GREEN}, #0ea5e9, ${BLUE})`, borderRadius: '99px', marginBottom: '28px' }} />
          <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: `${GREEN}99`, marginBottom: '18px' }}>
            Section Complete
          </p>
          <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.85, marginBottom: '0' }}>
            You just did something most goalies never do. You looked at yourself. Honestly. Across your sport background, your journey, your inner game, your strengths, your gaps, your voices, your motivation. That is the work most never sit down to do.
          </p>
          <br />
          <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.85, marginBottom: '0' }}>
            You just gave us your <strong style={{ color: '#fff' }}>Student Baseline Profile</strong> — the foundation we will build from with you, from this day forward.
          </p>
          <br />
          <p style={{ fontSize: 'clamp(15px,2vw,17px)', color: 'rgba(255,255,255,0.7)', lineHeight: 1.85, marginBottom: '0' }}>
            Coach Mike personally reads every submission. <strong style={{ color: BLUE }}>Welcome to the Smarter Goalie way.</strong>
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '10px',
              marginBottom: '16px',
            }}
          >
            <p style={{ color: '#ef4444', fontSize: '14px', margin: 0 }}>{error}</p>
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={saving}
          style={{
            ...btnPrimary,
            opacity: saving ? 0.75 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '15px',
          }}
          className={saving ? 'sbq-cta' : 'sbq-btn sbq-cta'}
        >
          {saving ? (
            <>
              <Loader2 style={{ width: '18px', height: '18px', animation: 'sbq-spin 1s linear infinite' }} />
              Saving...
            </>
          ) : (
            <>
              SUBMIT MY BASELINE PROFILE
              <ChevronRight style={{ width: '18px', height: '18px' }} />
            </>
          )}
        </button>

        <button
          onClick={goBack}
          style={{
            display: 'block',
            margin: '14px auto 0',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: '13px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
          className="sbq-prefer-not"
        >
          Go back and review
        </button>
      </div>
    </div>
  );

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .sbq-opt:hover { border-color: rgba(55,181,255,0.35) !important; background: rgba(55,181,255,0.05) !important; }
        .sbq-btn:hover { opacity: 0.88 !important; transform: scale(1.01) !important; }
        .sbq-btn-ghost:hover { background: rgba(255,255,255,0.07) !important; color: rgba(255,255,255,0.65) !important; }
        .sbq-nav-back:hover:not(:disabled) { color: rgba(255,255,255,0.8) !important; border-color: rgba(255,255,255,0.2) !important; }
        .sbq-nav-next:hover:not(:disabled) { opacity: 0.88 !important; }
        .sbq-scale-dot:hover { border-color: rgba(55,181,255,0.5) !important; background: rgba(55,181,255,0.08) !important; }
        .sbq-scale3-btn:hover { border-color: rgba(55,181,255,0.35) !important; background: rgba(55,181,255,0.06) !important; }
        .sbq-skip-pill:hover { background: rgba(55,181,255,0.08) !important; color: rgba(255,255,255,0.65) !important; }
        .sbq-prefer-not:hover { color: rgba(255,255,255,0.55) !important; }
        .sbq-input:focus { border-color: rgba(55,181,255,0.5) !important; box-shadow: 0 0 0 3px rgba(55,181,255,0.1) !important; }
        .sbq-textarea:focus { border-color: rgba(55,181,255,0.4) !important; box-shadow: 0 0 0 3px rgba(55,181,255,0.08) !important; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sbq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .sbq-fade { animation: fade-up 0.4s ease both; }
        .sbq-scroll::-webkit-scrollbar { width: 4px; }
        .sbq-scroll::-webkit-scrollbar-track { background: transparent; }
        .sbq-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
        .sbq-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.12) transparent; }
        @media (max-width: 600px) {
          .sbq-ep-row { flex-direction: column !important; }
          .sbq-loc-row { flex-direction: column !important; }
        }
        @media (max-width: 480px) {
          .sbq-cta { width: 100% !important; justify-content: center !important; box-sizing: border-box !important; }
          .sbq-card-pad { padding: 20px !important; }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflowY: 'auto',
        }}
      >
        {/* Global progress bar */}
        {renderProgressBar()}

        {/* Phase content */}
        {state.phase === 'hero' && renderHero()}
        {state.phase === 'privacy_gate' && renderPrivacyGate()}
        {state.phase === 'poise_note' && renderPoiseNote()}
        {state.phase === 'section_intro' && renderSectionIntro()}
        {state.phase === 'question' && renderQuestion()}
        {state.phase === 'closing' && renderClosing()}
      </div>
    </>
  );
}
