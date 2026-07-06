import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/services/email.service';
import { Invitation } from '@/types/invitation';

/**
 * POST /api/invitations/send-email
 *
 * Sends an invite email via Resend, branching template by invitation.role.
 * Called server-side from admin invite forms (goalie, admin) after the Firestore record is created.
 *
 * Body: { invitation: Invitation }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitation } = body as { invitation: Invitation };

    if (!invitation?.email || !invitation?.token) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation data' },
        { status: 400 }
      );
    }

    // INVITE_BASE_URL is the live deployment URL — ensures invite links work for
    // recipients even when the admin sends from a local dev environment
    const appUrl = (
      process.env.INVITE_BASE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    ).replace(/\/$/, '');

    const inviteUrl = `${appUrl}/auth/accept-invite?token=${invitation.token}`;

    // Dates are serialised as strings over JSON — rehydrate them
    const hydratedInvitation: Invitation = {
      ...invitation,
      createdAt: new Date(invitation.createdAt),
      expiresAt: new Date(invitation.expiresAt),
    };

    if (hydratedInvitation.role === 'admin') {
      await emailService.sendAdminInvitation({ invitation: hydratedInvitation, inviteUrl });
    } else {
      await emailService.sendGoalieInvitation({ invitation: hydratedInvitation, inviteUrl });
    }

    return NextResponse.json({ success: true, inviteUrl });
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send invitation email' },
      { status: 500 }
    );
  }
}
