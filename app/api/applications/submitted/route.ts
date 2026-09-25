import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyUserRequest } from '@/lib/auth/admin-request';
import { emailService } from '@/lib/services/email.service';
import { logger } from '@/lib/utils/logger';
import {
  buildApplicationReceived,
  buildApplicationNotification,
} from '@/lib/emails/application-emails';

/**
 * POST /api/applications/submitted — "my questionnaire has landed".
 *
 * Called by the applicant's own browser once the questionnaire has saved. It
 * sends two emails and nothing else: the acknowledgement to the applicant, and
 * the heads-up to Michael.
 *
 * IT DOES NOT SET THE STATUS. The `applying` → `submitted` flip happens inside
 * the questionnaire's own atomic write, alongside the profile, because that is
 * the only place the two can be guaranteed to land together. This route runs
 * afterwards and is allowed to fail: a lost email is a follow-up Michael makes
 * by hand from /admin/applications, whereas a lost status flip would strand the
 * applicant outside every list.
 *
 * The account is read from the verified token, never from the body, so this
 * cannot be used to fire emails at somebody else's address.
 */

export async function POST(request: NextRequest) {
  const auth = await verifyUserRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
  }

  try {
    const userDoc = await adminDb.collection('users').doc(auth.uid).get();
    const user = userDoc.data();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Only applicants get these emails. An ordinary member finishing their
    // baseline is not applying for anything, and must not be told they are.
    if (user.applicationStatus !== 'submitted') {
      return NextResponse.json({ success: true, sent: false, reason: 'not an applicant' });
    }

    // Once only. The questionnaire retries its save up to three times, and a
    // reload after a completed submission would otherwise send this again.
    if (user.applicationReceivedEmailSent === true) {
      return NextResponse.json({ success: true, sent: false, reason: 'already sent' });
    }

    const displayName: string = user.displayName || user.email || 'Applicant';
    const firstName: string | undefined = displayName.split(' ')[0] || undefined;

    // 1. The applicant's acknowledgement.
    let sent = false;
    try {
      const email = buildApplicationReceived(firstName);
      await emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });
      sent = true;
      await userDoc.ref.update({ applicationReceivedEmailSent: true });
    } catch (error) {
      logger.error('Application acknowledgement email failed', 'Applications-API', {
        uid: auth.uid,
        error,
      });
    }

    // 2. Michael's heads-up. Same recipients as the founding sign-up.
    const notifyEmail = (process.env.CONTACT_NOTIFY_EMAIL || 'info@smartergoalie.com, goaliesmarter@gmail.com')
      .split(',')
      .map(address => address.trim())
      .filter(Boolean);

    const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/admin/applications`;
    const notification = buildApplicationNotification({
      displayName,
      email: user.email ?? '',
      overallScore: typeof user.overallScore === 'number' ? user.overallScore : undefined,
      pacingLevel: typeof user.pacingLevel === 'string' ? user.pacingLevel : undefined,
      adminUrl,
    });

    try {
      await emailService.sendEmail({
        to: notifyEmail,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
        replyTo: user.email,
      });
    } catch (error) {
      // The application is in /admin/applications either way.
      logger.error('Application admin notification failed', 'Applications-API', {
        uid: auth.uid,
        error,
      });
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    logger.error('Application submitted handler failed', 'Applications-API', { error });
    return NextResponse.json({ success: false, error: 'Failed to send' }, { status: 500 });
  }
}
