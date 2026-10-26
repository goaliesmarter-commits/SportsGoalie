'use client';

/**
 * A page's extra area for buttons added from admin (Audio Part 2: "add new
 * buttons where needed, including the Parent buttons").
 *
 * Draws one "Hear Coach Mike" button for each recording admin has placed in this
 * page's extra slot, in library order, and nothing at all when there are none —
 * so it can sit on a page before Michael has added anything.
 */

import { usePathname } from 'next/navigation';

import { CoachAudioButton } from '@/components/audio/CoachAudioButton';
import { useCoachAudio } from '@/lib/audio/context';
import { EXTRA_SLOT_LABEL, slotKey } from '@/lib/audio/slots';

export function AudioSlotButtons({ className }: { className?: string }) {
  const pathname = usePathname() ?? '';
  const { clipsForSlot, settings } = useCoachAudio();

  const ids = clipsForSlot(slotKey(pathname, EXTRA_SLOT_LABEL));
  if (ids.length === 0) return null;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {ids.map(id => {
        // An added recording has a title and no page label; a catalogue one
        // falls back to its own words, as everywhere else.
        const title = settings[id]?.added?.title;
        return (
          <CoachAudioButton
            key={id}
            clipId={id}
            label={title ? `HEAR COACH MIKE: ${title.toUpperCase()}` : undefined}
            showToggle={false}
            whenMissing="hide"
          />
        );
      })}
    </div>
  );
}
