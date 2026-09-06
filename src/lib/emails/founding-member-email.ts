/**
 * Founding-member sign-up emails.
 *
 * The buyer confirmation is Michael's wording VERBATIM (his Message 3,
 * 2 September 2026): "the confirmation email a buyer receives, in my words,
 * to go out exactly as written." Do not edit the copy without his sign-off —
 * the HTML version may restyle the presentation, never the words.
 */

export const E_TRANSFER_ADDRESS = 'info@smartergoalie.com';

export const FOUNDING_CONFIRMATION_SUBJECT = "You're in — here's how to complete it";

export const FOUNDING_CONFIRMATION_TEXT = `Welcome. You are a Smarter Goalie founding member, and there will only ever be one first group.

WHAT YOU ARE GETTING

$300, one time. A registration fee, not a monthly plan — and it is yours for life.

Your first month is free.

After that, $15 a month. That is your founding rate and it holds for two years.

After the two years it goes to $20 a month, and that is the rate for life. That is the only increase there will ever be, and you are being told about it on the day you join rather than finding it on a statement three years from now.

And you can switch it off. Take the summer off, pay nothing, switch back on for pre-season. Your record is exactly where you left it. If you are on the full year, it simply runs straight through.

HOW TO PAY

Interac e-transfer to: ${E_TRANSFER_ADDRESS}

Please put the goalie's name in the message so I can match it.

Prefer a cheque? Reply to this email and I will send you the details.

There is no card processing here and no card details are stored anywhere.

WHAT HAPPENS NEXT

As soon as it clears I mark you paid and your account opens fully. You will hear from me — not a system message, me.

AND THE THIRTY DAYS

You have a thirty-day guarantee. If it is not what I said it was, you get your money back, no argument.

But here is the interesting part. If you decide inside the first two weeks that you do not need the guarantee, you can waive it — and I will give you an hour of video analysis, or up to three hours at half price. That is $70 an hour normally, and a lot of clips fit in an hour.

Founding members who waive their own guarantee go up on the site. Not a testimonial anybody wrote for me — a count of people who decided they were staying.

You are not ever starting over.

Michael LoCicero
Smarter Goalie`;

const p = (text: string) =>
  `<p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.75;">${text}</p>`;

const heading = (text: string) =>
  `<p style="margin:28px 0 14px;color:#0d1b3a;font-size:13px;font-weight:800;letter-spacing:2px;">${text}</p>`;

/**
 * The same words as the text version, styled to match the platform's other
 * emails. Every sentence below is Michael's, unchanged.
 */
export const FOUNDING_CONFIRMATION_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${FOUNDING_CONFIRMATION_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#050d1a 0%,#0d1b3a 100%);padding:36px 32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🥅</div>
        <h1 style="margin:0;color:#37b5ff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Smarter Goalie</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">Founding Member</p>
      </div>

      <!-- Body: Michael's words, exactly as written -->
      <div style="padding:36px 32px;">
        ${p('Welcome. You are a Smarter Goalie founding member, and there will only ever be one first group.')}

        ${heading('WHAT YOU ARE GETTING')}
        ${p('$300, one time. A registration fee, not a monthly plan — and it is yours for life.')}
        ${p('Your first month is free.')}
        ${p('After that, $15 a month. That is your founding rate and it holds for two years.')}
        ${p('After the two years it goes to $20 a month, and that is the rate for life. That is the only increase there will ever be, and you are being told about it on the day you join rather than finding it on a statement three years from now.')}
        ${p('And you can switch it off. Take the summer off, pay nothing, switch back on for pre-season. Your record is exactly where you left it. If you are on the full year, it simply runs straight through.')}

        ${heading('HOW TO PAY')}
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #37b5ff;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 18px;">
          <p style="margin:0;color:#0d1b3a;font-size:15px;line-height:1.75;">Interac e-transfer to: <strong>${E_TRANSFER_ADDRESS}</strong></p>
        </div>
        ${p("Please put the goalie's name in the message so I can match it.")}
        ${p('Prefer a cheque? Reply to this email and I will send you the details.')}
        ${p('There is no card processing here and no card details are stored anywhere.')}

        ${heading('WHAT HAPPENS NEXT')}
        ${p('As soon as it clears I mark you paid and your account opens fully. You will hear from me — not a system message, me.')}

        ${heading('AND THE THIRTY DAYS')}
        ${p('You have a thirty-day guarantee. If it is not what I said it was, you get your money back, no argument.')}
        ${p('But here is the interesting part. If you decide inside the first two weeks that you do not need the guarantee, you can waive it — and I will give you an hour of video analysis, or up to three hours at half price. That is $70 an hour normally, and a lot of clips fit in an hour.')}
        ${p('Founding members who waive their own guarantee go up on the site. Not a testimonial anybody wrote for me — a count of people who decided they were staying.')}

        ${p('<strong>You are not ever starting over.</strong>')}

        <p style="margin:28px 0 0;color:#0d1b3a;font-size:15px;line-height:1.6;">
          Michael LoCicero<br>
          <span style="color:#64748b;">Smarter Goalie</span>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`.trim();

interface FoundingNotificationData {
  signupId: string;
  name: string;
  email: string;
  goalieName: string;
  phone?: string;
  note?: string;
  adminUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The heads-up to Michael when a founding sign-up lands. */
export function buildFoundingNotification(data: FoundingNotificationData): {
  subject: string;
  text: string;
  html: string;
} {
  const { signupId, name, email, goalieName, phone, note, adminUrl } = data;

  const subject = `New founding member sign-up: ${goalieName}`;

  const text = `NEW FOUNDING MEMBER SIGN-UP — Smarter Goalie
ID: ${signupId}

Name:         ${name}
Email:        ${email}
Goalie's name: ${goalieName}
Phone:        ${phone || '—'}

Note:
${note || '(none)'}

They have been sent your payment email. Watch for an Interac e-transfer to ${E_TRANSFER_ADDRESS} with "${goalieName}" in the message, then mark them paid here:
${adminUrl}`;

  const rows = [
    ['Name', escapeHtml(name)],
    ['Email', escapeHtml(email)],
    ["Goalie's name", escapeHtml(goalieName)],
    ['Phone', phone ? escapeHtml(phone) : '—'],
  ]
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:10px 14px;color:#64748b;font-size:13px;font-weight:600;white-space:nowrap;vertical-align:top;width:140px;">${label}</td>
        <td style="padding:10px 14px;color:#0f172a;font-size:14px;vertical-align:top;">${value}</td>
      </tr>`
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Founding Member Sign-Up</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#050d1a 0%,#0d1b3a 100%);padding:32px;text-align:center;">
        <div style="display:inline-block;background:rgba(55,181,255,0.12);border:1px solid rgba(55,181,255,0.4);border-radius:99px;padding:6px 18px;margin-bottom:14px;">
          <span style="font-size:11px;font-weight:700;letter-spacing:2px;color:#37b5ff;text-transform:uppercase;">Founding Sign-Up</span>
        </div>
        <h1 style="margin:0;color:#37b5ff;font-size:22px;font-weight:800;letter-spacing:-0.3px;">Smarter Goalie</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.5);font-size:13px;">New founding member sign-up</p>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <p style="margin:0 0 24px;font-size:13px;color:#64748b;">Sign-up ID: <code style="font-size:12px;color:#94a3b8;">${signupId}</code></p>

        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px;">
          ${rows}
        </table>

        ${note ? `
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #37b5ff;border-radius:0 10px 10px 0;padding:18px 20px;margin-bottom:24px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#37b5ff;text-transform:uppercase;">Their note</p>
          <p style="margin:0;font-size:14px;color:#334155;line-height:1.75;">${escapeHtml(note).replace(/\n/g, '<br>')}</p>
        </div>` : ''}

        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
          <p style="margin:0;font-size:14px;color:#713f12;line-height:1.7;">
            They have been sent your payment email. Watch for an Interac e-transfer to <strong>${E_TRANSFER_ADDRESS}</strong> with <strong>"${escapeHtml(goalieName)}"</strong> in the message, then mark them paid.
          </p>
        </div>

        <div style="text-align:center;">
          <a href="${adminUrl}"
             style="display:inline-block;background:linear-gradient(135deg,#37b5ff 0%,#0ea5e9 100%);color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;">
            Open Founding Members →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">
          This notification was sent because someone submitted the founding-member form on the Smarter Goalie website.
        </p>
      </div>

    </div>
  </div>
</body>
</html>`.trim();

  return { subject, text, html };
}
