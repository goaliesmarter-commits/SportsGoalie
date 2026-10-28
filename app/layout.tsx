import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

import { AuthProvider } from '@/lib/auth/context';
import { CoachAudioProvider } from '@/lib/audio/context';
import { VoiceMomentTrigger } from '@/components/audio/VoiceMomentTrigger';
import { MomentMessageChip } from '@/components/audio/MomentMessageChip';
import { Toaster } from '@/components/ui/sonner';
import { LayoutShell } from '@/components/LayoutShell';

import './globals.css';

const geistSans = GeistSans;
const geistMono = GeistMono;

const SITE_DESCRIPTION =
  'Train the Mind. Understand the mechanics. Think Smart - Play Smarter. Build 8 Pillars of Intelligent Goaltending through cognitive awareness, technical precision, and proven positional systems.';

export const metadata: Metadata = {
  // A browser tab shows ~25 characters, so the tab leads with the short brand
  // name and each page adds its own name through the template. The full system
  // name and tagline lives in the Open Graph title, where link previews have
  // room for it.
  title: {
    default: 'Smarter Goalie',
    template: '%s | Smarter Goalie',
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Smarter Goalie',
    title: 'SMARTER GOALIE EDUCATIONAL SYSTEMS — DESIGNED FOR THE MOTIVATED',
    description: SITE_DESCRIPTION,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon-192.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <CoachAudioProvider>
            <Suspense fallback={null}>
              <LayoutShell>{children}</LayoutShell>
            </Suspense>
            <Toaster />
            <VoiceMomentTrigger moment="firstLogin" />
            <MomentMessageChip />
          </CoachAudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
