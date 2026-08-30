import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/utils/logger';

/**
 * Abuse limits for the public question box. Two layers, because the box is
 * reachable with no login and each ask can cost an AI call:
 *
 *   1. Per-IP, in-memory — fast, free, per serverless instance. Best-effort
 *      only (each instance keeps its own counters), but it is the layer that
 *      absorbs a single misbehaving client hammering the endpoint.
 *
 *   2. Global daily cap, in Firestore (`qaUsage/{YYYY-MM-DD}`) — durable
 *      across instances. This is the hard ceiling on what the box can cost
 *      in a day. When it is reached, asks still work — they just skip the AI
 *      call and use the free lexical matcher, so the site degrades to
 *      "stricter matching", never to "broken".
 *
 * The read-then-increment on the daily counter is not transactional; a burst
 * can overshoot the cap by a few calls. That is fine — the cap is a cost
 * ceiling, not an exact quota.
 */

const PER_MINUTE = 5;
const PER_HOUR = 30;
const DAILY_AI_CAP = 500;

const hits = new Map<string, number[]>();

export function clientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for; the first entry is the client.
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

/** Layer 1. Returns true when this IP is within its per-minute/per-hour allowance. */
export function checkIpAllowance(ip: string): boolean {
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;
  const minuteAgo = now - 60 * 1000;

  const recent = (hits.get(ip) ?? []).filter(t => t > hourAgo);

  if (recent.length >= PER_HOUR) { hits.set(ip, recent); return false; }
  if (recent.filter(t => t > minuteAgo).length >= PER_MINUTE) { hits.set(ip, recent); return false; }

  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing unboundedly on a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every(t => t <= hourAgo)) hits.delete(key);
    }
  }

  return true;
}

/**
 * Layer 2. Returns true when today's global AI-call budget has room, and
 * counts this call against it. On Firestore failure it returns false — the
 * caller falls back to lexical matching, which costs nothing.
 */
export async function consumeDailyAIBudget(): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const ref = adminDb.collection('qaUsage').doc(day);

  try {
    const snapshot = await ref.get();
    const used = (snapshot.data()?.aiMatches as number | undefined) ?? 0;
    if (used >= DAILY_AI_CAP) return false;

    await ref.set({ aiMatches: FieldValue.increment(1), day }, { merge: true });
    return true;
  } catch (error) {
    logger.error('Daily AI budget check failed; using lexical matcher', 'QA-RateLimit', { error });
    return false;
  }
}
