import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest } from '@/lib/auth/admin-request';
import { emailService } from '@/lib/services/email.service';
import { logger } from '@/lib/utils/logger';
import type { ApplicationStatus } from '@/types/application';
import {
  buildApplicationApproved,
  buildApplicationWaitlisted,
  buildApplicationDeclined,
} from '@/lib/emails/application-emails';

/**
 * Admin: act on one application.
 *
 *   POST /api/admin/applications/[id] — approve, waitlist or decline.
 *
 * APPROVAL DOES NOT SEND AN INVITATION, AND THAT IS DELIBERATE.
 * Michael's spec says "if approved, the invitation goes out". The existing
 * invitation flow (/auth/accept-invite) *creates a new account* from an email
 * address — which for an applicant would produce a second, empty account and
 * strand the questionnaire they have already done on the first one. That is
 * the one thing he was clearest about not wanting: "they never fill it in
 * twice, their record starts the day they applied".
 *
 * So approval does to the existing account what accepting an invitation would
 * have done to a new one: it takes the wall down, writes the coach and the
 * track Michael chose, and emails them. The email carries the booking link,
 * which is the only thing the invitation was really for. Flag this to Michael
 * — it is his wording being interpreted, not followed literally.
 *
 * The status write and the email are deliberately separate: the decision is
 * recorded first and stands whether or not the email leaves. A failed send is
 * reported back to the screen so it can be retried by hand, not swallowed.
 */

const decisionSchema = z.object({
  decision: z.enum(['approve', 'waitlist', 'decline']),
  assignedCoachId: z.string().trim().max(200).optional(),
  assignedCoachName: z.string().trim().max(200).optional(),
  tier: z.enum(['automated', 'custom']).optional(),
  note: z.string().trim().max(2000).optional(),
});

const STATUS_FOR: Record<'approve' | 'waitlist' | 'decline', ApplicationStatus> = {
  approve: 'approved',
  waitlist: 'waitlisted',
  decline: 'declined',
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });

  const { id } = await params;

  try {
    const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid decision' },
        { status: 400 }
      );
    }
    const { decision, assignedCoachId, assignedCoachName, tier, note } = parsed.data;

    // A custom-track goalie without a coach has nobody to work with. Caught
    // here as well as in the dialog, because this route is callable directly.
    if (decision === 'approve' && tier === 'custom' && !assignedCoachId) {
      return NextResponse.json(
        { success: false, error: 'A custom-track goalie needs a coach assigned.' },
        { status: 400 }
      );
    }

    const userRef = adminDb.collection('users').doc(id);
    const userDoc = await userRef.get();
    const user = userDoc.data();

    if (!userDoc.exists || !user) {
      return NextResponse.json({ success: false, error: 'Applicant not found' }, { status: 404 });
    }
    // Never let this route touch an ordinary member. Without the guard, a
    // mistyped id would wall an existing goalie out of their own account.
    if (!user.applicationStatus) {
      return NextResponse.json(
        { success: false, error: 'That account is a member, not an applicant.' },
        { status: 400 }
      );
    }

    const adminDoc = await adminDb.collection('users').doc(auth.uid).get();
    const decidedByName: string = adminDoc.data()?.displayName ?? 'Admin';

    await userRef.update({
      applicationStatus: STATUS_FOR[decision],
      applicationDecidedAt: FieldValue.serverTimestamp(),
      applicationDecidedBy: auth.uid,
      applicationDecidedByName: decidedByName,
      ...(note ? { applicationNote: note } : {}),
      // Approval only: the coach and track. These are the same two fields the
      // invitation would have set, written onto the account that already exists.
      ...(decision === 'approve' && tier ? { workflowType: tier } : {}),
      ...(decision === 'approve' && assignedCoachId ? { assignedCoachId } : {}),
      ...(decision === 'approve' && assignedCoachName ? { assignedCoachName } : {}),
    });

    const displayName: string = user.displayName || user.email || 'there';
    const firstName: string | undefined = displayName.split(' ')[0] || undefined;

    const email =
      decision === 'approve' ? buildApplicationApproved(firstName)
      : decision === 'waitlist' ? buildApplicationWaitlisted(firstName)
      : buildApplicationDeclined(firstName);

    let emailSent = false;
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
        // Every one of these three invites a reply, so replies go to Michael.
        replyTo: process.env.CONTACT_NOTIFY_EMAIL?.split(',')[0]?.trim() || 'info@smartergoalie.com',
      });
      emailSent = true;
      await userRef.update({ applicationDecisionEmailSent: true });
    } catch (error) {
      logger.error('Application decision saved but email failed', 'Applications-Admin-API', {
        id,
        decision,
        error,
      });
    }

    return NextResponse.json({
      success: true,
      status: STATUS_FOR[decision],
      emailSent,
      decidedByName,
    });
  } catch (error) {
    logger.error('Failed to record application decision', 'Applications-Admin-API', {
      id,
      error,
    });
    return NextResponse.json({ success: false, error: 'Failed to record the decision' }, { status: 500 });
  }
}
