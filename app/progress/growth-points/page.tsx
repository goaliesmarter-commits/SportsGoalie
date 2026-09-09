'use client';

import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useGrowthPoints, useGrowthPointsTransactions } from '@/hooks/useGrowthPoints';
import { GrowthPointsTransaction } from '@/lib/firebase/growth-points.service';

const BLUE = '#37b5ff';

const EVENT_LABELS: Record<string, string> = {
  MODULE_COMPLETE: 'Module Completed',
  KNOWLEDGE_CHECK_COMPLETE: 'Knowledge Check Completed',
  CHART_LOGGED: 'Chart Logged',
  STREAK_MILESTONE: 'Streak Milestone',
  PILLAR_COMPLETE: 'Pillar Completed',
  ALL_PILLARS_COMPLETE: 'All 8 Pillars Completed!',
  GOAL_COMPLETE: 'Goal Completed',
  PERK_REDEMPTION: 'Perk Redeemed',
};

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function GrowthPointsPage() {
  return (
    <ProtectedRoute>
      <GrowthPointsContent />
    </ProtectedRoute>
  );
}

function GrowthPointsContent() {
  const { currentPoints, lifetimeEarned, loading: balanceLoading } = useGrowthPoints();
  const { transactions, loading: txLoading } = useGrowthPointsTransactions(50);

  const loading = balanceLoading || txLoading;

  return (
    <div style={{ minHeight: '100vh', background: '#000a1f' }}>
      <style>{`
        @keyframes fade-up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .gp-row { transition: background 0.15s, border-color 0.15s; }
        .gp-row:hover { background: rgba(55,181,255,0.05) !important; }
      `}</style>

      <div style={{
        maxWidth: '720px', margin: '0 auto',
        padding: 'clamp(24px, 4vw, 48px) clamp(16px, 4vw, 28px) 64px',
        animation: 'fade-up 0.4s ease both',
      }}>

        {/* Back link */}
        <Link
          href="/progress"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.45)',
            textDecoration: 'none', marginBottom: '28px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = BLUE; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <ArrowLeft size={14} /> Back to Progress
        </Link>

        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
            background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(251,191,36,0.15)',
          }}>
            <Zap size={22} color="#fbbf24" fill="#fbbf24" />
          </div>
          <div>
            <h1 style={{ fontSize: 'clamp(22px, 5vw, 30px)', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1.1 }}>
              Growth Points History
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', margin: '4px 0 0 0' }}>
              Track your earned points across all activities
            </p>
          </div>
        </div>

        {/* Summary card */}
        <div style={{
          background: 'rgba(2,18,44,0.9)',
          border: '1px solid rgba(55,181,255,0.16)',
          borderRadius: '18px', padding: '24px',
          marginBottom: '24px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                Current Balance
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                {loading ? (
                  <span style={{ fontSize: '48px', fontWeight: 900, color: 'rgba(251,191,36,0.3)', lineHeight: 1 }}>—</span>
                ) : (
                  <span style={{ fontSize: '48px', fontWeight: 900, color: '#fbbf24', lineHeight: 1 }}>
                    {currentPoints.toLocaleString()}
                  </span>
                )}
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>pts</span>
              </div>
              {!loading && lifetimeEarned > 0 && (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '6px' }}>
                  {lifetimeEarned.toLocaleString()} pts earned lifetime
                </p>
              )}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: '12px', padding: '12px 16px', maxWidth: '260px',
            }}>
              <Zap size={16} color="#fbbf24" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, margin: 0 }}>
                Points accumulate as you complete modules, Knowledge Checks, and charting sessions.
              </p>
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div style={{
          background: 'rgba(2,18,44,0.9)',
          border: '1px solid rgba(55,181,255,0.14)',
          borderRadius: '18px', overflow: 'hidden',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px', borderBottom: '1px solid rgba(55,181,255,0.09)',
          }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: 0 }}>Transaction History</h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                All earned points — newest first
              </p>
            </div>
            <span style={{
              fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '4px 10px',
            }}>
              {loading ? '—' : `${transactions.length} entries`}
            </span>
          </div>

          {loading ? (
            <div style={{ padding: '48px 22px', textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px' }}>
              Loading…
            </div>
          ) : transactions.length === 0 ? (
            <div style={{ padding: '48px 22px', textAlign: 'center' }}>
              <Zap size={28} color="rgba(251,191,36,0.2)" style={{ marginBottom: '12px' }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '14px', fontWeight: 600 }}>No points earned yet</p>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px', marginTop: '4px' }}>
                Complete modules, knowledge checks, or chart a session to earn your first points.
              </p>
            </div>
          ) : (
            transactions.map((tx: GrowthPointsTransaction, idx: number) => (
              <div
                key={tx.id}
                className="gp-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '16px 22px',
                  borderBottom: idx < transactions.length - 1 ? '1px solid rgba(55,181,255,0.07)' : 'none',
                  background: 'transparent',
                }}
              >
                <div style={{
                  width: '38px', height: '38px', borderRadius: '11px', flexShrink: 0,
                  background: tx.transactionType === 'EARN'
                    ? 'rgba(251,191,36,0.1)'
                    : 'rgba(248,113,113,0.1)',
                  border: `1px solid ${tx.transactionType === 'EARN' ? 'rgba(251,191,36,0.22)' : 'rgba(248,113,113,0.22)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Zap size={16} color={tx.transactionType === 'EARN' ? '#fbbf24' : '#f87171'} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '14px', fontWeight: 700, color: '#fff',
                    margin: '0 0 3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tx.description || EVENT_LABELS[tx.eventType] || tx.eventType}
                  </p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', margin: 0 }}>
                    {formatDate(tx.createdAt)}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{
                    fontSize: '16px', fontWeight: 900, margin: '0 0 3px 0',
                    color: tx.transactionType === 'EARN' ? '#fbbf24' : '#f87171',
                  }}>
                    {tx.transactionType === 'EARN' ? '+' : '-'}{tx.points}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>pts</p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
