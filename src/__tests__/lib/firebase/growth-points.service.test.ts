import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({
  ledger: [] as Array<Record<string, unknown>>,
  transactions: 0,
}));

vi.mock('@/lib/firebase/config', () => ({ db: {} }));

vi.mock('firebase/firestore', () => {
  const Timestamp = { now: () => ({ toDate: () => new Date() }) };
  return {
    Timestamp,
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (ref: { name?: string } | unknown, ...rest: string[]) => ({ ref, rest }),
    query: (...args: unknown[]) => ({ filters: args.filter((a) => a && (a as { field?: string }).field) }),
    where: (field: string, _op: string, value: unknown) => ({ field, value }),
    orderBy: () => ({}),
    limit: () => ({}),
    increment: (n: number) => ({ inc: n }),
    getDoc: async () => ({ exists: () => false }),
    // Stand-in for the ledger query. Like the server, it answers with the ledger as it was when
    // the query was sent, so a write that lands while the reply is in flight is not in it.
    getDocs: async (q: { filters: Array<{ field: string; value: unknown }> }) => {
      const matches = state.ledger.filter((row) => q.filters.every((f) => row[f.field] === f.value));
      await new Promise((r) => setTimeout(r, 5));
      return { empty: matches.length === 0, docs: [] };
    },
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
      await new Promise((r) => setTimeout(r, 5));
      const tx = {
        get: async () => ({ exists: () => false }),
        set: (_ref: unknown, data: Record<string, unknown>) => {
          if (data.eventType) state.ledger.push({ ...data, eventReferenceId: data.eventReferenceId });
        },
        update: () => {},
      };
      await fn(tx);
      state.transactions += 1;
    },
  };
});

import { growthPointsService } from '@/lib/firebase/growth-points.service';

describe('growthPointsService.awardPointsOnce', () => {
  beforeEach(() => {
    state.ledger = [];
    state.transactions = 0;
  });

  it('pays once when two calls for the same award overlap', async () => {
    const args = ['goalie1', 'KNOWLEDGE_CHECK_COMPLETE', 125, 'Knowledge Check Completed', 'quiz_vq1'] as const;

    const [a, b] = await Promise.all([
      growthPointsService.awardPointsOnce(...args),
      growthPointsService.awardPointsOnce(...args),
    ]);

    expect(state.ledger).toHaveLength(1);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it('does not pay again once the award is in the ledger', async () => {
    const args = ['goalie1', 'KNOWLEDGE_CHECK_COMPLETE', 125, 'Knowledge Check Completed', 'quiz_vq1'] as const;

    expect(await growthPointsService.awardPointsOnce(...args)).toBe(true);
    expect(await growthPointsService.awardPointsOnce(...args)).toBe(false);
    expect(state.ledger).toHaveLength(1);
  });

  it('treats a different reference as a different award', async () => {
    const [a, b] = await Promise.all([
      growthPointsService.awardPointsOnce('goalie1', 'KNOWLEDGE_CHECK_COMPLETE', 25, 'x', 'quiz_a'),
      growthPointsService.awardPointsOnce('goalie1', 'KNOWLEDGE_CHECK_COMPLETE', 25, 'x', 'quiz_b'),
    ]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(state.ledger).toHaveLength(2);
  });

  it('lets the same award through again after a failed attempt', async () => {
    const args = ['goalie1', 'KNOWLEDGE_CHECK_COMPLETE', 25, 'x', 'quiz_retry'] as const;

    // A throwing first run must not leave the key stuck in flight.
    const original = growthPointsService.awardPoints;
    growthPointsService.awardPoints = async () => {
      throw new Error('network');
    };
    await expect(growthPointsService.awardPointsOnce(...args)).rejects.toThrow('network');
    growthPointsService.awardPoints = original;

    expect(await growthPointsService.awardPointsOnce(...args)).toBe(true);
  });
});
