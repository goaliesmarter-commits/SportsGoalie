'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/context';
import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { TrainingLogEntry, TrainingCategory } from '@/types/charting';
import { computeTrainingAnalytics, TrainingAnalytics } from '@/lib/training/analytics';
import { TrainingAnalyticsDashboard } from '@/components/training/TrainingAnalyticsDashboard';
import { EventVoice } from '@/components/audio/EventVoice';
import { Dumbbell, Leaf, Droplet, Trophy, Plus, ChevronRight, BarChart3, CalendarDays, Flame } from 'lucide-react';

const CYAN = '#37b5ff';
const MINT = '#34d399';

function IceSkateIcon() {
  return (
    <svg fill="none" height={36} width={36} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M4 18h11c1.1 0 2-.9 2-2v-4.5c0-1.4-1.1-2.5-2.5-2.5H12l-2-3H4v12z" />
      <path d="M3 21h18" />
    </svg>
  );
}

function PuckMachineIcon() {
  return (
    <svg fill="none" height={36} width={36} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
      <ellipse cx="12" cy="18" rx="7" ry="2.5" />
      <path d="M5 13v5" />
      <path d="M19 13v5" />
      <path d="M12 6v7" />
      <path d="M9 9l3-3 3 3" />
      <ellipse cx="12" cy="13" rx="7" ry="2.5" />
    </svg>
  );
}

function LifestyleIcon() {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <Leaf size={22} strokeWidth={1.5} />
      <Droplet size={22} strokeWidth={1.5} />
    </div>
  );
}

interface CategoryDef {
  id: TrainingCategory;
  label: string;
  Icon: React.FC;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'ice', label: 'Ice', Icon: IceSkateIcon },
  { id: 'puck_machine', label: 'Puck Machine', Icon: PuckMachineIcon },
  { id: 'land_conditioning', label: 'Land / Conditioning', Icon: () => <Dumbbell size={36} strokeWidth={1.5} /> },
  { id: 'lifestyle_foundations', label: 'Lifestyle Foundations', Icon: LifestyleIcon },
  { id: 'games_tourneys', label: 'Games / Tourneys', Icon: () => <Trophy size={36} strokeWidth={1.5} /> },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDateLong(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

type Tab = 'today' | 'logs';

export default function TrainingHubPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [recentLogs, setRecentLogs] = useState<TrainingLogEntry[]>([]);
  const [todayLog, setTodayLog] = useState<TrainingLogEntry | null>(null);
  const [analytics, setAnalytics] = useState<TrainingAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        // Newest 60 days, sorted here: asking Firestore to filter on goalieId and
        // order by date needs a composite index, and without it the query fails and
        // the catch below leaves My Logs reading "No saved logs yet".
        const snap = await getDocs(query(collection(db, 'training_logs'), where('goalieId', '==', user.id)));
        const logs = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as TrainingLogEntry))
          .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
          .slice(0, 60);
        setRecentLogs(logs);
        const today = todayStr();
        setTodayLog(logs.find(l => l.date === today) || null);
        setAnalytics(computeTrainingAnalytics(logs));
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const today = todayStr();
  // Every saved log, today's included. Today's used to be left out, so a log saved
  // today left My Logs saying "No saved logs yet" until the next day.
  const savedLogs = recentLogs;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'logs', label: 'My Logs' },
  ];

  return (
    <>
      <style>{`
        .training-cat-card {
          background: linear-gradient(135deg, #04213f 0%, #0a2d52 100%);
          border: 1px solid rgba(55,181,255,0.14);
          box-shadow: 0 2px 20px rgba(0,0,0,0.4), 0 0 12px rgba(55,181,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06);
          color: #fff;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px;
          aspect-ratio: 1 / 1;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, background 0.35s ease;
        }
        .training-cat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 52%;
          background: linear-gradient(180deg, rgba(55,181,255,0.07) 0%, transparent 100%);
          border-radius: 16px 16px 0 0;
          pointer-events: none;
        }
        .training-cat-card::after {
          content: '';
          position: absolute;
          top: -60%;
          left: -85%;
          width: 45%;
          height: 220%;
          background: linear-gradient(90deg, transparent, rgba(55,181,255,0.1), transparent);
          transform: skewX(-18deg);
          transition: left 0.55s ease;
          pointer-events: none;
        }
        .training-cat-card:hover::after { left: 145%; }
        .training-cat-card:hover {
          border-color: rgba(55,181,255,0.35);
          box-shadow: 0 10px 36px rgba(0,0,0,0.5), 0 0 28px rgba(55,181,255,0.2), inset 0 1px 0 rgba(55,181,255,0.1);
          transform: translateY(-5px) scale(1.03);
          background: linear-gradient(160deg, #0c2e56 0%, #04213f 30%, #0a2d52 100%);
        }
        .training-cat-icon { transition: filter 0.35s ease, transform 0.35s ease; }
        .training-cat-card:hover .training-cat-icon {
          filter: drop-shadow(0 0 8px rgba(55,181,255,0.7));
          transform: scale(1.12);
        }
        .training-cat-label { transition: color 0.3s ease; }
        .training-cat-card:hover .training-cat-label { color: #37b5ff; }
        .training-neon-btn { transition: box-shadow 0.3s ease, transform 0.3s ease; }
        .training-neon-btn:hover {
          box-shadow: 0 4px 24px rgba(55,181,255,0.5) !important;
          transform: translateY(-1px);
        }
        .log-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-radius: 14px;
          background: linear-gradient(135deg, rgba(4,33,63,0.7) 0%, rgba(10,45,82,0.7) 100%);
          border: 1px solid rgba(55,181,255,0.1);
          text-decoration: none;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }
        .log-row:hover {
          border-color: rgba(55,181,255,0.3);
          background: linear-gradient(135deg, rgba(4,33,63,0.95) 0%, rgba(10,45,82,0.95) 100%);
          transform: translateX(3px);
        }
      `}</style>

      <div style={{
        minHeight: 'calc(100vh - 112px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: '48px',
        paddingTop: '32px',
      }}>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '5px',
          borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          marginBottom: '48px',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '8px 28px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  background: active
                    ? 'linear-gradient(135deg, rgba(55,181,255,0.18), rgba(52,211,153,0.12))'
                    : 'transparent',
                  color: active ? '#37b5ff' : 'rgba(255,255,255,0.4)',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(55,181,255,0.3)' : 'none',
                }}
              >
                {tab.label}
                {tab.id === 'logs' && savedLogs.length > 0 && (
                  <span style={{
                    marginLeft: '7px',
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '20px',
                    background: active ? 'rgba(55,181,255,0.25)' : 'rgba(255,255,255,0.08)',
                    color: active ? CYAN : 'rgba(255,255,255,0.3)',
                  }}>
                    {savedLogs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TODAY TAB ── */}
        {activeTab === 'today' && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '64px' }}>

            {/* Hero card */}
            <section style={{ width: '100%', maxWidth: '520px' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(4,33,63,0.85) 0%, rgba(10,45,82,0.85) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(55,181,255,0.18)',
                boxShadow: '0 0 24px rgba(55,181,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
                borderRadius: '20px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', top: '-50%', left: '-50%',
                  width: '200%', height: '200%',
                  background: 'linear-gradient(45deg, transparent 45%, rgba(55,181,255,0.04) 48%, rgba(55,181,255,0.08) 50%, rgba(55,181,255,0.04) 52%, transparent 55%)',
                  pointerEvents: 'none',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>
                  TODAY
                </span>
                <h2 style={{ color: '#fff', fontSize: '36px', fontWeight: 300, margin: '0 0 24px' }}>
                  {formatDate(today)}
                </h2>
                <Link
                  href="/training/log"
                  className="training-neon-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '11px 30px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #37b5ff 0%, #34d399 100%)',
                    boxShadow: '0 4px 18px rgba(55,181,255,0.35)',
                    color: '#000f28', fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                  }}
                >
                  <Plus size={20} />
                  {todayLog ? "Update Today's Log" : "Start Today's Log"}
                </Link>
              </div>
            </section>

            {/* Category cards */}
            <section style={{ width: '100%', maxWidth: '860px' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: '24px' }}>
                CATEGORIES
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6">
                {CATEGORIES.map(cat => {
                  const Icon = cat.Icon;
                  return (
                    <div key={cat.id} className="training-cat-card">
                      <div className="training-cat-icon" style={{ color: CYAN }}>
                        <Icon />
                      </div>
                      <span className="training-cat-label" style={{ fontSize: '13px', fontWeight: 500, textAlign: 'center', lineHeight: 1.3, color: 'rgba(255,255,255,0.85)' }}>
                        {cat.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Analytics toggle */}
            {!loading && (analytics?.overallScore ?? 0) > 0 && (
              <section style={{ width: '100%', maxWidth: '860px' }}>
                <button
                  type="button"
                  onClick={() => setShowAnalytics(v => !v)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: '12px',
                    background: showAnalytics ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${showAnalytics ? 'rgba(52,211,153,0.2)' : 'rgba(255,255,255,0.07)'}`,
                    cursor: 'pointer', transition: 'all 0.18s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BarChart3 style={{ width: '16px', height: '16px', color: MINT }} />
                    <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Training Analytics</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontWeight: 700 }}>
                    {analytics?.masteryPercent}% mastery
                  </span>
                </button>
                {showAnalytics && analytics && (
                  <div style={{ marginTop: '12px' }}>
                    <TrainingAnalyticsDashboard analytics={analytics} />
                  </div>
                )}
              </section>
            )}

          </div>
        )}

        {/* ── MY LOGS TAB ── */}
        {activeTab === 'logs' && (
          <div style={{ width: '100%', maxWidth: '720px' }}>

            {loading ? (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '60px 0' }}>Loading…</p>
            ) : savedLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <CalendarDays size={40} style={{ color: 'rgba(255,255,255,0.1)' }} />
                <EventVoice event="emptyScreen" />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px' }}>No saved logs yet.</p>
                <p style={{ color: 'rgba(255,255,255,0.18)', fontSize: '13px' }}>Start logging your daily training to see your history here.</p>
              </div>
            ) : (
              <>
                {/* Streak / summary bar */}
                <div style={{
                  display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap',
                }}>
                  <div style={{
                    flex: 1, minWidth: '140px',
                    padding: '14px 18px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(55,181,255,0.08), rgba(55,181,255,0.04))',
                    border: '1px solid rgba(55,181,255,0.15)',
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Total Sessions</p>
                    <p style={{ color: '#fff', fontSize: '26px', fontWeight: 700 }}>{savedLogs.length}</p>
                  </div>
                  <div style={{
                    flex: 1, minWidth: '140px',
                    padding: '14px 18px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.04))',
                    border: '1px solid rgba(52,211,153,0.15)',
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Items Completed</p>
                    <p style={{ color: '#fff', fontSize: '26px', fontWeight: 700 }}>
                      {savedLogs.reduce((acc, l) => acc + l.items.filter(i => i.done).length, 0)}
                    </p>
                  </div>
                  <div style={{
                    flex: 1, minWidth: '140px',
                    padding: '14px 18px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.04))',
                    border: '1px solid rgba(251,191,36,0.15)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Flame size={11} style={{ color: '#fbbf24' }} />
                      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>Avg Completion</p>
                    </div>
                    <p style={{ color: '#fff', fontSize: '26px', fontWeight: 700 }}>
                      {savedLogs.length > 0
                        ? Math.round(savedLogs.reduce((acc, l) => {
                            const total = l.items.length;
                            const done = l.items.filter(i => i.done).length;
                            return acc + (total > 0 ? done / total : 0);
                          }, 0) / savedLogs.length * 100)
                        : 0}%
                    </p>
                  </div>
                </div>

                {/* Log list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {savedLogs.map(log => {
                    const totalItems = log.items.length;
                    const doneItems = log.items.filter(i => i.done).length;
                    const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
                    const isComplete = doneItems === totalItems && totalItems > 0;
                    return (
                      <Link key={log.id} href={`/training/log?date=${log.date}`} className="log-row">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                          <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{formatDateLong(log.date)}</p>
                          {/* Progress bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ flex: 1, height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: '2px',
                                width: `${pct}%`,
                                background: isComplete
                                  ? `linear-gradient(90deg, ${MINT}, ${CYAN})`
                                  : `linear-gradient(90deg, ${CYAN}, rgba(55,181,255,0.5))`,
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, flexShrink: 0,
                              color: isComplete ? MINT : 'rgba(255,255,255,0.35)',
                            }}>
                              {doneItems}/{totalItems}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={15} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0, marginLeft: '16px' }} />
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}
