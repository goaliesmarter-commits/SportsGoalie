'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navItems = ['Features', "Who It's For", 'Contact Us', 'Login'];

function navAction(label: string, router: ReturnType<typeof useRouter>) {
  if (label === 'Contact Us') router.push('/contact');
  else if (label === 'Login') router.push('/auth/login');
  else if (label === "Who It's For") router.push('/bridge');
  else {
    const el = document.getElementById(label.toLowerCase());
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}

export const Header7 = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isLandingPage = pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const BLUE = '#37b5ff';

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled
          ? 'bg-white/85 backdrop-blur-md border-b border-slate-200/70 py-3 shadow-sm'
          : 'bg-slate-100/85 backdrop-blur-md border-b border-slate-200/70 py-4'
      }`}
    >
      <div
        className={`flex justify-between items-center ${
          isLandingPage ? 'w-full px-5 md:px-8 lg:px-10' : 'max-w-7xl mx-auto px-5'
        }`}
      >
        {/* Logo */}
        <button
          type="button"
          onClick={() => { router.push('/'); setMenuOpen(false); }}
          className="flex items-center space-x-2 cursor-pointer"
          aria-label="Go to landing page"
        >
          <img
            src="/logo.png"
            alt="Smarter Goalie Logo"
            className="h-10 w-auto object-contain transition-all duration-300 brightness-110 contrast-105"
          />
        </button>

        {/* Desktop nav */}
        <div className="hidden md:flex space-x-8">
          {navItems.map((label) => (
            <button
              key={label}
              onClick={() => navAction(label, router)}
              className="transition-all duration-300 cursor-pointer"
              style={
                label === 'Login'
                  ? { background: BLUE, color: '#fff', fontSize: '14px', fontWeight: 600, padding: '8px 18px', borderRadius: '6px', border: 'none' }
                  : { color: '#1e293b', fontSize: '14px', fontWeight: 600, background: 'none', border: 'none' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="flex items-center md:hidden"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '10px', color: '#1e293b', minWidth: '44px', minHeight: '44px' }}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '4px 20px 20px' }}>
          {navItems.filter(l => l !== 'Login').map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => { navAction(label, router); setMenuOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '15px', fontWeight: 600, color: '#1e293b', padding: '16px 0' }}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { router.push('/auth/login'); setMenuOpen(false); }}
            style={{ display: 'block', width: '100%', marginTop: '16px', background: BLUE, color: '#fff', border: 'none', borderRadius: '8px', padding: '15px 0', fontSize: '14px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}
          >
            Login
          </button>
        </div>
      )}
    </nav>
  );
};
