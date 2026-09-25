'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Who We Are', path: '/who-we-are' },
  { label: 'The System', path: '/the-system' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Contact Us', path: '/contact' },
];

const BLUE = '#37b5ff';

export function PublicPageNav() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between">

        {/* Logo */}
        <button
          onClick={() => { router.push('/'); setOpen(false); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
          aria-label="Go to home"
        >
          <img src="/logo.png" alt="Smarter Goalie" className="h-10 sm:h-11 w-auto object-contain" />
        </button>

        {/* Desktop nav */}
        <div className="hidden sm:flex gap-6 items-center">
          {NAV_LINKS.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => router.push(path)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => router.push('/auth/login')}
            style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Login
          </button>
        </div>

        {/* Mobile: hamburger */}
        <button
          className="flex items-center justify-center sm:hidden"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#1e293b', minWidth: '44px', minHeight: '44px' }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div style={{ background: '#fff', borderTop: '1px solid #f1f5f9', padding: '4px 20px 20px' }}>
          {NAV_LINKS.map(({ label, path }) => (
            <button
              key={path}
              onClick={() => { router.push(path); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b', padding: '16px 0', letterSpacing: '0.02em' }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { router.push('/auth/login'); setOpen(false); }}
            style={{ display: 'block', width: '100%', marginTop: '16px', background: BLUE, color: '#fff', border: 'none', borderRadius: '8px', padding: '15px 0', fontSize: '14px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
          >
            Login
          </button>
        </div>
      )}
    </nav>
  );
}
