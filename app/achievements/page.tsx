'use client';

import { Flame, Sparkles, Trophy } from 'lucide-react';
import { SkeletonCardGrid } from '@/components/ui/skeletons';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useAchievements } from '@/hooks/useProgress';
import { AchievementsList } from '@/components/achievements/AchievementsList';

const BLUE = '#37b5ff';

export default function AchievementsPage() {
  return (
    <ProtectedRoute>
      <AchievementsContent />
    </ProtectedRoute>
  );
}

function AchievementsContent() {
  const { achievements, userAchievements, loading, error } = useAchievements();
  const completedAchievements = userAchievements.filter(a => a.isCompleted).length;
  const completionRate = achievements.length > 0 ? Math.round((completedAchievements / achievements.length) * 100) : 0;
  const totalPoints = achievements
    .filter(a => userAchievements.find(ua => ua.achievementId === a.id && ua.isCompleted))
    .reduce((sum, a) => sum + a.points, 0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ height: '200px', background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '18px', animation: 'pulse 1.5s infinite' }} />
          <SkeletonCardGrid count={6} cols={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <Trophy size={48} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Unable to load achievements</h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <style>{`
        .ach-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        @media (max-width: 640px) { .ach-stats { grid-template-columns: 1fr; } }
      `}</style>

      {/* Hero Banner */}
      <section style={{ position: 'relative', background: 'linear-gradient(135deg, rgba(0,15,40,0.95) 0%, rgba(6,35,68,0.92) 50%, rgba(10,49,89,0.9) 100%)', padding: '40px 24px 48px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: `radial-gradient(circle, ${BLUE}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(248,113,113,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(22px,4vw,38px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '8px' }}>
            Unlock Your Milestones,<br /><span style={{ color: BLUE }}>Track Every Win.</span>
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '28px', maxWidth: '520px' }}>
            Keep building momentum through Knowledge Checks, consistency, and focused progress across all 8 Pillars.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', maxWidth: '600px' }}>
            {[
              { label: 'Unlocked', value: completedAchievements, color: BLUE },
              { label: 'Completion Rate', value: `${completionRate}%`, color: BLUE },
              { label: 'Growth Points', value: totalPoints, color: 'rgba(255,255,255,0.7)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '14px', padding: '14px 16px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{s.label}</p>
                <p style={{ fontSize: '26px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Stat Cards */}
        <div className="ach-stats">
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Total Achievements</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{achievements.length}</p>
              <Trophy size={20} color={BLUE} />
            </div>
          </div>
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>In Progress</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '36px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{Math.max(achievements.length - completedAchievements, 0)}</p>
              <Flame size={20} color={BLUE} />
            </div>
          </div>
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Next Push</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '4px' }}>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Keep Consistency</p>
              <Sparkles size={18} color={BLUE} />
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>A steady streak usually unlocks your next badge fastest.</p>
          </div>
        </div>

        {/* Achievements List */}
        <AchievementsList achievements={achievements} userAchievements={userAchievements} loading={loading} />
      </main>
    </div>
  );
}
