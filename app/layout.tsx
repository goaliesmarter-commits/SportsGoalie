import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

import { AuthProvider } from '@/lib/auth/context';
import { CoachAudioProvider } from '@/lib/audio/context';
import { Toaster } from '@/components/ui/sonner';
import { LayoutShell } from '@/components/LayoutShell';

import './globals.css';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  // Michael's wording, verbatim — the system's name as it is spoken and sold.
  title: 'SMARTER GOALIE EDUCATIONAL SYSTEMS — DESIGNED FOR THE MOTIVATED',
  description:
    'Train the Mind. Understand the mechanics. Think Smart - Play Smarter. Build 8 Pillars of Intelligent Goaltending through cognitive awareness, technical precision, and proven positional systems.',
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
          </CoachAudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
