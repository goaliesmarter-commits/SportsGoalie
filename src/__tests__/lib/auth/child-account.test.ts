import { describe, expect, it } from 'vitest';

import {
  GOALIE_LOGIN_DOMAIN,
  generateLoginHandle,
  handleToEmail,
  isGoalieLoginEmail,
  isLoginHandle,
  normalizeHandle,
  resolveLoginIdentifier,
  slugifyName,
} from '@/lib/auth/child-account';

/** A pinned "random" so a generated handle is a fixed string to assert on. */
const fixedRandom = (...values: number[]) => {
  let index = 0;
  return () => values[index++ % values.length];
};

describe('slugifyName', () => {
  it('lowercases and strips spaces', () => {
    expect(slugifyName('Jake Wilson')).toBe('jakewilson');
  });

  it('folds accents rather than dropping the letters', () => {
    // "José" losing its é must not become "jos".
    expect(slugifyName('José')).toBe('jose');
  });

  it('drops punctuation', () => {
    expect(slugifyName("O'Brien-Smith")).toBe('obriensmith');
  });

  it('keeps digits', () => {
    expect(slugifyName('Jake 2')).toBe('jake2');
  });

  it('truncates a very long name', () => {
    expect(slugifyName('Bartholomew Fitzgerald Wellington')).toBe('bartholomewfitzgeral');
    expect(slugifyName('Bartholomew Fitzgerald Wellington').length).toBeLessThanOrEqual(20);
  });

  it('falls back when the name folds away to nothing', () => {
    expect(slugifyName('中文名')).toBe('goalie');
    expect(slugifyName('...')).toBe('goalie');
    expect(slugifyName('')).toBe('goalie');
  });

  it('falls back on a single surviving character', () => {
    // One character would make a handle nobody recognises as a name.
    expect(slugifyName('J')).toBe('goalie');
  });
});

describe('generateLoginHandle', () => {
  it('joins the name and a four-character suffix', () => {
    const handle = generateLoginHandle('Jake Wilson', fixedRandom(0));
    expect(handle).toBe('jakewilson-aaaa');
  });

  it('produces a handle that passes its own pattern', () => {
    for (const name of ['Jake', 'José García', '中文名', 'Bartholomew Fitzgerald Wellington']) {
      expect(isLoginHandle(generateLoginHandle(name))).toBe(true);
    }
  });

  it('never uses an ambiguous character', () => {
    // 0/O and 1/I/L get misread off a screen and mistyped by a child.
    for (let i = 0; i < 200; i++) {
      const suffix = generateLoginHandle('Jake').split('-')[1];
      expect(suffix).not.toMatch(/[01oil]/);
    }
  });

  it('varies the suffix between goalies with the same name', () => {
    const handles = new Set(Array.from({ length: 50 }, () => generateLoginHandle('Jake')));
    expect(handles.size).toBeGreaterThan(1);
  });
});

describe('isLoginHandle', () => {
  it('accepts a well-formed handle', () => {
    expect(isLoginHandle('jake-a7k2')).toBe(true);
  });

  it('accepts it however it was typed', () => {
    expect(isLoginHandle('  JAKE-A7K2  ')).toBe(true);
  });

  it('rejects an email address', () => {
    expect(isLoginHandle('parent@example.com')).toBe(false);
    expect(isLoginHandle('jake-a7k2@example.com')).toBe(false);
  });

  it('rejects a mistyped email address', () => {
    // The reason the pattern is strict: these must reach "please enter a valid
    // email address", not "no account found".
    expect(isLoginHandle('jhondoe')).toBe(false);
    expect(isLoginHandle('jhon-doe')).toBe(false);
    expect(isLoginHandle('parent@example')).toBe(false);
  });

  it('rejects a wrong-length suffix', () => {
    expect(isLoginHandle('jake-a7k')).toBe(false);
    expect(isLoginHandle('jake-a7k22')).toBe(false);
  });

  it('rejects a name portion that is too short or too long', () => {
    expect(isLoginHandle('j-a7k2')).toBe(false);
    expect(isLoginHandle(`${'a'.repeat(21)}-a7k2`)).toBe(false);
  });

  it('rejects empty and missing values', () => {
    expect(isLoginHandle('')).toBe(false);
    expect(isLoginHandle(null)).toBe(false);
    expect(isLoginHandle(undefined)).toBe(false);
  });
});

describe('normalizeHandle', () => {
  it('trims and lowercases', () => {
    expect(normalizeHandle('  JAKE-A7K2 ')).toBe('jake-a7k2');
  });
});

describe('handleToEmail', () => {
  it('puts the handle on the goalie domain', () => {
    expect(handleToEmail('jake-a7k2')).toBe(`jake-a7k2@${GOALIE_LOGIN_DOMAIN}`);
  });

  it('normalizes before converting, so one handle has one address', () => {
    expect(handleToEmail(' JAKE-A7K2 ')).toBe(handleToEmail('jake-a7k2'));
  });
});

describe('isGoalieLoginEmail', () => {
  it('recognises a generated login', () => {
    expect(isGoalieLoginEmail(`jake-a7k2@${GOALIE_LOGIN_DOMAIN}`)).toBe(true);
    expect(isGoalieLoginEmail(`JAKE-A7K2@${GOALIE_LOGIN_DOMAIN.toUpperCase()}`)).toBe(true);
  });

  it('does not mistake a real inbox for one', () => {
    expect(isGoalieLoginEmail('parent@example.com')).toBe(false);
    // The parent domain itself is a real inbox and must not match.
    expect(isGoalieLoginEmail('hello@smartergoalie.com')).toBe(false);
  });

  it('rejects empty and missing values', () => {
    expect(isGoalieLoginEmail('')).toBe(false);
    expect(isGoalieLoginEmail(null)).toBe(false);
    expect(isGoalieLoginEmail(undefined)).toBe(false);
  });
});

describe('resolveLoginIdentifier', () => {
  it('turns a handle into the address Firebase stores', () => {
    expect(resolveLoginIdentifier('jake-a7k2')).toBe(`jake-a7k2@${GOALIE_LOGIN_DOMAIN}`);
    expect(resolveLoginIdentifier('  JAKE-A7K2  ')).toBe(`jake-a7k2@${GOALIE_LOGIN_DOMAIN}`);
  });

  it('passes an email address through', () => {
    expect(resolveLoginIdentifier('parent@example.com')).toBe('parent@example.com');
  });

  it('trims an email address', () => {
    expect(resolveLoginIdentifier('  parent@example.com ')).toBe('parent@example.com');
  });

  it('leaves malformed input alone rather than guessing', () => {
    // Sign-in rejects it and the form has already said why. Turning it into a
    // handle address here would produce "no account found" instead.
    expect(resolveLoginIdentifier('jhondoe')).toBe('jhondoe');
  });

  it('round-trips a generated handle', () => {
    const handle = generateLoginHandle('Jake Wilson');
    expect(resolveLoginIdentifier(handle)).toBe(handleToEmail(handle));
    expect(isGoalieLoginEmail(resolveLoginIdentifier(handle))).toBe(true);
  });
});
