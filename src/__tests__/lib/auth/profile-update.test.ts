import { describe, it, expect } from 'vitest';
import { toProfileUpdate, resolveProfile } from '@/lib/auth/profile-update';

describe('toProfileUpdate', () => {
  it('saves the picture under profileImage, the field every screen reads', () => {
    expect(toProfileUpdate({ displayName: 'Alex Tester', photoURL: 'https://example.com/me.jpg' })).toEqual({
      displayName: 'Alex Tester',
      profileImage: 'https://example.com/me.jpg',
    });
  });

  it('never writes a photoURL field', () => {
    const update = toProfileUpdate({ displayName: 'Alex Tester', photoURL: 'https://example.com/me.jpg' });
    expect(update).not.toHaveProperty('photoURL');
  });

  it('lets a blank picture field clear the picture', () => {
    expect(toProfileUpdate({ displayName: 'Alex Tester', photoURL: '' })).toEqual({
      displayName: 'Alex Tester',
      profileImage: '',
    });
  });

  it('leaves out what the form did not send', () => {
    expect(toProfileUpdate({ displayName: 'Alex Tester' })).toEqual({ displayName: 'Alex Tester' });
  });
});

describe('resolveProfile', () => {
  const account = { displayName: 'Alex Morgan', photoURL: 'https://example.com/google.jpg' };

  it('shows the name saved on Profile, not the one the account was registered with', () => {
    expect(resolveProfile({ displayName: 'Alex M', profileImage: undefined }, account).displayName).toBe('Alex M');
  });

  it('shows the picture saved on Profile over the account photo', () => {
    expect(resolveProfile({ profileImage: 'https://example.com/mine.jpg' }, account).profileImage).toBe('https://example.com/mine.jpg');
  });

  it('falls back to the account when nothing was saved', () => {
    expect(resolveProfile({}, account)).toEqual({ displayName: 'Alex Morgan', profileImage: 'https://example.com/google.jpg' });
  });

  it('treats a cleared picture as nothing saved', () => {
    expect(resolveProfile({ profileImage: '' }, { displayName: 'Alex', photoURL: null })).toEqual({ displayName: 'Alex' });
  });
});
