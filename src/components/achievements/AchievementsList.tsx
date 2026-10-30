'use client';

import { useState } from 'react';
import { Filter, Trophy, Star, Target } from 'lucide-react';
import { AchievementCard } from './AchievementCard';
import { Achievement, UserAchievement } from '@/types';

interface AchievementsListProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  loading?: boolean;
}

type AchTab = 'completed' | 'progress' | 'locked';

const BLUE = '#37b5ff';

const CATEGORIES = ['WINS', 'BREAKTHROUGHS', 'CLIMBS', 'STREAKS', 'MILESTONES'] as const;
const TIERS = ['FOUNDATION', 'DEVELOPING', 'OWNING IT', '80-100 CLUB', '95-100 CLUB'] as const;
const TIER_COLORS: Record<string, string> = {
  'FOUNDATION': '#fbbf24',
  'DEVELOPING': '#60a5fa',
  'OWNING IT': '#37b5ff',
  '80-100 CLUB': '#22d3ee',
  '95-100 CLUB': '#fbbf24',
};
const TYPES = ['progress', 'knowledge-check', 'streak', 'time', 'special'] as const;

const cardStyle: React.CSSProperties = {
  background: 'rgba(2,18,44,0.85)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '14px',
  padding: '24px',
};

export function AchievementsList({ achievements, userAchievements, loading = false }: AchievementsListProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterTier, setFilterTier] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<AchTab>('completed');

  const userAchievementMap = new Map(userAchievements.map(ua => [ua.achievementId, ua]));

  const filteredAchievements = achievements.filter(a => {
    const matchesCategory = filterCategory === 'all' || (a.category ?? a.rarity ?? '').toUpperCase() === filterCategory;
    const matchesTier = filterTier === 'all' || (a.tier ?? '').toUpperCase() === filterTier;
    const matchesType = filterType === 'all' || a.type === filterType || (filterType === 'knowledge-check' && a.type === 'quiz');
    return matchesCategory && matchesTier && matchesType;
  });

  const completedAchievements = filteredAchievements.filter(a => userAchievementMap.get(a.id)?.isCompleted);
  const inProgressAchievements = filteredAchievements.filter(a => {
    const ua = userAchievementMap.get(a.id);
    return ua && !ua.isCompleted && ua.progress > 0;
  });
  const lockedAchievements = filteredAchievements.filter(a => !userAchievementMap.has(a.id));

  const totalCompleted = userAchievements.filter(ua => ua.isCompleted).length;
  const totalPoints = completedAchievements.reduce((sum, a) => sum + a.points, 0);

  const tabData: Record<AchTab, Achievement[]> = {
    completed: completedAchievements,
    progress: inProgressAchievements,
    locked: lockedAchievements,
  };

  const tabs: Array<{ key: AchTab; label: string }> = [
    { key: 'completed', label: `Completed (${completedAchievements.length})` },
    { key: 'progress', label: `In Progress (${inProgressAchievements.length})` },
    { key: 'locked', label: `Locked (${lockedAchievements.length})` },
  ];

  const emptyContent: Record<AchTab, { icon: React.ReactNode; title: string; body: string }> = {
    completed: {
      icon: <Trophy style={{ width: '48px', height: '48px', color: 'rgba(55,181,255,0.4)' }} />,
      title: 'No completed achievements yet',
      body: 'Start learning and completing Knowledge Checks to unlock your first achievement!',
    },
    progress: {
      icon: <Target style={{ width: '48px', height: '48px', color: 'rgba(55,181,255,0.4)' }} />,
      title: 'No achievements in progress',
      body: 'Continue your learning journey to make progress on achievements.',
    },
    locked: {
      icon: <Star style={{ width: '48px', height: '48px', color: 'rgba(55,181,255,0.4)' }} />,
      title: 'All achievements unlocked!',
      body: "You've made progress on all available achievements. Great work!",
    },
  };

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '120px' }}>
          <div className="animate-spin" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(55,181,255,0.3)', borderTopColor: BLUE }} />
        </div>
      </div>
    );
  }

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer',
    fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
    background: active ? `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)` : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.5)',
  });

  const currentList = tabData[activeTab];
  const empty = emptyContent[activeTab];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Stats */}
      <div style={cardStyle}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Trophy style={{ width: '20px', height: '20px', color: BLUE }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Achievement Progress</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Track your learning milestones and accomplishments
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Completed', value: totalCompleted, color: '#4ade80' },
            { label: 'Growth Points', value: totalPoints, color: BLUE },
            { label: 'In Progress', value: inProgressAchievements.length, color: BLUE },
            { label: 'Total Available', value: achievements.length, color: 'rgba(255,255,255,0.6)' },
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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '8px' }}>
            <Filter style={{ width: '14px', height: '14px', color: BLUE }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: BLUE }}>Filters</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', borderRadius: '10px' }}>
            <button onClick={() => setFilterCategory('all')} style={filterBtnStyle(filterCategory === 'all')}>All Categories</button>
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilterCategory(c)} style={filterBtnStyle(filterCategory === c)}>{c}</button>
            ))}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', borderRadius: '10px' }}>
            <button onClick={() => setFilterTier('all')} style={filterBtnStyle(filterTier === 'all')}>All Tiers</button>
            {TIERS.map(t => {
              const isActive = filterTier === t;
              const tierColor = TIER_COLORS[t] || BLUE;
              return (
                <button
                  key={t}
                  onClick={() => setFilterTier(t)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: isActive ? `1px solid ${tierColor}66` : 'none',
                    cursor: 'pointer', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const,
                    background: isActive ? `${tierColor}22` : 'transparent',
                    color: isActive ? tierColor : 'rgba(255,255,255,0.5)',
                    letterSpacing: '.3px',
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(55,181,255,0.1)', borderRadius: '10px' }}>
            <button onClick={() => setFilterType('all')} style={filterBtnStyle(filterType === 'all')}>All Types</button>
            {TYPES.map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={filterBtnStyle(filterType === t)}>
                {t === 'knowledge-check' ? 'Knowledge Check' : t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + content */}
      <div>
        <div style={{ display: 'flex', gap: '4px', padding: '6px', background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '10px', marginBottom: '16px', width: 'fit-content', maxWidth: '100%' }}>
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: '6px clamp(8px, 3vw, 14px)', minWidth: 0, borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                background: activeTab === key ? `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)` : 'transparent',
                color: activeTab === key ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {currentList.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {currentList.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                userAchievement={userAchievementMap.get(achievement.id)}
                isLocked={activeTab === 'locked'}
              />
            ))}
          </div>
        ) : (
          <div style={{ ...cardStyle, padding: '40px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>{empty.icon}</div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: '0 0 8px 0' }}>{empty.title}</h3>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>{empty.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}
