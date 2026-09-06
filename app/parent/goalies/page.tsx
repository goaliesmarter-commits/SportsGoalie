'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, UserPlus, Link2 as LinkIcon, ChevronRight, Trophy, Flame, Clock, CheckCircle2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/context';
import { parentLinkService } from '@/lib/database';
import { LinkedChildSummary } from '@/types';
import { SkeletonDarkPage } from '@/components/ui/skeletons';

const BLUE = '#37b5ff';

export default function ParentGoaliesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<LinkedChildSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
    if (!authLoading && user && user.role !== 'parent') router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'parent') return;
    const load = async () => {
      try {
        const result = await parentLinkService.getLinkedChildren(user.id);
        if (result.success && result.data) setChildren(result.data);
      } catch { /* handled */ }
      finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (authLoading || loading) return <SkeletonDarkPage />;
  if (!user || user.role !== 'parent') return null;

  return (
    <>
      <style>{`
        .pg-child:hover { border-color: rgba(55,181,255,0.3) !important; background: rgba(55,181,255,0.04) !important; }
        .pg-link-btn:hover { opacity: 0.9 !important; transform: translateY(-1px); }
      `}</style>
      <div style={{ maxWidth: '1152px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Hero Banner */}
        <div style={{ position: 'relative', borderRadius: '16px', background: 'linear-gradient(135deg, #04213f 0%, #0b3460 50%, #103d72 100%)', border: '1px solid rgba(55,181,255,0.22)', boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(55,181,255,0.12)', padding: '28px 32px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-60px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(248,113,113,0.08)', filter: 'blur(60px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(55,181,255,0.08)', filter: 'blur(50px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ color: '#f87171', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Parent</p>
              <h1 style={{ color: '#fff', fontSize: '28px', fontWeight: 900, marginBottom: '6px', letterSpacing: '-0.02em' }}>My Goalies</h1>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                {children.length} goalie{children.length !== 1 ? 's' : ''} linked to your account
              </p>
            </div>
            {/* Two ways in, and they are not the same thing. "Add" creates an
                account for an under-age goalie who has none (item 6c); "Link"
                connects to a goalie who already has their own. */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/parent/add-goalie" style={{ textDecoration: 'none' }}>
                <button className="pg-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(55,181,255,0.3)', whiteSpace: 'nowrap' }}>
                  <UserPlus size={16} /> Add Goalie
                </button>
              </Link>
              <Link href="/parent/link-child" style={{ textDecoration: 'none' }}>
                <button className="pg-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.35)', background: 'transparent', color: BLUE, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                  <LinkIcon size={16} /> Link Goalie
                </button>
              </Link>
            </div>
          </div>
        </div>

        {children.length === 0 ? (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px', padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users size={24} color="rgba(255,255,255,0.3)" />
            </div>
            <h3 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>No goalies yet</h3>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', maxWidth: '340px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              If your goalie is under 18 and has no account, create one here — you hold it, they
              get their own login inside it. If they already have an account, ask them for the
              link code in their profile settings.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/parent/add-goalie" style={{ textDecoration: 'none' }}>
                <button className="pg-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, color: '#000f28', fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(55,181,255,0.3)' }}>
                  <UserPlus size={16} /> Add a Goalie
                </button>
              </Link>
              <Link href="/parent/link-child" style={{ textDecoration: 'none' }}>
                <button className="pg-link-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.35)', background: 'transparent', color: BLUE, fontSize: '13px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <LinkIcon size={16} /> Link an existing one
                </button>
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {children.map((child) => {
              const pct = Math.round(child.progressPercentage || 0);
              return (
                <Link
                  key={child.childId}
                  href={`/parent/child/${child.childId}`}
                  className="pg-child"
                  style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', borderRadius: '14px', background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.14)', textDecoration: 'none', transition: 'all 0.2s' }}
                >
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(37,99,235,0.35)' }}>
                    <span style={{ color: '#fff', fontSize: '20px', fontWeight: 900 }}>
                      {child.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>{child.displayName}</h4>
                      {child.pacingLevel && (
                        <span style={{ padding: '2px 8px', borderRadius: '20px', background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.2)', color: BLUE, fontSize: '10px', fontWeight: 700 }}>
                          {({ introduction: 'Introduction', intermediate: 'Development', advanced: 'Refinement' } as Record<string, string>)[child.pacingLevel] ?? child.pacingLevel}
                        </span>
                      )}
                      <span style={{ padding: '2px 8px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontWeight: 600, textTransform: 'capitalize' }}>
                        {child.relationship}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #37b5ff, #22c55e)', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{pct}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trophy size={12} /> {child.quizzesCompleted || 0} quizzes
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Flame size={12} /> {child.currentStreak || 0} streak
                      </span>
                      <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: child.hasCompletedAssessment ? '#34d399' : '#fbbf24' }}>
                        {child.hasCompletedAssessment
                          ? <><CheckCircle2 size={12} /> Assessed</>
                          : <><Clock size={12} /> Pending</>}
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={18} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
