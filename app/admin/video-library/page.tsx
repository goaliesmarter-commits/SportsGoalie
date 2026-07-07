'use client';

import { AdminRoute } from '@/components/auth/protected-route';
import { Video } from 'lucide-react';

const BLUE = '#37b5ff';
const card = { background: 'rgba(2,18,44,0.85)', border: '1px solid rgba(55,181,255,0.14)', borderRadius: '16px' } as const;

function VideoLibraryPageContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>Video Library</h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '15px' }}>Upload videos once, reuse them across any quiz</p>
      </div>

      <div style={{ ...card, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', textAlign: 'center' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(55,181,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Video size={24} color={BLUE} />
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>Coming Soon</h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', maxWidth: '360px' }}>
          The video library is temporarily unavailable while we work on it. Check back soon.
        </p>
      </div>
    </div>
  );
}

export default function VideoLibraryPage() {
  return <AdminRoute><VideoLibraryPageContent /></AdminRoute>;
}
