'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Award,
  LogOut,
  ChevronLeft,
  Menu,
  X,
  User,
  MessageSquare,
  ClipboardList,
  UserCircle,
  Shield,
  Dumbbell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

const BLUE = '#37b5ff';

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Pillars', href: '/pillars', icon: BookOpen },
  { label: 'Charting', href: '/charting', icon: ClipboardList },
  { label: 'Training', href: '/training', icon: Dumbbell },
  { label: 'Mind Vault', href: '/mind-vault', icon: Shield },
  { label: 'Analytics', href: '/progress', icon: BarChart3 },
  { label: 'Goals & Achievements', href: '/goals', icon: Award },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Profile', href: '/profile', icon: UserCircle },
];

const sidebarBg = 'linear-gradient(180deg, #031f45 0%, #0a2d58 60%, #0d3460 100%)';
const borderColor = 'rgba(55,181,255,0.12)';

export function DashboardSidebar({ isOpen, onToggle }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => { await logout(); router.push('/'); };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      <style>{`
        .nav-sidebar { width: 0; transform: translateX(-100%); transition: width 0.3s ease, transform 0.3s ease; }
        .nav-sidebar-open { width: 256px !important; transform: translateX(0) !important; }
        @media (min-width: 1024px) { .nav-sidebar { width: 80px !important; transform: translateX(0) !important; } }
        .nav-item-inactive:hover { background: rgba(55,181,255,0.08) !important; color: #fff !important; }
        .logout-btn:hover { background: rgba(248,113,113,0.1) !important; color: #f87171 !important; }
        .sidebar-toggle:hover { background: rgba(55,181,255,0.1) !important; color: ${BLUE} !important; }
      `}</style>

      {/* Mobile overlay */}
      {isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }} className="lg:hidden" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <aside
        className={isOpen ? 'nav-sidebar-open' : 'nav-sidebar'}
        style={{
          position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 50,
          display: 'flex', flexDirection: 'column',
          background: sidebarBg,
          borderRight: `1px solid ${borderColor}`,
          boxShadow: '4px 0 24px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Glowing top accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', padding: '0 16px', borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
          {isOpen ? (
            <>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <img src="/logo.png" alt="Smarter Goalie" style={{ height: '32px', width: 'auto' }} />
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '13px', letterSpacing: '-0.02em' }}>SmarterGoalie</span>
              </Link>
              <button onClick={onToggle} className="sidebar-toggle" aria-label="Close sidebar" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <X size={18} className="lg:hidden" />
                <ChevronLeft size={18} className="hidden lg:block" />
              </button>
            </>
          ) : (
            <button onClick={onToggle} className="sidebar-toggle hidden lg:flex" style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* User Profile */}
        <div style={{ padding: isOpen ? '16px' : '12px 8px', borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isOpen ? '12px' : '0', justifyContent: isOpen ? 'flex-start' : 'center' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, ${BLUE} 0%, #0ea5e9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid rgba(55,181,255,0.3)` }}>
              <User size={18} color="#000f28" />
            </div>
            {isOpen && (
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p style={{ color: BLUE, fontSize: '11px', fontWeight: 600 }}>Goalie</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                className={!active ? 'nav-item-inactive' : ''}
                title={!isOpen ? item.label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: isOpen ? '10px 12px' : '10px',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  borderRadius: '10px', textDecoration: 'none',
                  fontSize: '13px', fontWeight: 600, transition: 'all 0.2s',
                  background: active ? `rgba(55,181,255,0.18)` : 'transparent',
                  color: active ? BLUE : 'rgba(255,255,255,0.55)',
                  border: active ? `1px solid rgba(55,181,255,0.3)` : '1px solid transparent',
                  boxShadow: active ? `0 0 12px rgba(55,181,255,0.12)` : 'none',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0, color: active ? BLUE : undefined }} />
                {isOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <button
            onClick={handleLogout}
            className="logout-btn"
            title={!isOpen ? 'Log out' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: isOpen ? '10px 12px' : '10px', justifyContent: isOpen ? 'flex-start' : 'center', borderRadius: '10px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {isOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
