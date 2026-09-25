import { describe, it, expect } from 'vitest';

import { matchQuestion, type MatchCandidate } from '@/lib/qa/matching';

/**
 * The lexical fallback, which is what runs whenever the AI matcher is
 * unavailable. Every test here passes `allowAI: false` so nothing reaches the
 * network and the behaviour under test is deterministic.
 *
 * What matters about this matcher is as much what it refuses as what it
 * catches: a wrong answer served confidently is worse for a parent than "we
 * don't have an answer for that yet", which routes to the coach instead.
 */

const EQUIPMENT: MatchCandidate = {
  id: 'QA-033',
  question: 'How much does the equipment matter?',
  answer: 'Gear helps, but it does not make the save.',
};

const withKeywords = (keywords: string[]): MatchCandidate => ({ ...EQUIPMENT, keywords });

async function ask(question: string, candidates: MatchCandidate[]) {
  return matchQuestion(question, candidates, { allowAI: false });
}

describe('lexical matching', () => {
  it('matches a rephrasing that shares the significant words', async () => {
    const result = await ask('does gear matter much', [EQUIPMENT]);
    expect(result.via).toBe('lexical');
    expect(result.match?.id).toBe('QA-033');
  });

  it('returns no match when nothing shares enough words', async () => {
    const result = await ask('what time does the rink open tomorrow', [EQUIPMENT]);
    expect(result.match).toBeNull();
    expect(result.via).toBe('none');
  });

  it('returns no match against an empty library', async () => {
    const result = await ask('how much does the equipment matter', []);
    expect(result.match).toBeNull();
    expect(result.via).toBe('none');
  });
});

describe('lexical matching with the coach keywords', () => {
  it("reaches an entry through Michael's words when the visitor used none of the question's", async () => {
    // "gear" and "pricey" appear nowhere in the stored question, so this is a
    // miss without keywords and a hit with them.
    expect((await ask('is my gear pricey', [EQUIPMENT])).match).toBeNull();

    const result = await ask('is my gear pricey', [withKeywords(['gear', 'pricey'])]);
    expect(result.via).toBe('lexical');
    expect(result.match?.id).toBe('QA-033');
  });

  it('serves the stored answer unchanged, never anything derived from the keywords', async () => {
    const result = await ask('is my gear pricey', [withKeywords(['gear', 'pricey'])]);
    expect(result.match?.answer).toBe(EQUIPMENT.answer);
    expect(result.match?.question).toBe(EQUIPMENT.question);
  });

  it('does not let keywords rescue a match that is still too thin', async () => {
    // One word in common out of five. Keywords widen what can be hit; they do
    // not lower the bar for how much of the question has to be hit.
    const result = await ask(
      'can my gear fix my rebound control problems',
      [withKeywords(['gear', 'pricey'])]
    );
    expect(result.match).toBeNull();
  });

  it('treats a missing keywords field the same as an empty one', async () => {
    const withField = await ask('does gear matter much', [withKeywords([])]);
    const withoutField = await ask('does gear matter much', [EQUIPMENT]);
    expect(withField.match?.id).toBe(withoutField.match?.id);
  });
});
