'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Flame, Target, Trophy } from 'lucide-react';
import { SkeletonCardGrid } from '@/components/ui/skeletons';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { GoalsList } from '@/components/goals/GoalsList';
import { AchievementsList } from '@/components/achievements/AchievementsList';
import { useAchievements, useProgress } from '@/hooks/useProgress';
import { useAuth } from '@/lib/auth/context';
import { ProgressService } from '@/lib/database/services/progress.service';
import { goalsService } from '@/lib/database/services/goals.service';
import { goalBaseline, goalProgress } from '@/lib/goals/progress';
import type { Goal, NewGoal } from '@/types/goals';

const BLUE = '#37b5ff';

type ActiveTab = 'goals' | 'achievements';

export default function GoalsAndAchievementsPage() {
  return (
    <ProtectedRoute>
      <GoalsAndAchievementsContent />
    </ProtectedRoute>
  );
}

function GoalsAndAchievementsContent() {
  const { user } = useAuth();
  const { userProgress, loading: progressLoading, error: progressError } = useProgress();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('goals');
  const { achievements, userAchievements, loading: achievementsLoading, error: achievementsError } = useAchievements();

  useEffect(() => {
    if (!user?.id) {
      setGoalsLoading(false);
      return;
    }
    const studentId = user.id;
    let cancelled = false;

    const loadGoals = async () => {
      setGoalsLoading(true);
      try {
        const result = await goalsService.getGoalsByStudent(studentId);
        if (cancelled) return;
        if (result.success && result.data) {
          setGoals(result.data);
          setGoalsError(null);
        } else {
          setGoalsError(result.error?.message ?? 'Your goals could not be loaded. Please refresh and try again.');
        }
      } catch {
        if (!cancelled) setGoalsError('Your goals could not be loaded. Please refresh and try again.');
      } finally {
        if (!cancelled) setGoalsLoading(false);
      }
    };

    void loadGoals();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Open goals follow the goalie's live progress; finished goals keep the value they finished on.
  const stats = userProgress?.overallStats ?? null;
  const displayGoals = useMemo(
    () => goals.map(g => ({ ...g, currentValue: goalProgress(g, stats) })),
    [goals, stats]
  );

  const completedGoalsCount = goals.filter(g => g.isCompleted).length;
  const activeGoalsCount = goals.length - completedGoalsCount;
  const goalCompletionRate = goals.length > 0 ? Math.round((completedGoalsCount / goals.length) * 100) : 0;
  const unlockedAchievements = userAchievements.filter(a => a.isCompleted).length;

  // Rejects with a message the create dialog shows; the dialog stays open so nothing typed is lost.
  const handleCreateGoal = async (goalData: NewGoal) => {
    if (!user?.id) throw new Error('Please sign in again to save a goal.');
    setActionError(null);

    // "Complete 5 skills" counts from where the goalie is today, so read the figures fresh.
    const fresh = await ProgressService.getUserProgress(user.id);
    if (!fresh.success) {
      throw new Error('We could not read your current progress, so the goal was not saved. Please try again.');
    }
    const freshStats = fresh.data?.overallStats;
    const baselineValue = freshStats ? goalBaseline(goalData.type, freshStats, goalData.unit) : 0;

    const result = await goalsService.createGoal(user.id, { ...goalData, baselineValue });
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Your goal could not be saved. Please try again.');
    }
    const { id } = result.data;
    setGoals(prev => [{ ...goalData, id, createdAt: new Date(), baselineValue }, ...prev]);
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    setActionError(null);
    const changes: Partial<Pick<Goal, 'isCompleted' | 'currentValue'>> = {};
    if (updates.isCompleted !== undefined) changes.isCompleted = updates.isCompleted;
    if (updates.currentValue !== undefined) changes.currentValue = updates.currentValue;

    const result = await goalsService.updateGoal(goalId, changes);
    if (!result.success) {
      setActionError(result.error?.message ?? 'Your goal could not be updated. Please try again.');
      return;
    }
    setGoals(prev => prev.map(g => (g.id === goalId ? { ...g, ...changes } : g)));
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!window.confirm('Delete this goal? This cannot be undone.')) return;
    setActionError(null);

    const result = await goalsService.deleteGoal(goalId);
    if (!result.success) {
      setActionError(result.error?.message ?? 'Your goal could not be deleted. Please try again.');
      return;
    }
    setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .goals-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        @media (min-width: 860px) { .goals-stats { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; } }
        .goals-tile-icon { display: none !important; }
        @media (min-width: 360px) { .goals-tile-icon { display: flex !important; } }
        .goals-tab-content { padding: 16px; }
        @media (min-width: 640px) { .goals-tab-content { padding: 24px 28px; } }
      `}</style>

      {/* Hero */}
      <section style={{ position: 'relative', minHeight: 'clamp(200px,35vw,280px)', display: 'flex', alignItems: 'flex-end', backgroundImage: "url('/goals-achieve.png')", backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,15,40,0.92) 0%, rgba(6,35,68,0.85) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, bottom: 0, background: 'linear-gradient(to top, #000f28 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 24px 32px' }}>
          <h1 style={{ fontSize: 'clamp(22px,4vw,40px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            Build Clear Goals, <span style={{ color: BLUE }}>Earn Every Milestone.</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>Stay consistent with focused learning objectives and track the achievements you unlock along the way.</p>
        </div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(16px,3vw,28px) clamp(14px,4vw,24px) 48px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Stats */}
        <div className="goals-stats">
          {[
            { label: 'Total Goals', value: goals.length, icon: <Target size={17} color={BLUE} /> },
            { label: 'Active Goals', value: activeGoalsCount, icon: <Flame size={17} color={BLUE} /> },
            { label: 'Completion Rate', value: `${goalCompletionRate}%`, icon: <CheckCircle2 size={17} color={BLUE} /> },
            { label: 'Achievements', value: unlockedAchievements, icon: <Trophy size={17} color={BLUE} /> },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: 'clamp(12px, 3.5vw, 20px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', minHeight: '130px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                <p style={{ fontSize: 'clamp(9px, 2.4vw, 10px)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 'clamp(0.3px, 0.2vw, 2px)', color: 'rgba(255,255,255,0.4)', minWidth: 0, overflowWrap: 'anywhere' }}>{s.label}</p>
                <div className="goals-tile-icon" style={{ width: 'clamp(28px, 8vw, 34px)', height: 'clamp(28px, 8vw, 34px)', borderRadius: '9px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</div>
              </div>
              <p style={{ fontSize: 'clamp(32px, 9vw, 42px)', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(2,18,44,0.8)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '12px', padding: '5px', width: 'fit-content' }}>
          {([{ key: 'goals', label: 'Goals', icon: <Target size={14} /> }, { key: 'achievements', label: 'Achievements', icon: <Trophy size={14} /> }] as { key: ActiveTab; label: string; icon: React.ReactNode }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 20px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === t.key ? BLUE : 'transparent',
                color: activeTab === t.key ? '#000f28' : 'rgba(255,255,255,0.5)',
              }}
            >{t.icon}{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="goals-tab-content" style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '18px' }}>
          {activeTab === 'goals' ? (
            <>
              {(goalsError || actionError) && (
                <p role="alert" style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px', margin: '0 0 16px 0' }}>
                  {actionError ?? goalsError}
                </p>
              )}
              {progressError && goals.some(g => !g.isCompleted) && (
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '10px 12px', margin: '0 0 16px 0' }}>
                  We could not load your latest progress, so the bars below may be out of date. Refresh to try again.
                </p>
              )}
              <GoalsList goals={displayGoals} onCreateGoal={handleCreateGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} loading={goalsLoading || progressLoading} />
            </>
          ) : (
            <>
              {achievementsLoading ? (
                <SkeletonCardGrid count={6} cols={3} />
              ) : achievementsError ? (
                <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                  <BookOpen size={48} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Unable to load achievements</h3>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{achievementsError}</p>
                </div>
              ) : (
                <AchievementsList achievements={achievements} userAchievements={userAchievements} loading={achievementsLoading} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
