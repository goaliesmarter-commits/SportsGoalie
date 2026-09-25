import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { emailService } from '@/lib/services/email.service';
import { checkIpAllowance, clientIp } from '@/lib/qa/rate-limit';
import { logger } from '@/lib/utils/logger';
import {
  E_TRANSFER_ADDRESS,
  FOUNDING_CONFIRMATION_SUBJECT,
  FOUNDING_CONFIRMATION_TEXT,
  FOUNDING_CONFIRMATION_HTML,
  buildFoundingNotification,
} from '@/lib/emails/founding-member-email';

/**
 * POST /api/founding — the public founding-member sign-up form.
 *
 * Three things happen: the sign-up is recorded (`foundingSignups`, status
 * awaiting_payment), the buyer is emailed Michael's payment instructions —
 * his wording verbatim — and Michael is notified. Payment itself happens
 * outside the platform (e-transfer or cheque); Michael marks the record paid
 * from /admin/founding when the money clears.
 *
 * A failed buyer email must NOT fail the submission: the record is already
 * saved, and the success screen shows the same payment instructions, so the
 * buyer can pay either way. The record carries confirmationEmailSent so
 * Michael knows who to follow up with by hand.
 */

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(120),
  email: z.string().trim().email('Please enter a valid email address').max(200),
  goalieName: z.string().trim().min(2, "Please enter the goalie's name").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  note: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    if (!checkIpAllowance(clientIp(request))) {
      return NextResponse.json(
        { success: false, error: "You're sending faster than we can keep up — give it a minute and try again." },
        { status: 429 }
      );
    }

    const parsed = signupSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid submission' },
        { status: 400 }
      );
    }
    const { name, email, goalieName } = parsed.data;
    const phone = parsed.data.phone || undefined;
    const note = parsed.data.note || undefined;

    const docRef = await adminDb.collection('foundingSignups').add({
      name,
      email,
      goalieName,
      ...(phone && { phone }),
      ...(note && { note }),
      status: 'awaiting_payment',
      confirmationEmailSent: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 1. The buyer's payment email — Michael's words, exactly as he wrote
    // them. Reply-to is his inbox because the email invites replying
    // ("Prefer a cheque? Reply to this email").
    let confirmationEmailSent = false;
    try {
      await emailService.sendEmail({
        to: email,
        subject: FOUNDING_CONFIRMATION_SUBJECT,
        text: FOUNDING_CONFIRMATION_TEXT,
        html: FOUNDING_CONFIRMATION_HTML,
        replyTo: E_TRANSFER_ADDRESS,
      });
      confirmationEmailSent = true;
      await docRef.update({ confirmationEmailSent: true });
    } catch (error) {
      logger.error('Founding sign-up saved but buyer confirmation email failed', 'Founding-API', {
        id: docRef.id,
        error,
      });
    }

    // 2. The heads-up to Michael. Same recipient logic as the contact form:
    // the advertised inbox first, Gmail as fallback while info@ delivery is
    // being confirmed.
    const notifyEmail = (process.env.CONTACT_NOTIFY_EMAIL || 'info@smartergoalie.com, goaliesmarter@gmail.com')
      .split(',')
      .map(address => address.trim())
      .filter(Boolean);

    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/founding`;
    const notification = buildFoundingNotification({
      signupId: docRef.id,
      name,
      email,
      goalieName,
      phone,
      note,
      adminUrl,
    });

    try {
      await emailService.sendEmail({
        to: notifyEmail,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
        replyTo: email,
      });
    } catch (error) {
      // The sign-up is saved and shows in /admin/founding either way.
      logger.error('Founding sign-up saved but admin notification email failed', 'Founding-API', {
        id: docRef.id,
        error,
      });
    }

    return NextResponse.json({ success: true, id: docRef.id, confirmationEmailSent });
  } catch (error) {
    logger.error('Founding sign-up submission failed', 'Founding-API', { error });
    return NextResponse.json(
      { success: false, error: 'Submission failed. Please try again.' },
      { status: 500 }
    );
  }
}
