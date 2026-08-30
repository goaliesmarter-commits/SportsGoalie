'use client';

import { useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Header7 } from '@/components/header-7';
import { Footer7 } from '@/components/footer-7';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { ParentSidebar } from '@/components/parent/ParentSidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { CoachSidebar } from '@/components/coach/CoachSidebar';
import { QuestionBox } from '@/components/qa/QuestionBox';
import { PausedAccountScreen } from '@/components/auth/PausedAccountScreen';
import { useAuth } from '@/lib/auth/context';

const BARE_ROUTES = ['/auth'];
const NAKED_ROUTES = [
  '/explain',
  '/goalie',
  '/parent-role',
  '/team-programs',
  '/goalie-coach',
  '/organization',
  '/who-we-are',
  '/the-system',
  '/contact',
  '/bridge',
  '/7-pillars',
  '/pillar',
  '/offer',
  // Legal pages render their own PublicPageNav and Footer7, like the rest of
  // the marketing site. Without these entries they fall through to the default
  // branch at the bottom of this file and come out wrapped in the goalie
  // dashboard sidebar — which is wrong for a page a logged-out visitor reaches
  // from the sign-up tickbox.
  '/terms',
  '/privacy',
];
const ONBOARDING_ROUTES = ['/onboarding', '/coach/onboarding', '/coach/assessment'];
const PUBLIC_ROUTES = ['/', '/pricing'];

/**
 * Prefix match that stops at a path segment: '/pillar' matches '/pillar' and
 * '/pillar/3', but NOT '/pillars'.
 *
 * A plain startsWith() made the goalie pillar list (/pillars) and its detail
 * pages (/pillars/[id]) match the public sales route (/pillar), so they were
 * rendered naked — no sidebar, no top bar, and no dark page background. Their
 * white heading text then sat on the white body and vanished.
 */
function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isPublicRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_ROUTES.some(route => route !== '/' && matchesRoute(pathname, route));
}
function isBareRoute(pathname: string): boolean {
  return BARE_ROUTES.some(route => matchesRoute(pathname, route));
}
function isNakedRoute(pathname: string): boolean {
  return NAKED_ROUTES.some(route => matchesRoute(pathname, route));
}
function isOnboardingRoute(pathname: string): boolean {
  return ONBOARDING_ROUTES.some(route => matchesRoute(pathname, route));
}
function isAdminRoute(pathname: string): boolean { return pathname.startsWith('/admin'); }
function isCoachRoute(pathname: string): boolean { return pathname.startsWith('/coach'); }
function isParentRoute(pathname: string): boolean { return pathname.startsWith('/parent'); }
function isFullscreenRoute(pathname: string): boolean {
  return pathname.startsWith('/charting/sessions/') || pathname.startsWith('/charting/analytics') || pathname.startsWith('/training/log');
}

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first === 'admin') {
    const titles: Record<string, string> = {
      admin: 'Dashboard', analytics: 'Analytics', users: 'Users', coaches: 'Coaches',
      pillars: 'Pillars', quizzes: 'Quizzes', 'video-reviews': 'Video Reviews',
      'form-templates': 'Form Templates', messages: 'Messages', moderation: 'Moderation',
      'question-index': 'Question Index',
      charting: 'Charting', settings: 'Settings', 'project-assistant': 'Project Assistant',
    };
    return titles[segments[1]] || 'Dashboard';
  }
  if (first === 'coach') {
    const titles: Record<string, string> = {
      coach: 'Dashboard', students: 'My Goalies', content: 'Content Library',
      assessment: 'Baseline Assessment', profile: 'Profile', charting: 'Charting',
    };
    return titles[segments[1]] || 'Dashboard';
  }
  if (first === 'parent') {
    const titles: Record<string, string> = {
      parent: 'Dashboard', goalies: 'My Goalies', 'link-child': 'Link Goalie',
      onboarding: 'Assessment', perception: 'Perception', profile: 'Profile', child: 'Goalie Details',
    };
    return titles[segments[1]] || 'Dashboard';
  }
  const titles: Record<string, string> = {
    dashboard: 'Dashboard', pillars: 'Pillars', lessons: 'Lessons', quizzes: 'Quizzes',
    quiz: 'Quiz', progress: 'Analytics', goals: 'Goals & Achievements', messages: 'Messages',
    profile: 'Profile', charting: 'Charting', 'mind-vault': 'Mind Vault', learn: 'Learn',
    training: 'Daily Training',
  };
  return titles[first] || 'Dashboard';
}

function TopBar({ pageTitle, onToggleSidebar }: { pageTitle: string; onToggleSidebar: () => void }) {
  return (
    <>
      <style>{`.tb-toggle:hover{background:rgba(0,255,255,0.08)!important;color:#00FFFF!important}`}</style>
      <header style={{ position: 'sticky', top: 0, zIndex: 30, height: '64px', background: 'rgba(6,5,15,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,255,255,0.1)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', boxShadow: '0 1px 32px rgba(0,0,0,0.5)' }}>
        <button onClick={onToggleSidebar} className="lg:hidden tb-toggle"
          style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}
          aria-label="Toggle sidebar">
          <svg style={{ height: '20px', width: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>{pageTitle}</span>
        <div style={{ flex: 1 }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'linear-gradient(135deg, #00FFFF, #00FF99)', boxShadow: '0 0 10px rgba(0,255,255,0.7)', flexShrink: 0 }} />
      </header>
    </>
  );
}

const appBg = '#041830';
const adminBg = 'linear-gradient(145deg, #010b1e 0%, #020f24 50%, #010d20 100%)';

export function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggle = () => setSidebarOpen(o => !o);

  if (searchParams.get('embedded') === '1') return <>{children}</>;
  // The question box rides on the visitor-facing site: the marketing pages
  // (naked routes) and the public routes below. It stays off auth forms,
  // onboarding, and the logged-in app, where a floating public Q&A box would
  // sit on top of working UI.
  if (isNakedRoute(pathname)) return <>{children}<QuestionBox /></>;
  if (isBareRoute(pathname)) return <>{children}</>;

  // The subscription pause switch. A paused member can still browse the
  // public marketing site (the branches above and isPublicRoute below), but
  // every app shell — onboarding included — is replaced by the paused screen,
  // with no sidebar around it. ProtectedRoute repeats this check as a second
  // layer. Admins are exempt: the switch is controlled from their panel.
  if (user?.isPaused && user.role !== 'admin' && !isPublicRoute(pathname)) {
    return <PausedAccountScreen />;
  }

  // Onboarding: Header7 navbar (fixed) + dark content below it, no footer
  if (isOnboardingRoute(pathname)) {
    return (
      <>
        <Header7 />
        <div style={{ paddingTop: '72px', height: '100dvh', overflow: 'hidden', background: 'linear-gradient(145deg, #06050f 0%, #0d0b1e 50%, #08071a 100%)' }}>
          {children}
        </div>
      </>
    );
  }

  if (isPublicRoute(pathname)) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header7 />
        <main className="flex-1">{children}</main>
        <Footer7 />
        <QuestionBox />
      </div>
    );
  }

  const pageTitle = getPageTitle(pathname);

  if (isAdminRoute(pathname)) {
    return (
      <div style={{ minHeight: '100vh', background: adminBg }}>
        <AdminSidebar isOpen={sidebarOpen} onToggle={toggle} />
        <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <TopBar pageTitle={pageTitle} onToggleSidebar={toggle} />
          <main className="p-3 md:p-6">{children}</main>
        </div>
      </div>
    );
  }

  if (isCoachRoute(pathname)) {
    return (
      <div style={{ minHeight: '100vh', background: appBg }}>
        <CoachSidebar isOpen={sidebarOpen} onToggle={toggle} />
        <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <TopBar pageTitle={pageTitle} onToggleSidebar={toggle} />
          <main className="p-3 md:p-6">{children}</main>
        </div>
      </div>
    );
  }

  if (isParentRoute(pathname)) {
    return (
      <div style={{ minHeight: '100vh', background: appBg }}>
        <ParentSidebar isOpen={sidebarOpen} onToggle={toggle} />
        <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <TopBar pageTitle={pageTitle} onToggleSidebar={toggle} />
          <main className="p-3 md:p-6">{children}</main>
        </div>
      </div>
    );
  }

  // Parent-chart pages live under /charting/sessions/[id]/parent-chart/* (shared session
  // namespace) but must show the ParentSidebar, not the DashboardSidebar. These pages have
  // their own sticky header so we skip the LayoutShell TopBar (fullscreen-style layout).
  if (pathname.includes('/parent-chart')) {
    return (
      <div style={{ minHeight: '100vh', background: appBg }}>
        <ParentSidebar isOpen={sidebarOpen} onToggle={toggle} />
        <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
          <main>{children}</main>
        </div>
      </div>
    );
  }

  const fullscreen = isFullscreenRoute(pathname);

  return (
    <div style={{ minHeight: '100vh', background: appBg }}>
      <DashboardSidebar isOpen={sidebarOpen} onToggle={toggle} />
      <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {!fullscreen && <TopBar pageTitle={pageTitle} onToggleSidebar={toggle} />}
        <main className={fullscreen ? '' : 'p-3 md:p-6'}>{children}</main>
      </div>
    </div>
  );
}
