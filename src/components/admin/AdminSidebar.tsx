'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Users, UserPlus, BarChart3, BookOpen, Trophy,
  Video, FileText, MessageSquare, Shield, Settings, LogOut,
  ChevronLeft, Menu, X, User, BarChart2, Dumbbell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/context';

const BLUE = '#37b5ff';
const sidebarBg = 'linear-gradient(180deg, #000f28 0%, #051e3e 60%, #062344 100%)';
const borderColor = 'rgba(55,181,255,0.12)';

interface AdminSidebarProps { isOpen: boolean; onToggle: () => void; }
interface NavItem { label: string; href: string; icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; }
interface NavSection { label: string; items: NavItem[]; }

const navSections: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'All Users', href: '/admin/users', icon: Users },
      { label: 'Coaches', href: '/admin/coaches', icon: UserPlus },
      { label: 'Goalies', href: '/admin/goalies', icon: User },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'Pillars', href: '/admin/pillars', icon: BookOpen },
      { label: 'Quizzes', href: '/admin/quizzes', icon: Trophy },
      { label: 'Video Library', href: '/admin/video-library', icon: Video },
      { label: 'Video Reviews', href: '/admin/video-reviews', icon: Video },
      { label: 'Form Templates', href: '/admin/form-templates', icon: FileText },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Messages', href: '/admin/messages', icon: MessageSquare },
      { label: 'Voice Queue', href: '/admin/voice-queue', icon: MessageSquare },
      { label: 'Moderation', href: '/admin/moderation', icon: Shield },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Charting', href: '/admin/charting', icon: BarChart2 },
      { label: 'L-Index', href: '/admin/l-index', icon: Dumbbell },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ],
  },
];

export function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => { await logout(); router.push('/'); };
  const isActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <>
      <style>{`
        .a-sidebar { width: 0; transform: translateX(-100%); transition: width 0.3s ease, transform 0.3s ease; }
        .a-sidebar-open { width: 256px !important; transform: translateX(0) !important; }
        @media (min-width: 1024px) {
          .a-sidebar { width: 80px !important; transform: translateX(0) !important; }
        }
        .a-nav-inactive:hover{background:rgba(55,181,255,0.08)!important;color:#fff!important}
        .a-logout:hover{background:rgba(248,113,113,0.1)!important;color:#f87171!important}
        .a-toggle:hover{background:rgba(55,181,255,0.1)!important;color:${BLUE}!important}
      `}</style>

      {isOpen && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 40 }} className="lg:hidden" onClick={onToggle} />}

      <aside
        className={isOpen ? 'a-sidebar-open' : 'a-sidebar'}
        style={{ position: 'fixed', top: 0, left: 0, height: '100%', zIndex: 50, display: 'flex', flexDirection: 'column', background: sidebarBg, borderRight: `1px solid ${borderColor}`, boxShadow: '4px 0 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)` }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', padding: '0 16px', borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
          {isOpen ? (
            <>
              <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                <img src="/logo.png" alt="Smarter Goalie" style={{ height: '32px', width: 'auto' }} />
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '12px', lineHeight: 1.2 }}>SmarterGoalie</div>
                  <div style={{ color: BLUE, fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Admin</div>
                </div>
              </Link>
              <button onClick={onToggle} className="a-toggle" style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <X size={18} className="lg:hidden" /><ChevronLeft size={18} className="hidden lg:block" />
              </button>
            </>
          ) : (
            <button onClick={onToggle} className="a-toggle hidden lg:flex" style={{ width: '100%', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'all 0.2s' }}>
              <Menu size={20} />
            </button>
          )}
        </div>

        {/* User */}
        <div style={{ padding: isOpen ? '16px' : '12px 8px', borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isOpen ? '12px' : '0', justifyContent: isOpen ? 'flex-start' : 'center' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `linear-gradient(135deg, #f87171 0%, #dc2626 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid rgba(248,113,113,0.3)` }}>
              <User size={18} color="#fff" />
            </div>
            {isOpen && (
              <div style={{ overflow: 'hidden' }}>
                <p style={{ color: '#fff', fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.displayName || user?.email?.split('@')[0]}</p>
                <p style={{ color: '#f87171', fontSize: '11px', fontWeight: 600 }}>Admin</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {navSections.map(section => (
            <div key={section.label} style={{ marginBottom: '8px' }}>
              {isOpen && (
                <p style={{ padding: '4px 10px 6px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', color: 'rgba(255,255,255,0.25)' }}>
                  {section.label}
                </p>
              )}
              {!isOpen && <div style={{ margin: '8px 4px', borderTop: `1px solid ${borderColor}` }} className="hidden lg:block" />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {section.items.map(item => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => { if (window.innerWidth < 1024) onToggle(); }} className={!active ? 'a-nav-inactive' : ''} title={!isOpen ? item.label : undefined}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: isOpen ? '8px 10px' : '8px', justifyContent: isOpen ? 'flex-start' : 'center', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s', background: active ? `rgba(55,181,255,0.18)` : 'transparent', color: active ? BLUE : 'rgba(255,255,255,0.5)', border: active ? `1px solid rgba(55,181,255,0.3)` : '1px solid transparent' }}>
                      <Icon size={16} style={{ flexShrink: 0, color: active ? BLUE : undefined }} />
                      {isOpen && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
          <button onClick={handleLogout} className="a-logout" title={!isOpen ? 'Log out' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: isOpen ? '10px 12px' : '10px', justifyContent: isOpen ? 'flex-start' : 'center', borderRadius: '10px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {isOpen && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
