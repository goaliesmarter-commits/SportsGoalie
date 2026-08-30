import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { emailService } from '@/lib/services/email.service';
import { logger } from '@/lib/utils/logger';

/**
 * Admin: acting on one queued visitor question.
 *
 *   PATCH /api/admin/qa/submissions/:id
 *     { action: 'answer', question, answer } — Michael's reply. Three things
 *       happen in order: the reply is published into the library (so the next
 *       person asking gets it instantly), the visitor is emailed the answer,
 *       and the submission is marked answered. `question` is the canonical
 *       form for the library — Michael can rewrite the visitor's phrasing.
 *     { action: 'dismiss' } — spam or nonsense; no email is sent.
 */

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('answer'),
    question: z.string().trim().min(3).max(500),
    answer: z.string().trim().min(1).max(10000),
  }),
  z.object({ action: z.literal('dismiss') }),
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid action' },
      { status: 400 }
    );
  }

  try {
    const submissionRef = adminDb.collection('qaSubmissions').doc(id);
    const snapshot = await submissionRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }
    const submission = snapshot.data()!;

    if (parsed.data.action === 'dismiss') {
      await submissionRef.update({ status: 'dismissed' });
      return NextResponse.json({ success: true });
    }

    // Answering twice would publish a duplicate entry and email the visitor again.
    if (submission.status === 'answered') {
      return NextResponse.json({ success: false, error: 'This question has already been answered' }, { status: 409 });
    }

    const { question, answer } = parsed.data;

    // 1. Publish into the library.
    const entryRef = await adminDb.collection('qaEntries').add({
      question,
      answer,
      status: 'published',
      source: 'visitor-question',
      timesServed: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Email the visitor Michael's answer, verbatim.
    let emailSent = false;
    const visitorEmail = submission.email as string | undefined;
    if (visitorEmail) {
      try {
        await emailService.sendEmail({
          to: visitorEmail,
          subject: 'Your question to Smarter Goalie — answered',
          text: `You asked us:\n"${submission.question}"\n\nHere is the answer:\n\n${answer}\n\n— Smarter Goalie\n${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px;">
              <p>You asked us:</p>
              <blockquote style="margin: 12px 0; padding: 12px 16px; background: #f1f5f9; border-left: 4px solid #37b5ff;">${escapeHtml(String(submission.question ?? ''))}</blockquote>
              <p>Here is the answer:</p>
              <div style="margin: 12px 0; padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(answer)}</div>
              <p style="color: #64748b; font-size: 13px;">— Smarter Goalie · <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}">smartergoalie.com</a></p>
            </div>
          `,
        });
        emailSent = true;
      } catch (error) {
        // The answer is published either way; the admin UI surfaces that the
        // email did not go out so Michael can follow up by hand.
        logger.error('Answer published but visitor email failed', 'QA-Admin-API', { id, error });
      }
    }

    // 3. Close the queue item.
    await submissionRef.update({
      status: 'answered',
      answeredAt: FieldValue.serverTimestamp(),
      publishedEntryId: entryRef.id,
    });

    return NextResponse.json({ success: true, entryId: entryRef.id, emailSent });
  } catch (error) {
    logger.error('Failed to act on QA submission', 'QA-Admin-API', { id, error });
    return NextResponse.json({ success: false, error: 'Failed to process submission' }, { status: 500 });
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
