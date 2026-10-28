'use client';

/**
 * The "A personal message. Just for you." section on a role page, shown only
 * when there is something in it to hear.
 *
 * The section holds the welcome player and the page's extra buttons, and both
 * draw nothing until admin has placed an uploaded recording on them. Without
 * this the visitor would see the heading promise a message beside an empty
 * half of the section.
 */

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { useCoachAudio } from '@/lib/audio/context';
import { EXTRA_SLOT_LABEL, ROLE_WELCOME_LABEL, slotKey } from '@/lib/audio/slots';

export function RoleVoiceSection({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { clipsForSlot } = useCoachAudio();

  const hasWelcome = clipsForSlot(slotKey(pathname, ROLE_WELCOME_LABEL)).length > 0;
  const hasButtons = clipsForSlot(slotKey(pathname, EXTRA_SLOT_LABEL)).length > 0;
  if (!hasWelcome && !hasButtons) return null;

  return <>{children}</>;
}
