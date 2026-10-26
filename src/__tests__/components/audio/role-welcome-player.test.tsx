import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import { RoleWelcomePlayer } from '@/components/audio/RoleWelcomePlayer';
import { clearRoleArrival, markRoleArrival } from '@/lib/audio/arrival';

const audio = vi.hoisted(() => ({
  clipsForSlot: vi.fn(),
  play: vi.fn(),
  resume: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setEnabled: vi.fn(),
  state: {
    isLoading: false,
    playingId: null as string | null,
    blockedId: null as string | null,
    enabled: true,
  },
}));

vi.mock('next/navigation', () => ({ usePathname: () => '/parent-role' }));

vi.mock('@/lib/audio/context', () => ({
  useCoachAudio: () => ({
    ...audio.state,
    clips: { 'PR-WELCOME': { durationSeconds: 225 } },
    clipsForSlot: audio.clipsForSlot,
    play: audio.play,
    resume: audio.resume,
    pause: audio.pause,
    seek: audio.seek,
    setEnabled: audio.setEnabled,
    getLoadedId: () => null,
    textFor: () => 'What Coach Mike says.',
  }),
  usePlaybackPosition: () => ({ currentTime: 0, duration: null }),
}));

const QUOTE = 'What it means to truly support your goalie';

beforeEach(() => {
  vi.useFakeTimers();
  Object.values(audio).forEach(value => {
    if (typeof value === 'function' && 'mockReset' in value) value.mockReset();
  });
  audio.clipsForSlot.mockReturnValue(['PR-WELCOME']);
  audio.state = { isLoading: false, playingId: null, blockedId: null, enabled: true };
});

afterEach(() => {
  cleanup();
  clearRoleArrival();
  vi.useRealTimers();
});

describe('RoleWelcomePlayer', () => {
  it('stays hidden until a welcome is placed on the page', () => {
    audio.clipsForSlot.mockReturnValue([]);
    const { container } = render(<RoleWelcomePlayer quote={QUOTE} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("looks for the welcome in this page's welcome slot", () => {
    render(<RoleWelcomePlayer quote={QUOTE} />);
    expect(audio.clipsForSlot).toHaveBeenCalledWith('/parent-role|WELCOME');
  });

  it('shows the real length of the recording rather than a made-up one', () => {
    render(<RoleWelcomePlayer quote={QUOTE} />);
    expect(screen.getAllByText('3:45').length).toBeGreaterThan(0);
  });

  it('starts by itself for a visitor who has just chosen this role', () => {
    markRoleArrival('/parent-role');
    render(<RoleWelcomePlayer quote={QUOTE} />);

    expect(audio.play).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(audio.play).toHaveBeenCalledWith('PR-WELCOME');
  });

  it('waits for a tap from a visitor who came some other way', () => {
    render(<RoleWelcomePlayer quote={QUOTE} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(audio.play).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: "Play Coach Mike's message" }));
    expect(audio.resume).toHaveBeenCalledWith('PR-WELCOME');
  });

  it('does not start by itself when the visitor has turned voice off', () => {
    markRoleArrival('/parent-role');
    audio.state.enabled = false;
    render(<RoleWelcomePlayer quote={QUOTE} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('asks for a tap when the phone refused to start it', () => {
    audio.state.blockedId = 'PR-WELCOME';
    render(<RoleWelcomePlayer quote={QUOTE} />);
    expect(screen.getByRole('status')).toHaveTextContent('TAP PLAY TO HEAR COACH MIKE');
  });

  it('pauses when playing', () => {
    audio.state.playingId = 'PR-WELCOME';
    render(<RoleWelcomePlayer quote={QUOTE} />);
    fireEvent.click(screen.getByRole('button', { name: "Pause Coach Mike's message" }));
    expect(audio.pause).toHaveBeenCalled();
  });
});
