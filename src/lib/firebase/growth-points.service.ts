import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

export type GrowthPointsEventType =
  | 'MODULE_COMPLETE'
  | 'KNOWLEDGE_CHECK_COMPLETE'
  | 'CHART_LOGGED'
  | 'STREAK_MILESTONE'
  | 'PILLAR_COMPLETE'
  | 'ALL_PILLARS_COMPLETE'
  | 'GOAL_COMPLETE'
  | 'PERK_REDEMPTION';

export interface GrowthPointsTransaction {
  id: string;
  goalieId: string;
  transactionType: 'EARN' | 'SPEND';
  points: number;
  eventType: GrowthPointsEventType;
  eventReferenceId?: string;
  description: string;
  createdAt: Date;
}

export interface GrowthPointsBalance {
  goalieId: string;
  currentBalance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  lastUpdated: Date;
}

const BALANCES_COL = 'growth_points_balance';
const TRANSACTIONS_COL = 'growth_points_transactions';

/** Awards being written right now, keyed by goalie + event + reference. */
const awardsInFlight = new Map<string, Promise<boolean>>();

export const growthPointsService = {
  /**
   * Award points, writing a transaction log entry and updating the balance atomically.
   * Does NOT deduplicate — use awardPointsOnce when idempotency is needed.
   */
  async awardPoints(
    userId: string,
    eventType: GrowthPointsEventType,
    points: number,
    description: string,
    referenceId?: string
  ): Promise<void> {
    await runTransaction(db, async (tx) => {
      const balanceRef = doc(db, BALANCES_COL, userId);
      const balanceSnap = await tx.get(balanceRef);

      if (balanceSnap.exists()) {
        tx.update(balanceRef, {
          currentBalance: increment(points),
          lifetimeEarned: increment(points),
          lastUpdated: Timestamp.now(),
        });
      } else {
        tx.set(balanceRef, {
          goalieId: userId,
          currentBalance: points,
          lifetimeEarned: points,
          lifetimeSpent: 0,
          lastUpdated: Timestamp.now(),
        });
      }

      const txRef = doc(collection(db, TRANSACTIONS_COL));
      tx.set(txRef, {
        goalieId: userId,
        transactionType: 'EARN',
        points,
        eventType,
        eventReferenceId: referenceId ?? null,
        description,
        createdAt: Timestamp.now(),
      });
    });
  },

  /**
   * Award points only once per referenceId + eventType combination.
   * Returns true if points were awarded, false if already awarded.
   *
   * The check below is a query followed by a write, so two calls that overlap both
   * see an empty ledger and both write: a Knowledge Check was paying 125 twice, in the
   * same second. Overlapping calls for the same award now share one run; only the call
   * that actually wrote reports `true`.
   */
  async awardPointsOnce(
    userId: string,
    eventType: GrowthPointsEventType,
    points: number,
    description: string,
    referenceId: string
  ): Promise<boolean> {
    const key = `${userId}|${eventType}|${referenceId}`;
    const running = awardsInFlight.get(key);
    if (running) {
      await running.catch(() => {});
      return false;
    }

    const run = this.writeAwardIfNew(userId, eventType, points, description, referenceId);
    awardsInFlight.set(key, run);
    try {
      return await run;
    } finally {
      awardsInFlight.delete(key);
    }
  },

  async writeAwardIfNew(
    userId: string,
    eventType: GrowthPointsEventType,
    points: number,
    description: string,
    referenceId: string
  ): Promise<boolean> {
    const q = query(
      collection(db, TRANSACTIONS_COL),
      where('goalieId', '==', userId),
      where('eventType', '==', eventType),
      where('eventReferenceId', '==', referenceId),
      limit(1)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return false;

    await this.awardPoints(userId, eventType, points, description, referenceId);
    return true;
  },

  async getBalance(userId: string): Promise<GrowthPointsBalance | null> {
    const snap = await getDoc(doc(db, BALANCES_COL, userId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      goalieId: d.goalieId,
      currentBalance: d.currentBalance ?? 0,
      lifetimeEarned: d.lifetimeEarned ?? 0,
      lifetimeSpent: d.lifetimeSpent ?? 0,
      lastUpdated: d.lastUpdated?.toDate() ?? new Date(),
    };
  },

  async getTransactions(userId: string, limitCount = 50): Promise<GrowthPointsTransaction[]> {
    const q = query(
      collection(db, TRANSACTIONS_COL),
      where('goalieId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        goalieId: data.goalieId,
        transactionType: data.transactionType,
        points: data.points,
        eventType: data.eventType,
        eventReferenceId: data.eventReferenceId ?? undefined,
        description: data.description,
        createdAt: data.createdAt?.toDate() ?? new Date(),
      };
    });
  },
};
