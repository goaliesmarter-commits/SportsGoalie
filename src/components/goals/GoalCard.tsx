'use client';

import { Calendar, Target, Clock, CheckCircle, Circle } from 'lucide-react';
import type { Goal } from '@/types/goals';
import { formatDeadline } from '@/lib/goals/deadline';

interface GoalCardProps {
  goal: Goal;
  onUpdate?: (goalId: string, updates: Partial<Goal>) => void;
  onDelete?: (goalId: string) => void;
}

const BLUE = '#37b5ff';

export function GoalCard({ goal, onUpdate, onDelete }: GoalCardProps) {
  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
  const isOverdue = goal.deadline && new Date() > goal.deadline && !goal.isCompleted;

  const getPriorityStyle = (priority: string): React.CSSProperties => {
    switch (priority) {
      case 'high':
        return { background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' };
      case 'medium':
        return { background: 'rgba(55,181,255,0.12)', color: BLUE, border: `1px solid rgba(55,181,255,0.3)` };
      default:
        return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)' };
    }
  };

  const getTypeIcon = (type: string) => {
    const s = { width: '16px', height: '16px' };
    switch (type) {
      case 'skill_completion': return <Target style={s} />;
      case 'quiz_score': return <CheckCircle style={s} />;
      case 'time_spent': return <Clock style={s} />;
      case 'streak': return <Calendar style={s} />;
      case 'sport_completion': return <Target style={s} />;
      default: return <Circle style={s} />;
    }
  };

  const handleMarkComplete = () => {
    onUpdate?.(goal.id, { isCompleted: true, currentValue: goal.targetValue });
  };

  const cardBorder = goal.isCompleted
    ? 'rgba(55,181,255,0.25)'
    : isOverdue
    ? 'rgba(239,68,68,0.25)'
    : 'rgba(55,181,255,0.14)';

  return (
    <div style={{
      background: 'rgba(2,18,44,0.85)',
      border: `1px solid ${cardBorder}`,
      borderRadius: '14px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
            background: 'rgba(55,181,255,0.12)', color: BLUE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {getTypeIcon(goal.type)}
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 4px 0' }}>
              {goal.title}
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
              {goal.description}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {goal.isCompleted && (
            <span style={{
              fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
              background: 'rgba(55,181,255,0.15)', color: BLUE, border: `1px solid rgba(55,181,255,0.3)`,
            }}>
              Completed
            </span>
          )}
          <span style={{
            fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
            textTransform: 'capitalize', ...getPriorityStyle(goal.priority),
          }}>
            {goal.priority}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Progress</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </span>
        </div>
        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            background: `linear-gradient(90deg, ${BLUE} 0%, #0ea5e9 100%)`,
            width: `${progress}%`, transition: 'width 0.5s',
          }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            {Math.round(progress)}% complete
          </span>
          {goal.deadline && !goal.isCompleted && (
            <span style={{ fontSize: '11px', color: isOverdue ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
              {formatDeadline(goal.deadline)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      {!goal.isCompleted && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
          <div>
            {progress >= 100 && (
              <button
                onClick={handleMarkComplete}
                style={{
                  padding: '6px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`,
                  color: '#fff', fontSize: '12px', fontWeight: 600,
                }}
              >
                Mark Complete
              </button>
            )}
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(goal.id)}
              style={{
                padding: '6px 12px', borderRadius: '7px', cursor: 'pointer',
                background: 'transparent', border: '1px solid rgba(239,68,68,0.2)',
                color: 'rgba(248,113,113,0.7)', fontSize: '12px', fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                e.currentTarget.style.color = '#f87171';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(248,113,113,0.7)';
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {/* Completion banner */}
      {goal.isCompleted && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)',
        }}>
          <CheckCircle style={{ width: '14px', height: '14px', color: BLUE }} />
          <span style={{ fontSize: '12px', color: BLUE }}>Goal completed! Great work!</span>
        </div>
      )}
    </div>
  );
}
