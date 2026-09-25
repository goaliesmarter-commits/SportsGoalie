'use client';

import React, { useState, useMemo } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { generateParentV2IntelligenceProfile } from '@/lib/scoring/v2-baseline-scoring';
import type { ApplicationStatus } from '@/types/application';
import {
  PARENT_BASELINE_SECTIONS,
  getParentActiveQuestions,
} from '@/data/parent-baseline-profile-v1';
import type {
  PBQuestion,
  PBSection,
  PBQuestionOption,
  PBSectionKey,
} from '@/data/parent-baseline-profile-v1';
import {
  Mic,
  ChevronRight,
  ChevronLeft,
  Info,
  Check,
  Loader2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#1D9E75';
const GREEN_DARK = '#158C64';
const BLUE = '#37b5ff';
const NAVY = '#000f28';

const cardStyle: React.CSSProperties = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(29,158,117,0.14)',
  borderRadius: '16px',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
  border: 'none',
  color: '#fff',
  padding: '14px 32px',
  borderRadius: '12px',
  fontWeight: 800,
  fontSize: '16px',
  cursor: 'pointer',
  transition: 'opacity 0.2s, transform 0.2s',
  boxShadow: `0 8px 32px rgba(29,158,117,0.22)`,
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'hero' | 'privacy_gate' | 'section_intro' | 'question' | 'closing';

interface PState {
  phase: Phase;
  sectionIndex: number;
  questionIndex: number;
  responses: Record<string, string | string[]>;
  openExtras: Record<string, string>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  userName: string;
  onComplete: () => void;
  /**
   * The parent's application state, when they came in through /apply.
   * Passed so submitting the questionnaire also joins Michael's queue, in the
   * same write as the profile. See StudentBaselineQuestionnaire for the
   * reasoning — a parent applies for their goalie exactly as an adult goalie
   * applies for themselves.
   */
  applicationStatus?: ApplicationStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ParentBaselineQuestionnaire({
  userId,
  userName: _userName,
  onComplete,
  applicationStatus,
}: Props): React.ReactElement {
  const [state, setState] = useState<PState>({
    phase: 'hero',
    sectionIndex: 0,
    questionIndex: 0,
    responses: {},
    openExtras: {},
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [micTooltip, setMicTooltip] = useState<boolean>(false);

  // ── Derived state ──────────────────────────────────────────────────────────

  const currentSection: PBSection = PARENT_BASELINE_SECTIONS[state.sectionIndex];

  const activeQuestions: PBQuestion[] = useMemo(
    () => getParentActiveQuestions(currentSection, state.responses),
    [currentSection, state.responses]
  );

  const currentQuestion: PBQuestion | undefined = activeQuestions[state.questionIndex];

  const totalSections = PARENT_BASELINE_SECTIONS.length;

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
  }, [
    state.phase,
    state.sectionIndex,
    state.questionIndex,
    activeQuestions.length,
    totalSections,
  ]);

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

    if (currentQuestion.inputType === 'goalie_info') {
      const nameVal = state.responses[`${currentQuestion.id}-name`];
      return typeof nameVal === 'string' && nameVal.trim().length > 0;
    }
    if (currentQuestion.inputType === 'email_phone') {
      const emailVal = state.responses[`${currentQuestion.id}-email`];
      return typeof emailVal === 'string' && emailVal.trim().length > 0;
    }
    if (currentQuestion.inputType === 'location') {
      const cityVal = state.responses[`${currentQuestion.id}-city`];
      return typeof cityVal === 'string' && cityVal.trim().length > 0;
    }
    if (currentQuestion.inputType === 'multi_select') {
      const val = state.responses[currentQuestion.id];
      return Array.isArray(val) && val.length > 0;
    }
    if (currentQuestion.inputType === 'open_text') return true;

    const val = state.responses[currentQuestion.id];
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
      setState((prev) => ({
        ...prev,
        phase: 'section_intro',
        sectionIndex: 0,
        questionIndex: 0,
      }));
      return;
    }

    if (state.phase === 'section_intro') {
      setState((prev) => ({ ...prev, phase: 'question', questionIndex: 0 }));
      return;
    }

    if (state.phase === 'question') {
      const isLastQuestion = state.questionIndex >= activeQuestions.length - 1;

      if (!isLastQuestion) {
        setState((prev) => ({ ...prev, questionIndex: prev.questionIndex + 1 }));
        return;
      }

      const isLastSection = state.sectionIndex >= totalSections - 1;

      if (isLastSection) {
        setState((prev) => ({ ...prev, phase: 'closing' }));
        return;
      }

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
      } else {
        setState((prev) => ({
          ...prev,
          sectionIndex: prev.sectionIndex - 1,
          phase: 'question',
          questionIndex: Math.max(
            0,
            getParentActiveQuestions(
              PARENT_BASELINE_SECTIONS[prev.sectionIndex - 1],
              prev.responses
            ).length - 1
          ),
        }));
      }
      return;
    }

    if (state.phase === 'privacy_gate') {
      setState((prev) => ({ ...prev, phase: 'hero' }));
      return;
    }

    if (state.phase === 'closing') {
      const lastSectionIdx = totalSections - 1;
      const lastSection = PARENT_BASELINE_SECTIONS[lastSectionIdx];
      const lastSectionQuestions = getParentActiveQuestions(lastSection, state.responses);
      setState((prev) => ({
        ...prev,
        phase: 'question',
        sectionIndex: lastSectionIdx,
        questionIndex: Math.max(0, lastSectionQuestions.length - 1),
      }));
      return;
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const saveProfile = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const sectionKeys: PBSectionKey[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

      // Run scoring engine on raw V2 responses to produce an Intelligence Profile
      const intelligenceProfile = generateParentV2IntelligenceProfile(userId, state.responses);

      await setDoc(doc(db, 'parentBaselineProfiles', userId), {
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
      await updateDoc(doc(db, 'users', userId), {
        parentOnboardingComplete: true,
        parentOnboardingCompletedAt: serverTimestamp(),
        parentPacingLevel: intelligenceProfile.pacingLevel,
        parentOverallScore: intelligenceProfile.overallScore,
        // An applicant joins Michael's queue as their questionnaire lands (item 2).
        ...(applicationStatus === 'applying'
          ? { applicationStatus: 'submitted', applicationSubmittedAt: serverTimestamp() }
          : {}),
      });
      onComplete();
    } catch (err) {
      console.error('saveProfile failed:', err);
      setError('Unable to save your profile. Please try again.');
      setSaving(false);
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderProgressBar = (): React.ReactElement => (
    <div
      style={{
        width: '100%',
        height: '3px',
        background: 'rgba(255,255,255,0.07)',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${progressPct}%`,
          background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`,
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
        background: `rgba(29,158,117,0.15)`,
        border: `1px solid rgba(29,158,117,0.3)`,
        color: GREEN,
        fontWeight: 900,
        fontSize: `${Math.round(size * 0.44)}px`,
        flexShrink: 0,
      }}
    >
      {key}
    </div>
  );

  // ── Input renderers ────────────────────────────────────────────────────────

  const renderTextInput = (q: PBQuestion): React.ReactElement => {
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
          border: `1px solid rgba(29,158,117,0.18)`,
          borderRadius: '12px',
          color: '#fff',
          fontSize: '15px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s',
        }}
        className="pbq-input"
      />
    );
  };

  const renderGoalieInfo = (q: PBQuestion): React.ReactElement => {
    const nameVal = state.responses[`${q.id}-name`];
    const ageVal = state.responses[`${q.id}-age`];
    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="pbq-gi-row">
        <input
          type="text"
          value={typeof nameVal === 'string' ? nameVal : ''}
          onChange={(e) => setResponse(`${q.id}-name`, e.target.value)}
          placeholder="Goalie's full name"
          style={{
            flex: '1 1 200px',
            padding: '14px 16px',
            background: 'rgba(2,18,44,0.7)',
            border: `1px solid rgba(29,158,117,0.18)`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="pbq-input"
        />
        <input
          type="text"
          value={typeof ageVal === 'string' ? ageVal : ''}
          onChange={(e) => setResponse(`${q.id}-age`, e.target.value)}
          placeholder="Goalie's age"
          style={{
            flex: '0 1 140px',
            padding: '14px 16px',
            background: 'rgba(2,18,44,0.7)',
            border: `1px solid rgba(29,158,117,0.18)`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="pbq-input"
        />
      </div>
    );
  };

  const renderEmailPhone = (q: PBQuestion): React.ReactElement => {
    const emailVal = state.responses[`${q.id}-email`];
    const phoneVal = state.responses[`${q.id}-phone`];
    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="pbq-ep-row">
        <input
          type="email"
          value={typeof emailVal === 'string' ? emailVal : ''}
          onChange={(e) => setResponse(`${q.id}-email`, e.target.value)}
          placeholder="Email address"
          style={{
            flex: '1 1 200px',
            padding: '14px 16px',
            background: 'rgba(2,18,44,0.7)',
            border: `1px solid rgba(29,158,117,0.18)`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="pbq-input"
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
            border: `1px solid rgba(29,158,117,0.18)`,
            borderRadius: '12px',
            color: '#fff',
            fontSize: '15px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          className="pbq-input"
        />
      </div>
    );
  };

  const renderLocation = (q: PBQuestion): React.ReactElement => {
    const cityVal = state.responses[`${q.id}-city`];
    const stateVal = state.responses[`${q.id}-state`];
    const countryVal = state.responses[`${q.id}-country`];
    return (
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }} className="pbq-loc-row">
        {(
          [
            { key: 'city', label: 'City', val: cityVal },
            { key: 'state', label: 'State / Province', val: stateVal },
            { key: 'country', label: 'Country', val: countryVal },
          ] as { key: string; label: string; val: string | string[] | undefined }[]
        ).map(({ key, label, val }) => (
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
              border: `1px solid rgba(29,158,117,0.18)`,
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            className="pbq-input"
          />
        ))}
      </div>
    );
  };

  const renderOptionCard = (
    q: PBQuestion,
    option: PBQuestionOption,
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
          className={selected ? undefined : 'pbq-opt'}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: selected ? `2px solid ${GREEN}` : '2px solid rgba(255,255,255,0.08)',
            background: selected ? 'rgba(29,158,117,0.1)' : 'rgba(2,18,44,0.55)',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
            boxShadow: selected
              ? `0 0 0 1px rgba(29,158,117,0.22), 0 4px 16px rgba(29,158,117,0.1)`
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
              background: selected ? GREEN : 'rgba(255,255,255,0.07)',
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
              border: `1px solid rgba(29,158,117,0.25)`,
              borderRadius: '10px',
              color: '#fff',
              fontSize: '14px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              marginLeft: '46px',
              maxWidth: 'calc(100% - 46px)',
            }}
            className="pbq-textarea"
          />
        )}
      </div>
    );
  };

  const renderRadio = (q: PBQuestion): React.ReactElement => {
    const options = q.options ?? [];
    const currentRadioVal = state.responses[q.id];
    const showSub =
      q.subQuestion &&
      typeof currentRadioVal === 'string' &&
      q.subQuestion.showWhenParentValues.includes(currentRadioVal);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option, index) => renderOptionCard(q, option, index, false))}
        {showSub && q.subQuestion && (
          <div style={{ marginTop: '8px' }}>
            <p
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontSize: '13px',
                marginBottom: '8px',
                margin: '0 0 8px',
              }}
            >
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
                border: `1px solid rgba(29,158,117,0.18)`,
                borderRadius: '10px',
                color: '#fff',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              className="pbq-textarea"
            />
          </div>
        )}
      </div>
    );
  };

  const renderMultiSelect = (q: PBQuestion): React.ReactElement => {
    const options = q.options ?? [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 4px' }}>
          Select all that apply
        </p>
        {options.map((option, index) => renderOptionCard(q, option, index, true))}
      </div>
    );
  };

  const renderScale = (q: PBQuestion): React.ReactElement => {
    const currentVal = state.responses[q.id];
    const selected = typeof currentVal === 'string' ? currentVal : '';
    return (
      <div>
        <div
          style={{
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
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
                  border: isActive
                    ? `2px solid ${GREEN}`
                    : '2px solid rgba(255,255,255,0.15)',
                  background: isActive ? GREEN : 'rgba(2,18,44,0.7)',
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  fontWeight: 800,
                  fontSize: '17px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? `0 0 12px rgba(29,158,117,0.32)` : 'none',
                }}
                className="pbq-scale-dot"
              >
                {n}
              </button>
            );
          })}
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}
        >
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              maxWidth: '40%',
            }}
          >
            {q.scaleLeft}
          </span>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.4)',
              maxWidth: '40%',
              textAlign: 'right',
            }}
          >
            {q.scaleRight}
          </span>
        </div>
      </div>
    );
  };

  const renderOpenText = (q: PBQuestion): React.ReactElement => {
    const currentVal = state.responses[q.id];
    const textVal = typeof currentVal === 'string' ? currentVal : '';
    const skipOption = q.options?.find((o) => o.isSkip);

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
              border: `1px solid rgba(29,158,117,0.18)`,
              borderRadius: '12px',
              color: '#fff',
              fontSize: '15px',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
              lineHeight: 1.6,
            }}
            className="pbq-textarea"
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
                  background: 'rgba(29,158,117,0.12)',
                  border: `1px solid rgba(29,158,117,0.25)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'default',
                  color: `rgba(29,158,117,0.6)`,
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
                    border: `1px solid rgba(29,158,117,0.2)`,
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
                  ? 'rgba(29,158,117,0.12)'
                  : 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            className="pbq-skip-pill"
          >
            {skipOption.text}
          </button>
        )}
      </div>
    );
  };

  const renderInputForQuestion = (q: PBQuestion): React.ReactElement => {
    switch (q.inputType) {
      case 'text':
        return renderTextInput(q);
      case 'goalie_info':
        return renderGoalieInfo(q);
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
      case 'open_text':
        return renderOpenText(q);
      default:
        return <div />;
    }
  };

  // ── Phase renders ──────────────────────────────────────────────────────────

  const renderHero = (): React.ReactElement => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{ maxWidth: '700px', width: '100%', textAlign: 'center' }}
        className="pbq-fade"
      >
        {/* Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 14px',
            background: `rgba(29,158,117,0.12)`,
            border: `1px solid rgba(29,158,117,0.3)`,
            borderRadius: '99px',
            marginBottom: '18px',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: GREEN,
            }}
          >
            Smarter Goalie — Parent Pathway
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 'clamp(26px,5vw,46px)',
            fontWeight: 900,
            color: '#fff',
            marginBottom: '10px',
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
          }}
        >
          THE PARENT BASELINE PROFILE
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(14px,1.8vw,17px)',
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: '28px',
          }}
        >
          Your view of your goalie — the most important witness they have.
        </p>

        {/* Welcome paragraph */}
        <div style={{ ...cardStyle, padding: '24px', textAlign: 'left', marginBottom: '16px' }}>
          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.8,
              fontStyle: 'italic',
              margin: 0,
            }}
          >
            Your involvement in your goalie&rsquo;s journey matters in ways no one else can replicate. You don&rsquo;t need to be a hockey expert or have all the answers — you just need to be present. Smarter Goalie meets you where you are, and offers everything we know about this position without pressure. Thank you for being here.
          </p>
        </div>

        {/* Anchor statement — BLUE border */}
        <div
          style={{
            padding: '16px 20px',
            background: 'rgba(2,18,44,0.85)',
            border: `1px solid ${BLUE}40`,
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.7,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            <span style={{ color: BLUE, fontWeight: 700 }}>Smarter Goalie</span> was built from six decades of studying this position. What you share here helps us serve your goalie at the highest level.
          </p>
        </div>

        {/* Stats */}
        <p
          style={{
            fontSize: '13px',
            color: GREEN,
            marginBottom: '28px',
            letterSpacing: '0.04em',
          }}
        >
          48 questions &middot; 7 sections &middot; 12–18 minutes &middot; Progress saves automatically
        </p>

        {/* CTA */}
        <button onClick={goNext} style={btnPrimary} className="pbq-btn">
          BEGIN THE PARENT BASELINE PROFILE →
          <ChevronRight style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
    </div>
  );

  const renderPrivacyGate = (): React.ReactElement => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '560px', width: '100%' }} className="pbq-fade">
        <div
          style={{
            ...cardStyle,
            padding: '36px',
            textAlign: 'center',
            borderColor: `rgba(29,158,117,0.22)`,
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 18px',
              background: `rgba(29,158,117,0.12)`,
              border: `1px solid rgba(29,158,117,0.35)`,
              borderRadius: '99px',
              marginBottom: '22px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: GREEN,
              }}
            >
              PRIVACY REQUEST
            </span>
          </div>

          <p
            style={{
              fontSize: '16px',
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.75,
              marginBottom: '32px',
            }}
          >
            We ask that you complete this questionnaire alone — without your goalie present. Your
            honest, independent answers are what allow Smarter Goalie&rsquo;s system to do its work
            — comparing your view with your goalie&rsquo;s view to reveal alignment, gaps, and
            hidden strengths. This is your space. The integrity of what we build together starts here.
          </p>

          {/* Two acknowledgment cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={goNext}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: `2px solid rgba(29,158,117,0.35)`,
                background: 'rgba(29,158,117,0.08)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              className="pbq-opt"
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check style={{ width: '15px', height: '15px', color: '#fff' }} />
              </div>
              Yes — I will complete this alone
            </button>

            <button
              onClick={goNext}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: '12px',
                border: `2px solid rgba(29,158,117,0.35)`,
                background: 'rgba(29,158,117,0.08)',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                textAlign: 'left',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              className="pbq-opt"
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check style={{ width: '15px', height: '15px', color: '#fff' }} />
              </div>
              I understand the request and will honor it
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSectionIntro = (): React.ReactElement => {
    const section = PARENT_BASELINE_SECTIONS[state.sectionIndex];
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        <div style={{ maxWidth: '560px', width: '100%' }} className="pbq-fade">
          <div
            style={{
              ...cardStyle,
              padding: '32px',
              borderColor: `rgba(29,158,117,0.2)`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginBottom: '20px',
              }}
            >
              {renderSectionBadge(section.key, 44)}
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: `${GREEN}80`,
                    marginBottom: '4px',
                    margin: '0 0 4px',
                  }}
                >
                  Section {state.sectionIndex + 1} of {totalSections}
                </p>
                <h2
                  style={{
                    fontSize: 'clamp(16px,2.5vw,22px)',
                    fontWeight: 900,
                    color: '#fff',
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  {section.title}
                </h2>
              </div>
            </div>

            <p
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: section.intro ? '16px' : '24px',
                fontStyle: 'italic',
                margin: `0 0 ${section.intro ? '16px' : '24px'}`,
              }}
            >
              {section.categoryLabel}
            </p>

            {section.intro && (
              <div style={{ marginBottom: '24px' }}>
                <p
                  style={{
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.65)',
                    lineHeight: 1.75,
                    margin: 0,
                  }}
                >
                  {section.intro}
                </p>
              </div>
            )}

            <button
              onClick={goNext}
              style={{ ...btnPrimary, fontSize: '15px' }}
              className="pbq-btn"
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
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: '760px',
          margin: '0 auto',
          padding: '20px 24px 16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Section + progress */}
        <div style={{ flexShrink: 0, marginBottom: '20px' }} className="pbq-fade">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '10px',
            }}
          >
            {renderSectionBadge(sectionLetter, 32)}
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Section {state.sectionIndex + 1} of {totalSections} — Question {questionNum} of{' '}
              {totalQ}
            </p>
          </div>
          <div
            style={{
              height: '3px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round((questionNum / totalQ) * 100)}%`,
                background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK})`,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Scrollable question area */}
        <div
          style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}
          className="pbq-fade pbq-scroll"
        >
          {/* Question text + tooltip button */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(16px,2.2vw,22px)',
                fontWeight: 800,
                color: '#fff',
                lineHeight: 1.4,
                margin: 0,
                flex: 1,
              }}
            >
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
                  color: showTooltip ? GREEN : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.2s',
                }}
              >
                <Info style={{ width: '18px', height: '18px' }} />
              </button>
            )}
          </div>

          {/* subLabel */}
          {currentQuestion.subLabel && (
            <p
              style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.45)',
                marginBottom: '10px',
                fontStyle: 'italic',
              }}
            >
              {currentQuestion.subLabel}
            </p>
          )}

          {/* Tooltip panel */}
          {showTooltip && currentQuestion.tooltip && (
            <div
              style={{
                marginBottom: '12px',
                padding: '12px 14px',
                background: 'rgba(29,158,117,0.07)',
                border: `1px solid rgba(29,158,117,0.22)`,
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
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.4)',
                fontStyle: 'italic',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}
            >
              <span style={{ color: `${GREEN}cc`, fontWeight: 600 }}>Smarter Goalie: </span>
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
            className="pbq-nav-back"
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
              cursor:
                state.sectionIndex === 0 && state.questionIndex === 0
                  ? 'not-allowed'
                  : 'pointer',
              opacity:
                state.sectionIndex === 0 && state.questionIndex === 0 ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
            Back
          </button>

          <button
            onClick={goNext}
            disabled={!canProceed}
            className="pbq-nav-next"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: canProceed
                ? `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`
                : 'rgba(29,158,117,0.2)',
              border: 'none',
              color: canProceed ? '#fff' : 'rgba(255,255,255,0.3)',
              padding: '10px 24px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: canProceed ? 'pointer' : 'not-allowed',
              transition: 'opacity 0.2s',
              boxShadow: canProceed ? `0 4px 16px rgba(29,158,117,0.22)` : 'none',
            }}
          >
            Next →
            <ChevronRight style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>
    );
  };

  const renderClosing = (): React.ReactElement => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}
        className="pbq-fade"
      >
        <div style={{ ...cardStyle, padding: '36px', marginBottom: '24px' }}>
          <div
            style={{
              height: '3px',
              background: `linear-gradient(90deg, ${GREEN}, ${GREEN_DARK}, ${GREEN})`,
              borderRadius: '99px',
              marginBottom: '28px',
            }}
          />
          <p
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: `${GREEN}99`,
              marginBottom: '18px',
            }}
          >
            Profile Complete
          </p>
          <p
            style={{
              fontSize: 'clamp(15px,2vw,17px)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.85,
              margin: '0 0 18px',
            }}
          >
            You just did something most goalie parents never do. You looked at your goalie. You
            looked at yourself. You named what is working — and what you would like to grow in.
            You gave us the truth about a role that often goes unspoken. That is the work most
            parents never sit down to do.
          </p>
          <p
            style={{
              fontSize: 'clamp(15px,2vw,17px)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.85,
              margin: '0 0 18px',
            }}
          >
            You just gave us your{' '}
            <strong style={{ color: '#fff' }}>Parent Baseline Profile</strong> — the foundation
            we will build from with you, alongside your goalie, from this day forward.
          </p>
          <p
            style={{
              fontSize: 'clamp(15px,2vw,17px)',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.85,
              margin: 0,
            }}
          >
            Coach Mike personally reads every submission.{' '}
            <strong style={{ color: GREEN }}>Welcome to the Smarter Goalie way.</strong>
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
          className={saving ? undefined : 'pbq-btn'}
        >
          {saving ? (
            <>
              <Loader2
                style={{
                  width: '18px',
                  height: '18px',
                  animation: 'pbq-spin 1s linear infinite',
                }}
              />
              Saving...
            </>
          ) : (
            <>
              SUBMIT MY BASELINE PROFILE →
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
          className="pbq-prefer-not"
        >
          Go back and review
        </button>
      </div>
    </div>
  );

  // ── Phase switcher ─────────────────────────────────────────────────────────

  const renderPhase = (): React.ReactElement => {
    switch (state.phase) {
      case 'hero':
        return renderHero();
      case 'privacy_gate':
        return renderPrivacyGate();
      case 'section_intro':
        return renderSectionIntro();
      case 'question':
        return renderQuestion();
      case 'closing':
        return renderClosing();
      default:
        return <div />;
    }
  };

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .pbq-opt:hover { border-color: rgba(29,158,117,0.38) !important; background: rgba(29,158,117,0.06) !important; }
        .pbq-btn:hover { opacity: 0.88 !important; transform: scale(1.01) !important; }
        .pbq-nav-back:hover:not(:disabled) { color: rgba(255,255,255,0.8) !important; border-color: rgba(255,255,255,0.2) !important; }
        .pbq-nav-next:hover:not(:disabled) { opacity: 0.88 !important; }
        .pbq-scale-dot:hover { border-color: rgba(29,158,117,0.5) !important; background: rgba(29,158,117,0.1) !important; }
        .pbq-skip-pill:hover { background: rgba(29,158,117,0.1) !important; color: rgba(255,255,255,0.65) !important; }
        .pbq-prefer-not:hover { color: rgba(255,255,255,0.55) !important; }
        .pbq-input:focus { border-color: rgba(29,158,117,0.5) !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.1) !important; }
        .pbq-textarea:focus { border-color: rgba(29,158,117,0.42) !important; box-shadow: 0 0 0 3px rgba(29,158,117,0.08) !important; }
        @keyframes pbq-fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pbq-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pbq-fade { animation: pbq-fade-up 0.4s ease both; }
        .pbq-scroll::-webkit-scrollbar { width: 4px; }
        .pbq-scroll::-webkit-scrollbar-track { background: transparent; }
        .pbq-scroll::-webkit-scrollbar-thumb { background: rgba(29,158,117,0.15); border-radius: 4px; }
        .pbq-scroll { scrollbar-width: thin; scrollbar-color: rgba(29,158,117,0.15) transparent; }
        @media (max-width: 600px) {
          .pbq-gi-row { flex-direction: column !important; }
          .pbq-ep-row { flex-direction: column !important; }
          .pbq-loc-row { flex-direction: column !important; }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflowY: 'auto',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          color: '#fff',
          background: NAVY,
        }}
      >
        {/* Global progress bar */}
        {renderProgressBar()}

        {/* Phase content */}
        {renderPhase()}
      </div>
    </>
  );
}
