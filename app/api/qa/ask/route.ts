import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { matchQuestion, type MatchCandidate } from '@/lib/qa/matching';
import { checkIpAllowance, clientIp, consumeDailyAIBudget } from '@/lib/qa/rate-limit';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/qa/ask — the public question box, no login required.
 *
 * Finds which of Michael's stored answers fits the visitor's question and
 * returns it word for word out of Firestore. The matching model only ever
 * picks an index into the stored list (see lib/qa/matching.ts); nothing it
 * writes can reach the visitor. When no stored answer fits, the client offers
 * the leave-your-question path (/api/qa/submit).
 */

const askSchema = z.object({
  question: z.string().trim().min(3, 'Ask a real question').max(500, 'Please keep it under 500 characters'),
});

export async function POST(request: NextRequest) {
  try {
    if (!checkIpAllowance(clientIp(request))) {
      return NextResponse.json(
        { success: false, matched: false, error: "You're asking faster than we can keep up — give it a minute and try again." },
        { status: 429 }
      );
    }

    const parsed = askSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, matched: false, error: parsed.error.issues[0]?.message ?? 'Invalid question' },
        { status: 400 }
      );
    }
    const { question } = parsed.data;

    // Only published entries are matchable. Capped well above any realistic
    // library size; the matcher caps again defensively.
    const snapshot = await adminDb
      .collection('qaEntries')
      .where('status', '==', 'published')
      .limit(300)
      .get();

    const candidates: MatchCandidate[] = snapshot.docs.map(doc => ({
      id: doc.id,
      question: (doc.data().question as string) ?? '',
      answer: (doc.data().answer as string) ?? '',
    }));

    if (candidates.length === 0) {
      // Library is empty (pre-launch state) — straight to the capture path.
      return NextResponse.json({ success: true, matched: false });
    }

    const allowAI = await consumeDailyAIBudget();
    const result = await matchQuestion(question, candidates, { allowAI });

    if (!result.match) {
      return NextResponse.json({ success: true, matched: false });
    }

    // Served-count bump is best-effort; a failed increment must not fail the answer.
    adminDb
      .collection('qaEntries')
      .doc(result.match.id)
      .update({ timesServed: FieldValue.increment(1), lastServedAt: FieldValue.serverTimestamp() })
      .catch(() => undefined);

    return NextResponse.json({
      success: true,
      matched: true,
      question: result.match.question,
      answer: result.match.answer,
    });
  } catch (error) {
    logger.error('Question box ask failed', 'QA-Ask-API', { error });
    return NextResponse.json(
      { success: false, matched: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 }
    );
  }
}
