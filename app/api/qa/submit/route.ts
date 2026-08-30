import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { emailService } from '@/lib/services/email.service';
import { checkIpAllowance, clientIp } from '@/lib/qa/rate-limit';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/qa/submit — the no-match path of the public question box.
 *
 * The visitor's question and email land in Michael's queue (qaSubmissions).
 * He answers from /admin/question-index; his reply is emailed to the visitor
 * and published into the library so the next person asking gets it instantly.
 */

const submitSchema = z.object({
  question: z.string().trim().min(3, 'Ask a real question').max(1000, 'Please keep it under 1000 characters'),
  email: z.string().trim().email('Please enter a valid email address').max(200),
});

export async function POST(request: NextRequest) {
  try {
    if (!checkIpAllowance(clientIp(request))) {
      return NextResponse.json(
        { success: false, error: "You're sending faster than we can keep up — give it a minute and try again." },
        { status: 429 }
      );
    }

    const parsed = submitSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid submission' },
        { status: 400 }
      );
    }
    const { question, email } = parsed.data;

    const docRef = await adminDb.collection('qaSubmissions').add({
      question,
      email,
      status: 'new',
      createdAt: FieldValue.serverTimestamp(),
    });

    // Same recipient logic as the contact form: the advertised inbox first,
    // Gmail as fallback while info@ delivery is being confirmed.
    const notifyEmail = (process.env.CONTACT_NOTIFY_EMAIL || 'info@smartergoalie.com, goaliesmarter@gmail.com')
      .split(',')
      .map(address => address.trim())
      .filter(Boolean);

    const queueUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/question-index?tab=queue`;

    try {
      await emailService.sendEmail({
        to: notifyEmail,
        subject: 'New question from the website',
        text: `A visitor asked a question no stored answer matched.\n\nQuestion:\n${question}\n\nTheir email: ${email}\n\nAnswer it from your queue: ${queueUrl}\nYour reply is emailed to them and published into the question index automatically.`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px;">
            <h2 style="margin: 0 0 12px;">New question from the website</h2>
            <p>A visitor asked a question no stored answer matched.</p>
            <blockquote style="margin: 16px 0; padding: 12px 16px; background: #f1f5f9; border-left: 4px solid #37b5ff;">${escapeHtml(question)}</blockquote>
            <p><b>Their email:</b> ${escapeHtml(email)}</p>
            <p><a href="${queueUrl}">Answer it from your queue</a> — your reply is emailed to them and published into the question index automatically.</p>
          </div>
        `,
      });
    } catch (error) {
      // The question is already saved. A failed notification must not tell the
      // visitor their question failed, or they will send it again.
      logger.error('Question saved but notification email failed', 'QA-Submit-API', { id: docRef.id, error });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Question submission failed', 'QA-Submit-API', { error });
    return NextResponse.json(
      { success: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
