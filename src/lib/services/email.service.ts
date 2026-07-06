/**
 * Email Service
 *
 * Handles sending emails for various purposes (invitations, notifications, verifications, etc.)
 * Development mode: Logs to console
 * Production mode: Sends via Resend with branded templates
 */

import { Resend } from 'resend';
import { CoachInvitation } from '@/types/auth';
import { Invitation } from '@/types/invitation';
import { logInfo, logError, logDebug } from '@/lib/errors/error-logger';

// Initialize Resend client (only in production when API key is available)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Email template data for coach invitations
 */
interface CoachInvitationEmailData {
  invitation: CoachInvitation;
  inviteUrl: string;
  appName?: string;
  supportEmail?: string;
}

/**
 * Generic email data
 */
interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Verification email data
 */
interface VerificationEmailData {
  to: string;
  displayName: string;
  verificationLink: string;
}

interface GoalieInvitationEmailData {
  invitation: Invitation;
  inviteUrl: string;
  appName?: string;
  supportEmail?: string;
}

interface AdminInvitationEmailData {
  invitation: Invitation;
  inviteUrl: string;
  appName?: string;
  supportEmail?: string;
}

interface ContactInquiry {
  name: string;
  role: string;
  organisation: string;
  location: string;
  teams: string;
  goalies: string;
  goals: string;
  email: string;
  phone: string;
  preferred_contact: string;
}

interface ContactInquiryNotificationData {
  inquiry: ContactInquiry;
  inquiryId: string;
  notifyEmail: string;
}

/**
 * Email Service Interface
 */
export interface IEmailService {
  sendCoachInvitation(data: CoachInvitationEmailData): Promise<void>;
  sendGoalieInvitation(data: GoalieInvitationEmailData): Promise<void>;
  sendAdminInvitation(data: AdminInvitationEmailData): Promise<void>;
  sendEmail(data: EmailData): Promise<void>;
  sendVerificationEmail(data: VerificationEmailData): Promise<void>;
  sendContactInquiryNotification(data: ContactInquiryNotificationData): Promise<void>;
}

/**
 * Email Service Implementation
 */
export class EmailService implements IEmailService {
  private static instance: EmailService;
  private readonly appName: string;
  private readonly supportEmail: string;
  private readonly fromEmail: string;
  private readonly brandColor: string;

  private constructor() {
    this.appName = 'Smarter Goalie';
    this.supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@smartergoalie.com';
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@smartergoalie.com';
    this.brandColor = '#2563eb'; // Blue-600
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send coach invitation email
   */
  public async sendCoachInvitation(data: CoachInvitationEmailData): Promise<void> {
    const { invitation, inviteUrl } = data;
    const appName = data.appName || this.appName;
    const supportEmail = data.supportEmail || this.supportEmail;

    const subject = `You're invited to join ${appName} as a Coach`;

    const html = this.generateCoachInvitationHtml({
      invitation,
      inviteUrl,
      appName,
      supportEmail,
    });

    const text = this.generateCoachInvitationText({
      invitation,
      inviteUrl,
      appName,
      supportEmail,
    });

    await this.sendEmail({
      to: invitation.email,
      subject,
      html,
      text,
    });
  }

  /**
   * Send goalie invitation email
   */
  public async sendGoalieInvitation(data: GoalieInvitationEmailData): Promise<void> {
    const { invitation, inviteUrl } = data;
    const appName = data.appName || this.appName;
    const supportEmail = data.supportEmail || this.supportEmail;
    const firstName = invitation.metadata?.firstName;
    const coachName = invitation.metadata?.assignedCoachName;
    const tier = invitation.metadata?.tier ?? 'automated';
    const customMessage = invitation.metadata?.customMessage;

    const tierLabel = tier === 'custom' ? 'Custom (Coach-Guided)' : 'Automated (Self-Paced)';

    const subject = `You've been invited to join ${appName} as a Goalie`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Goalie Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#050d1a 0%,#0d1b3a 100%);padding:36px 32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🥅</div>
        <h1 style="margin:0;color:#37b5ff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${appName}</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">Your Personal Invite</p>
      </div>

      <!-- Body -->
      <div style="padding:36px 32px;">
        <h2 style="margin:0 0 16px;color:#0d1b3a;font-size:22px;font-weight:700;">
          Welcome${firstName ? `, ${firstName}` : ''}!
        </h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
          <strong style="color:#0d1b3a;">${invitation.invitedByName}</strong> has personally invited you to join <strong style="color:#0d1b3a;">${appName}</strong> as a Goalie.
        </p>

        <!-- Details box -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:6px 0;color:#6b7280;width:120px;">Your email</td>
              <td style="padding:6px 0;color:#0d1b3a;font-weight:600;">${invitation.email}</td>
            </tr>
            ${coachName ? `
            <tr>
              <td style="padding:6px 0;color:#6b7280;">Your coach</td>
              <td style="padding:6px 0;color:#0d1b3a;font-weight:600;">${coachName}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:6px 0;color:#6b7280;">Program tier</td>
              <td style="padding:6px 0;color:#0d1b3a;font-weight:600;">${tierLabel}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280;">Link expires</td>
              <td style="padding:6px 0;color:#0d1b3a;font-weight:600;">${new Date(invitation.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
            </tr>
          </table>
        </div>

        ${customMessage ? `
        <!-- Personal message -->
        <div style="border-left:4px solid #37b5ff;padding:14px 18px;background:#eff9ff;border-radius:0 8px 8px 0;margin-bottom:28px;">
          <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${customMessage}"</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">— ${invitation.invitedByName}</p>
        </div>` : ''}

        <!-- CTA -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#37b5ff 0%,#0ea5e9 100%);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
            Accept Invitation →
          </a>
        </div>

        <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
          Or copy this link into your browser:<br>
          <a href="${inviteUrl}" style="color:#37b5ff;word-break:break-all;">${inviteUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">
          If you weren't expecting this invite, you can ignore this email.<br>
          Questions? <a href="mailto:${supportEmail}" style="color:#37b5ff;">${supportEmail}</a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;color:#d1d5db;">
          © ${new Date().getFullYear()} ${appName}. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`.trim();

    const text = `
You've been invited to join ${appName} as a Goalie!

${invitation.invitedByName} has personally invited you to create your goalie account.

Your email: ${invitation.email}
${coachName ? `Your coach: ${coachName}` : ''}
Program tier: ${tierLabel}
Link expires: ${new Date(invitation.expiresAt).toLocaleDateString()}
${customMessage ? `\nMessage from ${invitation.invitedByName}:\n"${customMessage}"\n` : ''}
Accept your invitation here:
${inviteUrl}

If you weren't expecting this invite, you can ignore this email.
Questions? Contact ${supportEmail}

© ${new Date().getFullYear()} ${appName}. All rights reserved.
    `.trim();

    await this.sendEmail({ to: invitation.email, subject, html, text });
  }

  /**
   * Send admin invitation email
   */
  public async sendAdminInvitation(data: AdminInvitationEmailData): Promise<void> {
    const { invitation, inviteUrl } = data;
    const appName = data.appName || this.appName;
    const supportEmail = data.supportEmail || this.supportEmail;
    const firstName = invitation.metadata?.firstName;
    const customMessage = invitation.metadata?.customMessage;

    const subject = `You've been invited to join ${appName} as an Administrator`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administrator Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#050d1a 0%,#0d1b3a 100%);padding:36px 32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🛡️</div>
        <h1 style="margin:0;color:#37b5ff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${appName}</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">Administrator Invitation</p>
      </div>

      <!-- Body -->
      <div style="padding:36px 32px;">
        <h2 style="margin:0 0 16px;color:#0d1b3a;font-size:22px;font-weight:700;">
          Welcome${firstName ? `, ${firstName}` : ''}!
        </h2>
        <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.7;">
          <strong style="color:#0d1b3a;">${invitation.invitedByName}</strong> has invited you to join <strong style="color:#0d1b3a;">${appName}</strong> as an <strong style="color:#0d1b3a;">Administrator</strong>.
        </p>

        <!-- Warning box -->
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
            Administrator accounts have full access to platform content, users, and settings. Only accept this invite if you recognize the inviter and expect this access.
          </p>
        </div>

        <!-- Details box -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="padding:6px 0;color:#6b7280;width:120px;">Your email</td>
              <td style="padding:6px 0;color:#0d1b3a;font-weight:600;">${invitation.email}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#6b7280;">Link expires</td>
              <td style="padding:6px 0;color:#0d1b3a;font-weight:600;">${new Date(invitation.expiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
            </tr>
          </table>
        </div>

        ${customMessage ? `
        <!-- Personal message -->
        <div style="border-left:4px solid #37b5ff;padding:14px 18px;background:#eff9ff;border-radius:0 8px 8px 0;margin-bottom:28px;">
          <p style="margin:0;font-size:14px;color:#374151;font-style:italic;">"${customMessage}"</p>
          <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">— ${invitation.invitedByName}</p>
        </div>` : ''}

        <!-- CTA -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${inviteUrl}" style="display:inline-block;background:linear-gradient(135deg,#37b5ff 0%,#0ea5e9 100%);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:800;font-size:14px;letter-spacing:1px;text-transform:uppercase;">
            Accept Invitation →
          </a>
        </div>

        <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
          Or copy this link into your browser:<br>
          <a href="${inviteUrl}" style="color:#37b5ff;word-break:break-all;">${inviteUrl}</a>
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#9ca3af;">
          If you weren't expecting this invite, you can safely ignore this email.<br>
          Questions? <a href="mailto:${supportEmail}" style="color:#37b5ff;">${supportEmail}</a>
        </p>
        <p style="margin:12px 0 0;font-size:12px;color:#d1d5db;">
          © ${new Date().getFullYear()} ${appName}. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`.trim();

    const text = `
You've been invited to join ${appName} as an Administrator!

${invitation.invitedByName} has invited you to create your administrator account.

Administrator accounts have full access to platform content, users, and settings.
Only accept this invite if you recognize the inviter and expect this access.

Your email: ${invitation.email}
Link expires: ${new Date(invitation.expiresAt).toLocaleDateString()}
${customMessage ? `\nMessage from ${invitation.invitedByName}:\n"${customMessage}"\n` : ''}
Accept your invitation here:
${inviteUrl}

If you weren't expecting this invite, you can safely ignore this email.
Questions? Contact ${supportEmail}

© ${new Date().getFullYear()} ${appName}. All rights reserved.
    `.trim();

    await this.sendEmail({ to: invitation.email, subject, html, text });
  }

  /**
   * Send generic email
   */
  public async sendEmail(data: EmailData): Promise<void> {
    try {
      logDebug('Sending email', { to: data.to, subject: data.subject });

      if (!resend) {
        // No API key — log to console so dev can see the email content
        console.log('\n' + '='.repeat(80));
        console.log('📧 EMAIL (Development Mode)');
        console.log('='.repeat(80));
        console.log(`To: ${data.to}`);
        console.log(`Subject: ${data.subject}`);
        console.log('-'.repeat(80));
        console.log('Text Content:');
        console.log(data.text || '(No text content)');
        console.log('-'.repeat(80));
        console.log('HTML Content:');
        console.log(data.html);
        console.log('='.repeat(80) + '\n');

        logInfo('Email logged to console (development mode)', {
          to: data.to,
          subject: data.subject,
        });
      } else {
        // Production mode: Send via Resend
        const result = await resend.emails.send({
          from: `${this.appName} <${this.fromEmail}>`,
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        logInfo('Email sent successfully via Resend', {
          to: data.to,
          subject: data.subject,
          messageId: result.data?.id,
        });
      }
    } catch (error) {
      logError('Failed to send email', error instanceof Error ? error : undefined, { error: String(error) });
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send contact inquiry notification email to the Smarter Goalie team
   */
  public async sendContactInquiryNotification(data: ContactInquiryNotificationData): Promise<void> {
    const { inquiry, inquiryId, notifyEmail } = data;

    const rows = [
      ['Name',               inquiry.name],
      ['Role',               inquiry.role],
      ['Organisation',       inquiry.organisation],
      ['Location',           inquiry.location],
      ['Teams in program',   inquiry.teams   || '—'],
      ['Goalies in program', inquiry.goalies || '—'],
      ['Preferred contact',  inquiry.preferred_contact || '—'],
      ['Phone',              inquiry.phone   || '—'],
      ['Email',              inquiry.email],
    ];

    const rowsHtml = rows.map(([label, value]) => `
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:13px;font-weight:600;white-space:nowrap;vertical-align:top;width:160px;">${label}</td>
        <td style="padding:10px 14px;color:#0f172a;font-size:14px;vertical-align:top;">${value}</td>
      </tr>`).join('');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Inquiry</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#050d1a 0%,#0d1b3a 100%);padding:32px;text-align:center;">
        <div style="display:inline-block;background:rgba(192,0,0,0.15);border:1px solid rgba(192,0,0,0.4);border-radius:99px;padding:6px 18px;margin-bottom:14px;">
          <span style="font-size:11px;font-weight:700;letter-spacing:2px;color:#ff6b6b;text-transform:uppercase;">New Inquiry</span>
        </div>
        <h1 style="margin:0;color:#37b5ff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Smarter Goalie</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">Contact Form Submission</p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Submission ID: <code style="font-size:12px;color:#94a3b8;">${inquiryId}</code></p>
        <p style="margin:0 0 24px;font-size:13px;color:#64748b;">Received on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

        <!-- Details table -->
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px;">
          ${rowsHtml}
        </table>

        <!-- Goals / message -->
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #37b5ff;border-radius:0 10px 10px 0;padding:18px 20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#37b5ff;text-transform:uppercase;">Program Goals</p>
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.75;">${inquiry.goals ? inquiry.goals.replace(/\n/g, '<br>') : '<em style="color:#94a3b8;">Not provided</em>'}</p>
        </div>

        <!-- Reply CTA -->
        <div style="text-align:center;">
          <a href="mailto:${inquiry.email}?subject=Re: Your Smarter Goalie Inquiry"
             style="display:inline-block;background:linear-gradient(135deg,#C00000,#a00000);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
            Reply to ${inquiry.name} →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          This notification was sent to you because someone submitted the contact form on the Smarter Goalie website.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`.trim();

    const text = `
NEW CONTACT INQUIRY — Smarter Goalie
ID: ${inquiryId}

Name:               ${inquiry.name}
Role:               ${inquiry.role}
Organisation:       ${inquiry.organisation}
Location:           ${inquiry.location}
Teams in program:   ${inquiry.teams || '—'}
Goalies in program: ${inquiry.goalies || '—'}
Preferred contact:  ${inquiry.preferred_contact || '—'}
Phone:              ${inquiry.phone || '—'}
Email:              ${inquiry.email}

Program Goals:
${inquiry.goals || '(not provided)'}

Reply: ${inquiry.email}
    `.trim();

    await this.sendEmail({
      to: notifyEmail,
      subject: `New Inquiry: ${inquiry.name} — ${inquiry.organisation}`,
      html,
      text,
    });
  }

  /**
   * Generate HTML content for coach invitation email
   */
  private generateCoachInvitationHtml(data: {
    invitation: CoachInvitation;
    inviteUrl: string;
    appName: string;
    supportEmail: string;
  }): string {
    const { invitation, inviteUrl, appName, supportEmail } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coach Invitation</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .info-box { background-color: white; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏒 Coach Invitation</h1>
    </div>
    <div class="content">
      <h2>Hello${invitation.metadata?.firstName ? ` ${invitation.metadata.firstName}` : ''}!</h2>

      <p>
        <strong>${invitation.invitedByName}</strong> has invited you to join <strong>${appName}</strong> as a coach.
      </p>

      ${invitation.metadata?.organizationName ? `
      <div class="info-box">
        <strong>Organization:</strong> ${invitation.metadata.organizationName}
      </div>
      ` : ''}

      ${invitation.metadata?.customMessage ? `
      <div class="info-box">
        <strong>Message from ${invitation.invitedByName}:</strong><br>
        <em>"${invitation.metadata.customMessage}"</em>
      </div>
      ` : ''}

      <p>Click the button below to accept this invitation and create your coach account:</p>

      <div style="text-align: center;">
        <a href="${inviteUrl}" class="button">Accept Invitation</a>
      </div>

      <p style="font-size: 14px; color: #6b7280;">
        Or copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #2563eb;">${inviteUrl}</a>
      </p>

      <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
        This invitation will expire on <strong>${invitation.expiresAt.toLocaleDateString()}</strong>.
      </p>
    </div>
    <div class="footer">
      <p>
        If you did not expect this invitation, you can safely ignore this email.<br>
        Questions? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>
      </p>
      <p style="margin-top: 15px;">
        © ${new Date().getFullYear()} ${appName}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text content for coach invitation email
   */
  private generateCoachInvitationText(data: {
    invitation: CoachInvitation;
    inviteUrl: string;
    appName: string;
    supportEmail: string;
  }): string {
    const { invitation, inviteUrl, appName, supportEmail } = data;

    let text = `
COACH INVITATION
${appName}

Hello${invitation.metadata?.firstName ? ` ${invitation.metadata.firstName}` : ''}!

${invitation.invitedByName} has invited you to join ${appName} as a coach.
`;

    if (invitation.metadata?.organizationName) {
      text += `\nOrganization: ${invitation.metadata.organizationName}\n`;
    }

    if (invitation.metadata?.customMessage) {
      text += `\nMessage from ${invitation.invitedByName}:\n"${invitation.metadata.customMessage}"\n`;
    }

    text += `
To accept this invitation and create your coach account, visit:
${inviteUrl}

This invitation will expire on ${invitation.expiresAt.toLocaleDateString()}.

If you did not expect this invitation, you can safely ignore this email.
Questions? Contact us at ${supportEmail}

© ${new Date().getFullYear()} ${appName}. All rights reserved.
    `.trim();

    return text;
  }

  /**
   * Send email verification email with Smarter Goalie branding
   */
  public async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
    const { to, displayName, verificationLink } = data;

    const subject = `Verify your email for ${this.appName}`;

    const html = this.generateVerificationEmailHtml({
      displayName,
      verificationLink,
    });

    const text = this.generateVerificationEmailText({
      displayName,
      verificationLink,
    });

    await this.sendEmail({
      to,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML content for verification email
   */
  private generateVerificationEmailHtml(data: {
    displayName: string;
    verificationLink: string;
  }): string {
    const { displayName, verificationLink } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f5; }
    .wrapper { padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
    .header { background: linear-gradient(135deg, ${this.brandColor} 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
    .header .logo { font-size: 48px; margin-bottom: 15px; }
    .content { padding: 40px 30px; }
    .content h2 { color: #1f2937; margin-top: 0; }
    .button-container { text-align: center; margin: 30px 0; }
    .button { display: inline-block; background-color: ${this.brandColor}; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
    .button:hover { background-color: #1d4ed8; }
    .link-text { font-size: 14px; color: #6b7280; margin-top: 20px; word-break: break-all; }
    .link-text a { color: ${this.brandColor}; }
    .footer { background-color: #f9fafb; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 5px 0; }
    .highlight { background-color: #eff6ff; border-left: 4px solid ${this.brandColor}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">🥅</div>
        <h1>${this.appName}</h1>
      </div>
      <div class="content">
        <h2>Welcome${displayName ? `, ${displayName}` : ''}!</h2>

        <p>Thanks for signing up for <strong>${this.appName}</strong>. To get started with your goalie training journey, please verify your email address.</p>

        <div class="highlight">
          <strong>Why verify?</strong> Email verification helps us keep your account secure and ensures you receive important updates about your training progress.
        </div>

        <div class="button-container">
          <a href="${verificationLink}" class="button">Verify Email Address</a>
        </div>

        <div class="link-text">
          <p>Or copy and paste this link into your browser:</p>
          <a href="${verificationLink}">${verificationLink}</a>
        </div>

        <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
          This link will expire in 24 hours. If you didn't create an account with ${this.appName}, you can safely ignore this email.
        </p>
      </div>
      <div class="footer">
        <p>Questions? Contact us at <a href="mailto:${this.supportEmail}" style="color: ${this.brandColor};">${this.supportEmail}</a></p>
        <p style="margin-top: 15px;">© ${new Date().getFullYear()} ${this.appName}. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text content for verification email
   */
  private generateVerificationEmailText(data: {
    displayName: string;
    verificationLink: string;
  }): string {
    const { displayName, verificationLink } = data;

    return `
VERIFY YOUR EMAIL
${this.appName}

Welcome${displayName ? `, ${displayName}` : ''}!

Thanks for signing up for ${this.appName}. To get started with your goalie training journey, please verify your email address by visiting the link below:

${verificationLink}

Why verify? Email verification helps us keep your account secure and ensures you receive important updates about your training progress.

This link will expire in 24 hours. If you didn't create an account with ${this.appName}, you can safely ignore this email.

Questions? Contact us at ${this.supportEmail}

© ${new Date().getFullYear()} ${this.appName}. All rights reserved.
    `.trim();
  }
}

// Export singleton instance
export const emailService = EmailService.getInstance();

// Re-export interface types needed by callers
export type { ContactInquiryNotificationData };
