import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email.service';
import { CoachInvitation } from '@/types/auth';

/**
 * POST /api/invitations/send-coach-email
 *
 * Sends the legacy coach invitation email via Resend.
 * Called server-side from the /admin/coaches invite form after the Firestore
 * coach_invitations record is created, since RESEND_API_KEY is only available
 * in the server runtime — calling emailService directly from a client component
 * would silently no-op (falls back to console-logging the email).
 *
 * Body: { invitation: CoachInvitation }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitation } = body as { invitation: CoachInvitation };

    if (!invitation?.email || !invitation?.token) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation data' },
        { status: 400 }
      );
    }

    const appUrl = (
      process.env.INVITE_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    ).replace(/\/$/, '');

    const inviteUrl = `${appUrl}/auth/accept-invite?token=${invitation.token}`;

    // Dates are serialised as strings over JSON — rehydrate them
    const hydratedInvitation: CoachInvitation = {
      ...invitation,
      createdAt: new Date(invitation.createdAt),
      expiresAt: new Date(invitation.expiresAt),
    };

    await emailService.sendCoachInvitation({ invitation: hydratedInvitation, inviteUrl });

    return NextResponse.json({ success: true, inviteUrl });
  } catch (error) {
    console.error('Failed to send coach invitation email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}
