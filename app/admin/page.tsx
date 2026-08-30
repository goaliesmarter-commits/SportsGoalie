'use client';

import { useState, useEffect } from 'react';
import {
  Users, BookOpen, Trophy, TrendingUp, TrendingDown,
  ArrowRight, Video, UserPlus, BarChart3, Activity, RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

import { AdminRoute } from '@/components/auth/protected-route';
import { useAuth } from '@/lib/auth/context';
import {
  analyticsService,
  PlatformAnalytics,
  UserEngagementData,
  ContentPopularity,
  SystemHealth,
} from '@/lib/database/services/analytics.service';
import { toast } from 'sonner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const BLUE = '#37b5ff';
const RED = '#f87171';

export default function AdminDashboardPage() {
  return (
    <AdminRoute>
      <AdminDashboardContent />
    </AdminRoute>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [engagement, setEngagement] = useState<UserEngagementData[]>([]);
  const [popularity, setPopularity] = useState<ContentPopularity[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      const [analyticsRes, engagementRes, popularityRes, healthRes] = await Promise.all([
        analyticsService.getPlatformAnalytics(),
        analyticsService.getUserEngagementData(14),
        analyticsService.getContentPopularity(),
        analyticsService.getSystemHealth(),
      ]);
      if (analyticsRes.success && analyticsRes.data) setAnalytics(analyticsRes.data);
      if (engagementRes.success && engagementRes.data) setEngagement(engagementRes.data);
      if (popularityRes.success && popularityRes.data) setPopularity(popularityRes.data);
      if (healthRes.success && healthRes.data) setHealth(healthRes.data);
      if (showToast) toast.success('Dashboard refreshed');
    } catch {
      if (showToast) toast.error('Failed to refresh');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRefresh = () => { analyticsService.clearCache(); fetchAll(true); };

  const firstName = (user?.displayName || user?.email || '').split(' ')[0].split('@')[0];

  const chartData = engagement.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    users: d.activeUsers,
    quizzes: d.quizAttempts,
    score: d.averageScore,
  }));

  const cardStyle = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' };

  return (
    <>
      <style>{`
        .adm-refresh:hover { background: rgba(55,181,255,0.1) !important; border-color: ${BLUE} !important; color: #fff !important; }
        .adm-action:hover { border-color: rgba(248,113,113,0.3) !important; background: rgba(248,113,113,0.04) !important; }
        .adm-action:hover .adm-action-icon { color: #f87171 !important; }
        .adm-action:hover .adm-action-label { color: #fff !important; }
        @keyframes adm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 1024px) { .chart-row { grid-template-columns: 2fr 1fr !important; } }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Welcome back, <span style={{ color: BLUE }}>{firstName}</span>
            </h1>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)' }}>
              Here&apos;s what&apos;s happening on your platform today.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="adm-refresh"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 16px', borderRadius: '10px', border: '1px solid rgba(55,181,255,0.2)', background: 'rgba(55,181,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '15px', fontWeight: 600, cursor: refreshing ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: refreshing ? 0.6 : 1 }}
          >
            <RefreshCw size={15} style={refreshing ? { animation: 'adm-spin 1s linear infinite' } : undefined} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
          <KpiCard title="Total Users" value={analytics?.users.total ?? 0} subtitle={`+${analytics?.users.newThisMonth ?? 0} this month`} icon={<Users size={20} />} trend={analytics?.users.newThisMonth ? 'up' : undefined} loading={loading} />
          <KpiCard title="Active Students" value={analytics?.users.activeStudentCount ?? 0} subtitle={`${analytics?.engagement.activeUsersToday ?? 0} active today`} icon={<Activity size={20} />} loading={loading} />
          <KpiCard title="Quiz Attempts" value={analytics?.engagement.totalQuizAttempts ?? 0} subtitle={`${analytics?.engagement.averageQuizScore ?? 0}% avg score`} icon={<Trophy size={20} />} trend={analytics?.engagement.averageQuizScore && analytics.engagement.averageQuizScore > 70 ? 'up' : 'down'} loading={loading} />
          <KpiCard title="Content Library" value={analytics?.content.totalSports ?? 0} subtitle={`${analytics?.content.totalSkills ?? 0} skills, ${analytics?.content.totalQuizzes ?? 0} quizzes`} icon={<BookOpen size={20} />} loading={loading} />
        </div>

        {/* Charts Row */}
        <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
            {/* User Activity */}
            <div style={{ ...cardStyle, padding: '24px' }}>
              <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>User Activity (Last 14 Days)</h3>
              {loading ? (
                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid rgba(55,181,255,0.2)`, borderTopColor: BLUE, animation: 'adm-spin 0.8s linear infinite' }} />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} stroke="rgba(255,255,255,0.08)" />
                    <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} stroke="rgba(255,255,255,0.08)" />
                    <Tooltip contentStyle={{ background: 'rgba(2,18,44,0.95)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fff' }} />
                    <Line type="monotone" dataKey="users" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 3, fill: '#dc2626' }} name="Active Users" />
                    <Line type="monotone" dataKey="quizzes" stroke={BLUE} strokeWidth={2} dot={{ r: 3, fill: BLUE }} strokeDasharray="5 5" name="Quiz Attempts" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '15px' }}>No activity data yet</div>
              )}
            </div>

            {/* Top Content */}
            <div style={{ ...cardStyle, padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>Top Content</h3>
                <Link href="/admin/analytics" style={{ color: RED, fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>View all</Link>
              </div>
              {loading ? (
                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid rgba(55,181,255,0.2)`, borderTopColor: BLUE, animation: 'adm-spin 0.8s linear infinite' }} />
                </div>
              ) : popularity.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {popularity.slice(0, 5).map((item, i) => (
                    <div key={item.sportId} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(55,181,255,0.08)', border: '1px solid rgba(55,181,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.sportName}</p>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>{item.views} views · {item.completions} done</p>
                      </div>
                      <div style={{ color: RED, fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{item.averageRating.toFixed(1)} ★</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '15px' }}>No content data yet</div>
              )}
            </div>
        </div>

        {/* Quiz Scores + Quick Actions */}
        <div className="chart-row" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
          {/* Quiz Score Chart */}
          <div style={{ ...cardStyle, padding: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Quiz Scores (Last 14 Days)</h3>
            {loading ? (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: `3px solid rgba(55,181,255,0.2)`, borderTopColor: BLUE, animation: 'adm-spin 0.8s linear infinite' }} />
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} stroke="rgba(255,255,255,0.08)" />
                  <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} stroke="rgba(255,255,255,0.08)" domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: 'rgba(2,18,44,0.95)', border: '1px solid rgba(55,181,255,0.2)', borderRadius: '10px', fontSize: '13px', color: '#fff' }} />
                  <Bar dataKey="score" fill="#dc2626" radius={[6, 6, 0, 0]} name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '15px' }}>No quiz data yet</div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ ...cardStyle, padding: '24px' }}>
            <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <QuickAction href="/admin/quizzes/create" icon={<Trophy size={16} />} label="Create Quiz" />
              <QuickAction href="/admin/pillars" icon={<BookOpen size={16} />} label="Manage Pillars" />
              <QuickAction href="/admin/video-reviews" icon={<Video size={16} />} label="Review Videos" />
              <QuickAction href="/admin/users" icon={<Users size={16} />} label="View Students" />
              <QuickAction href="/admin/coaches" icon={<UserPlus size={16} />} label="Invite Coach" />
              <QuickAction href="/admin/analytics" icon={<BarChart3 size={16} />} label="Full Analytics" />
            </div>
          </div>
        </div>

        {/* System Health */}
        {health && (
          <div style={{ ...cardStyle, padding: '16px 24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: health.status === 'healthy' ? '#34d399' : health.status === 'warning' ? '#fbbf24' : RED, boxShadow: `0 0 8px ${health.status === 'healthy' ? '#34d39980' : health.status === 'warning' ? '#fbbf2480' : `${RED}80`}` }} />
                <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700, textTransform: 'capitalize' }}>System {health.status}</span>
              </div>
              <HealthItem label="Uptime" value={`${health.uptime}%`} />
              <HealthItem label="Response" value={`${health.responseTime}ms`} />
              <HealthItem label="Error Rate" value={`${health.errorRate}%`} />
              <HealthItem label="Database" value={health.services.database} />
              <HealthItem label="Auth" value={health.services.auth} />
              <HealthItem label="Storage" value={health.services.storage} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function KpiCard({ title, value, subtitle, icon, trend, loading }: {
  title: string; value: number; subtitle: string; icon: React.ReactNode; trend?: 'up' | 'down'; loading: boolean;
}) {
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px', padding: '20px', transition: 'all 0.2s' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, rgba(55,181,255,0.4), transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>{title}</p>
          <p style={{ fontSize: '28px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: '6px' }}>
            {loading ? <span style={{ display: 'inline-block', height: '28px', width: '64px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', animation: 'pulse 1.5s infinite' }} /> : value.toLocaleString()}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {trend && !loading && (trend === 'up' ? <TrendingUp size={13} color="#34d399" /> : <TrendingDown size={13} color={RED} />)}
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>{loading ? '' : subtitle}</p>
          </div>
        </div>
        <div style={{ padding: '10px', borderRadius: '12px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: RED, flexShrink: 0 }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link href={href} className="adm-action" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)', textDecoration: 'none', transition: 'all 0.2s' }}>
      <span className="adm-action-icon" style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0, transition: 'color 0.2s', display: 'flex' }}>{icon}</span>
      <span className="adm-action-label" style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', fontWeight: 600, flex: 1, transition: 'color 0.2s' }}>{label}</span>
      <ArrowRight size={14} color="rgba(255,255,255,0.2)" />
    </Link>
  );
}

function HealthItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>{label}:</span>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}
