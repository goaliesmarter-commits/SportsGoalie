'use client';

import { useState } from 'react';
import { Plus, Target, Filter } from 'lucide-react';
import { GoalCard } from './GoalCard';
import { CreateGoalForm } from './CreateGoalForm';
import type { Goal, NewGoal } from '@/types/goals';

interface GoalsListProps {
  goals: Goal[];
  /** May be async. If it rejects, the message is shown in the dialog and the dialog stays open. */
  onCreateGoal?: (goal: NewGoal) => void | Promise<void>;
  onUpdateGoal?: (goalId: string, updates: Partial<Goal>) => void;
  onDeleteGoal?: (goalId: string) => void;
  loading?: boolean;
}

type TabKey = 'active' | 'completed' | 'overdue';

const BLUE = '#37b5ff';

const cardStyle: React.CSSProperties = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '14px',
  padding: '24px',
};

export function GoalsList({ goals, onCreateGoal, onUpdateGoal, onDeleteGoal, loading = false }: GoalsListProps) {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const filteredGoals = goals.filter(g => filterPriority === 'all' || g.priority === filterPriority);
  const activeGoals = filteredGoals.filter(g => !g.isCompleted);
  const completedGoals = filteredGoals.filter(g => g.isCompleted);
  const overdueGoals = activeGoals.filter(g => g.deadline && new Date() > g.deadline);

  const totalGoals = goals.length;
  const completedCount = completedGoals.length;
  const activeCount = activeGoals.length;
  const overdueCount = overdueGoals.length;

  const openCreate = () => {
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateGoal = async (goalData: NewGoal) => {
    setCreateError(null);
    try {
      await onCreateGoal?.(goalData);
      setIsCreateOpen(false);
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Your goal could not be saved. Please try again.');
    }
  };

  const allTabs: Array<{ key: TabKey; label: string }> = [
    { key: 'active', label: `Active (${activeCount})` },
    { key: 'completed', label: `Completed (${completedCount})` },
    ...(overdueCount > 0
      ? [{ key: 'overdue' as TabKey, label: `Overdue (${overdueCount})` }]
      : [] as Array<{ key: TabKey; label: string }>),
  ];

  const tabGoals: Record<TabKey, Goal[]> = {
    active: activeGoals,
    completed: completedGoals,
    overdue: overdueGoals,
  };

  const currentGoals = tabGoals[activeTab] ?? [];

  const emptyMessage = {
    active: { title: 'No active goals', body: 'Create your first learning goal to start tracking your progress.', showCreate: true },
    completed: { title: 'No completed goals yet', body: 'Complete your active goals to see them here.', showCreate: false },
    overdue: { title: 'No overdue goals', body: 'All goals are on track!', showCreate: false },
  }[activeTab];

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(55,181,255,0.3)', borderTopColor: BLUE }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Create modal */}
      {isCreateOpen && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCreateOpen(false); }}
        >
          <div style={{ background: '#00101f', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '16px', width: '100%', maxWidth: '640px', maxHeight: '85vh', overflowY: 'auto', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: '0 0 4px 0' }}>Create New Goal</h2>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Set a new learning goal to track your progress</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '2px 6px' }}>×</button>
            </div>
            {createError && (
              <p role="alert" style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px', margin: '0 0 16px 0' }}>
                {createError}
              </p>
            )}
            <CreateGoalForm onSubmit={handleCreateGoal} />
          </div>
        </div>
      )}

      {/* Stats card */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: '1 1 180px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Target style={{ width: '20px', height: '20px', color: BLUE }} />
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Learning Goals</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Set and track your learning objectives</p>
          </div>
          <button
            onClick={openCreate}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            <Plus style={{ width: '14px', height: '14px' }} />
            New Goal
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Goals', value: totalGoals, color: BLUE },
            { label: 'Completed', value: completedCount, color: '#4ade80' },
            { label: 'Active', value: activeCount, color: BLUE },
            { label: 'Overdue', value: overdueCount, color: '#f87171' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color, marginBottom: '4px' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ ...cardStyle, padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '8px' }}>
            <Filter style={{ width: '14px', height: '14px', color: BLUE }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: BLUE }}>Priority</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', borderRadius: '10px' }}>
            {['all', 'high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => setFilterPriority(p)}
                style={{
                  padding: '4px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '12px', fontWeight: 600, textTransform: 'capitalize',
                  background: filterPriority === p ? `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)` : 'transparent',
                  color: filterPriority === p ? '#fff' : 'rgba(255,255,255,0.5)',
                }}
              >
                {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div>
        <div style={{ display: 'flex', gap: '4px', padding: '6px', background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '10px', marginBottom: '16px', width: 'fit-content' }}>
          {allTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                background: activeTab === key ? `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)` : 'transparent',
                color: activeTab === key ? '#fff' : key === 'overdue' ? '#f87171' : 'rgba(255,255,255,0.5)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {currentGoals.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {currentGoals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onUpdate={onUpdateGoal} onDelete={onDeleteGoal} />
            ))}
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
            <Target style={{ width: '48px', height: '48px', color: 'rgba(55,181,255,0.4)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }}>
              {emptyMessage.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: emptyMessage.showCreate ? '0 0 20px 0' : '0' }}>
              {emptyMessage.body}
            </p>
            {emptyMessage.showCreate && (
              <button
                onClick={openCreate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Plus style={{ width: '14px', height: '14px' }} />
                Create Goal
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
