'use client';

/**
 * The "Hear Coach Mike" button on a public page.
 *
 * Nine public pages used to draw their own copy of this button, and none of the
 * copies played anything. Michael's rule (17 October): a button stays hidden
 * until its gem is recorded.
 *
 * Which recording a button plays is set in admin, not here (Audio Part 2, item
 * 2.2): the button's slot is its page address plus its label, and admin attaches
 * a recording to that slot from /admin/coach-audio. A `clipId` passed in code
 * still works and wins, for a button whose recording never changes.
 */

import { usePathname } from 'next/navigation';

import { CoachAudioButton } from '@/components/audio/CoachAudioButton';
import { useCoachAudio } from '@/lib/audio/context';
import { slotKey } from '@/lib/audio/slots';

interface GemVoiceButtonProps {
  /** The words on the button on a wider screen. Also names its slot. */
  label: string;
  /** A recording fixed in code. Leave out to let admin choose it. */
  clipId?: string;
}

export function GemVoiceButton({ label, clipId }: GemVoiceButtonProps) {
  const pathname = usePathname() ?? '';
  const { clipsForSlot } = useCoachAudio();

  const placed = clipId ?? clipsForSlot(slotKey(pathname, label))[0];
  if (!placed) return null;
  return <CoachAudioButton clipId={placed} label={label} whenMissing="hide" />;
}
