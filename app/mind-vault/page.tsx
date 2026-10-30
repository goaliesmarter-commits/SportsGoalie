'use client';

import { useEffect, useState } from 'react';
import { SkeletonCardGrid } from '@/components/ui/skeletons';
import { useAuth } from '@/lib/auth/context';
import { mindVaultService } from '@/lib/database/services/mind-vault.service';
import { MindVaultCategoryCard } from '@/components/mind-vault/MindVaultCategoryCard';
import { FirstVisitVoice } from '@/components/audio/FirstVisitVoice';
import { Brain, ListChecks, Flame } from 'lucide-react';
import { MIND_VAULT_CATEGORIES, type MindVaultCategorySummary } from '@/types/mind-vault';

const BLUE = '#37b5ff';

export default function MindVaultPage() {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<MindVaultCategorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const result = await mindVaultService.getCategorySummary(user.id);
      if (result.success && result.data) setSummaries(result.data);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const getSummary = (slug: string) => summaries.find(s => s.category === slug);
  const totalEntries = summaries.reduce((sum, s) => sum + s.entryCount, 0);
  const activeCategories = summaries.filter(s => s.entryCount > 0).length;
  const coreEntries = (getSummary('acceptance')?.entryCount || 0) + (getSummary('cannot_accept')?.entryCount || 0);
  const momentum = Math.round((activeCategories / MIND_VAULT_CATEGORIES.length) * 100) || 0;
  const safeMomentum = loading ? 0 : Math.max(momentum, 6);

  return (
    <div style={{ minHeight: '100vh' }}>

      {/* ── Hero Banner ── */}
      <section style={{ position: 'relative', height: '280px', display: 'flex', alignItems: 'flex-end', backgroundImage: "url('/mind-vault.png')", backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,15,40,0.9) 0%, rgba(6,35,68,0.8) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, bottom: 0, background: 'linear-gradient(to top, #000f28 0%, transparent 60%)' }} />
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 24px 32px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(24px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            Build the <span style={{ color: BLUE }}>Mental Game</span>
          </h1>
          <FirstVisitVoice
            moment="mindVaultFirstVisit"
            label="HEAR COACH MIKE: THE MIND-VAULT"
            className="mb-3 justify-center"
          />
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>
            Your personal mental armor, expanded one entry at a time.
          </p>
        </div>
      </section>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 48px' }}>

        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '32px' }}>
          {/* Total Entries */}
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>Total Entries</p>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={17} color={BLUE} />
              </div>
            </div>
            <p style={{ fontSize: '52px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
              {loading ? '--' : totalEntries}
            </p>
          </div>

          {/* Core Entries */}
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>Core List Entries</p>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ListChecks size={17} color={BLUE} />
              </div>
            </div>
            <p style={{ fontSize: '52px', fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-2px' }}>
              {loading ? '--' : coreEntries}
            </p>
          </div>

          {/* Momentum */}
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.18)', borderRadius: '16px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '150px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: 'rgba(255,255,255,0.4)' }}>Momentum</p>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(55,181,255,0.12)', border: '1px solid rgba(55,181,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={17} color={BLUE} />
              </div>
            </div>
            <p style={{ fontSize: '32px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {loading ? '--' : `${momentum}%`}
            </p>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
                <div style={{ height: '100%', background: BLUE, borderRadius: '99px', width: `${safeMomentum}%`, transition: 'width 0.5s' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontWeight: 600 }}>
                {loading ? ' ' : `${activeCategories} of ${MIND_VAULT_CATEGORIES.length} sections started`}
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SkeletonCardGrid count={2} cols={2} />
            <SkeletonCardGrid count={4} cols={2} />
          </div>
        ) : (
          <>
            <section style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '14px' }}>Core Lists</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '14px' }}>
                {MIND_VAULT_CATEGORIES.filter(c => c.slug === 'acceptance' || c.slug === 'cannot_accept').map(cat => (
                  <MindVaultCategoryCard key={cat.slug} category={cat} summary={getSummary(cat.slug)} />
                ))}
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '14px' }}>All Categories</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '14px' }}>
                {MIND_VAULT_CATEGORIES.filter(c => c.slug !== 'acceptance' && c.slug !== 'cannot_accept').map(cat => (
                  <MindVaultCategoryCard key={cat.slug} category={cat} summary={getSummary(cat.slug)} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
