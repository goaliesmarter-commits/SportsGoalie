/**
 * Application-by-questionnaire emails (item 2).
 *
 * ⚠️ THE COPY BELOW IS A DRAFT AND IS NOT MICHAEL'S VERBATIM WORDING.
 *
 * The founding-member confirmation in this folder is his, word for word, and
 * is marked as such. These four are not — he asked for "the automatic email in
 * your words" and has not sent the words yet. They are written to his register
 * and to what he has already said in writing about how this works (he reads
 * every submission himself; the booking is carried by the approval and nobody
 * else ever sees it; a waitlist is a not-yet rather than a no). They are here
 * so the flow is complete and testable end to end, not because the wording is
 * settled.
 *
 * Replace each block with his text when it arrives, and delete this warning
 * when you do. Same rule as the founding email after that: restyle the
 * presentation, never the words.
 */

/**
 * Where an approved applicant books their call with Michael.
 *
 * A plain URL in a template, deliberately — a Cal.com (or equivalent) free
 * page that Michael owns. There is no calendar build behind this; the booking
 * and scheduling calendar is a separate, much larger piece of work that has
 * not been commissioned. Set BOOKING_URL in the environment when his page
 * exists; until then the approval email omits the booking block entirely
 * rather than shipping a dead link.
 */
export const BOOKING_URL = process.env.BOOKING_URL || process.env.NEXT_PUBLIC_BOOKING_URL || '';

const p = (text: string) =>
  `<p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.75;">${text}</p>`;

const heading = (text: string) =>
  `<p style="margin:28px 0 14px;color:#0d1b3a;font-size:13px;font-weight:800;letter-spacing:2px;">${text}</p>`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** The shared shell, matching the founding-member email. */
function shell(subtitle: string, title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,sans-serif;">
  <div style="padding:40px 20px;">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

      <div style="background:linear-gradient(135deg,#050d1a 0%,#0d1b3a 100%);padding:36px 32px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🥅</div>
        <h1 style="margin:0;color:#37b5ff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Smarter Goalie</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.6);font-size:14px;">${escapeHtml(subtitle)}</p>
      </div>

      <div style="padding:36px 32px;">
${body}
        <p style="margin:28px 0 0;color:#0d1b3a;font-size:15px;line-height:1.6;">
          Michael LoCicero<br>
          <span style="color:#64748b;">Smarter Goalie</span>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`.trim();
}

const signOff = `

Michael LoCicero
Smarter Goalie`;

export interface ApplicationEmail {
  subject: string;
  text: string;
  html: string;
}

/** Greeting that degrades gracefully when we only have an email address. */
function greet(firstName?: string): string {
  return firstName ? `${firstName},` : 'Hello,';
}

// ─── 1. Application received ──────────────────────────────────────────────────

/** Sent automatically the moment the questionnaire is submitted. */
export function buildApplicationReceived(firstName?: string): ApplicationEmail {
  const subject = 'Your application is in';

  const text = `${greet(firstName)}

Your questionnaire is in and I have it.

That was not a form. It was the same baseline every goalie in the system does, and it has already been analysed — so before we have spoken, I have a read on where you are and what you would need from me.

I go through these myself. Not a filter, not an assistant — me. That means it takes as long as it takes, and I would rather be slow and right than quick and wrong about whether this is a fit.

If it is a fit, the next thing you get from me is an invitation to book a call. That link only ever goes to people I have already said yes to.

Nothing more to do at your end. Sit tight.${signOff}`;

  const html = shell(
    'Application received',
    subject,
    [
      p(escapeHtml(greet(firstName))),
      p('Your questionnaire is in and I have it.'),
      p('That was not a form. It was the same baseline every goalie in the system does, and it has already been analysed — so before we have spoken, I have a read on where you are and what you would need from me.'),
      p('I go through these myself. Not a filter, not an assistant — me. That means it takes as long as it takes, and I would rather be slow and right than quick and wrong about whether this is a fit.'),
      heading('WHAT HAPPENS NEXT'),
      p('If it is a fit, the next thing you get from me is an invitation to book a call. That link only ever goes to people I have already said yes to.'),
      p('<strong>Nothing more to do at your end. Sit tight.</strong>'),
    ].join('\n')
  );

  return { subject, text, html };
}

// ─── 2. Approved ──────────────────────────────────────────────────────────────

/**
 * Sent when Michael approves. This is the email that carries the booking link —
 * the only place it ever appears, which is what makes booking approved-only.
 */
export function buildApplicationApproved(firstName?: string, bookingUrl: string = BOOKING_URL): ApplicationEmail {
  const subject = "You're in — let's get a call booked";

  const bookingText = bookingUrl
    ? `

BOOK YOUR CALL

${bookingUrl}

Pick a time that suits you. This link is yours — it does not go out publicly, and only people I have approved ever see it.`
    : `

BOOK YOUR CALL

I will follow up with a time. Reply to this email with a couple of windows that work for you and I will lock one in.`;

  const text = `${greet(firstName)}

I have read your questionnaire and I want you in.

I am not going to pretend that took a long committee. Your answers told me what I needed to know, and the analysis lined up with them.

The next step is a call with me. Not a sales call — a conversation about what you are actually trying to fix, so that when your account opens it opens on the right thing.${bookingText}

After the call we sort out the founding-member details and your account opens fully. Your questionnaire is already saved as your baseline, so you never fill it in twice. Your record starts the day you applied, not the day you pay.${signOff}`;

  const bookingHtml = bookingUrl
    ? [
        heading('BOOK YOUR CALL'),
        `<div style="text-align:center;margin:0 0 18px;">
          <a href="${escapeHtml(bookingUrl)}" style="display:inline-block;background:linear-gradient(135deg,#37b5ff,#0ea5e9);color:#001426;font-size:15px;font-weight:800;letter-spacing:0.5px;text-decoration:none;padding:14px 32px;border-radius:10px;">Pick a time</a>
        </div>`,
        p('Pick a time that suits you. This link is yours — it does not go out publicly, and only people I have approved ever see it.'),
      ].join('\n')
    : [
        heading('BOOK YOUR CALL'),
        p('I will follow up with a time. Reply to this email with a couple of windows that work for you and I will lock one in.'),
      ].join('\n');

  const html = shell(
    'Application approved',
    subject,
    [
      p(escapeHtml(greet(firstName))),
      p('I have read your questionnaire and <strong>I want you in.</strong>'),
      p('I am not going to pretend that took a long committee. Your answers told me what I needed to know, and the analysis lined up with them.'),
      p('The next step is a call with me. Not a sales call — a conversation about what you are actually trying to fix, so that when your account opens it opens on the right thing.'),
      bookingHtml,
      heading('AFTER THE CALL'),
      p('We sort out the founding-member details and your account opens fully. Your questionnaire is already saved as your baseline, so you never fill it in twice. <strong>Your record starts the day you applied, not the day you pay.</strong>'),
    ].join('\n')
  );

  return { subject, text, html };
}

// ─── 3. Waitlisted ────────────────────────────────────────────────────────────

export function buildApplicationWaitlisted(firstName?: string): ApplicationEmail {
  const subject = 'Your application — where things stand';

  const text = `${greet(firstName)}

I have read your questionnaire, and I am putting you on the list.

I want to be straight about what that means, because "waiting list" is usually a polite no and this is not one. I am taking a small first group so I can give each of them proper attention. You are in the group I want, and there is not room this round.

Nothing you have done is lost. Your questionnaire is saved exactly as you left it, and when a place opens I come back to you with it already done.

If your situation changes, or you want to talk it through, reply to this email. It comes to me.${signOff}`;

  const html = shell(
    'Waiting list',
    subject,
    [
      p(escapeHtml(greet(firstName))),
      p('I have read your questionnaire, and I am putting you on the list.'),
      p('I want to be straight about what that means, because "waiting list" is usually a polite no and this is not one. I am taking a small first group so I can give each of them proper attention. <strong>You are in the group I want, and there is not room this round.</strong>'),
      p('Nothing you have done is lost. Your questionnaire is saved exactly as you left it, and when a place opens I come back to you with it already done.'),
      p('If your situation changes, or you want to talk it through, reply to this email. It comes to me.'),
    ].join('\n')
  );

  return { subject, text, html };
}

// ─── 4. Declined ──────────────────────────────────────────────────────────────

export function buildApplicationDeclined(firstName?: string): ApplicationEmail {
  const subject = 'Your application';

  const text = `${greet(firstName)}

I have read your questionnaire properly, and I am not taking it forward this time.

You deserve a real reason rather than a form letter, so here it is: this is a judgement about fit and about timing. What I run is demanding and it suits a particular kind of goalie at a particular point. Getting that wrong helps neither of us, and I would rather say so now than take your money and have you find out in month three.

That is not a verdict on you as a goalie. If things change — different stage, different season, different goals — write to me and say so.

Thank you for the time you put into it. I read every word.${signOff}`;

  const html = shell(
    'Your application',
    subject,
    [
      p(escapeHtml(greet(firstName))),
      p('I have read your questionnaire properly, and I am not taking it forward this time.'),
      p('You deserve a real reason rather than a form letter, so here it is: this is a judgement about fit and about timing. What I run is demanding and it suits a particular kind of goalie at a particular point. Getting that wrong helps neither of us, and I would rather say so now than take your money and have you find out in month three.'),
      p('<strong>That is not a verdict on you as a goalie.</strong> If things change — different stage, different season, different goals — write to me and say so.'),
      p('Thank you for the time you put into it. I read every word.'),
    ].join('\n')
  );

  return { subject, text, html };
}

// ─── 5. Michael's heads-up ────────────────────────────────────────────────────

interface ApplicationNotificationData {
  displayName: string;
  email: string;
  overallScore?: number;
  pacingLevel?: string;
  adminUrl: string;
}

/** The heads-up to Michael when an application lands, mirroring the founding one. */
export function buildApplicationNotification(data: ApplicationNotificationData): ApplicationEmail {
  const subject = `New application — ${data.displayName}`;

  const score = data.overallScore !== undefined ? data.overallScore.toFixed(1) : '—';
  const pacing = data.pacingLevel || '—';

  const text = `A new application has come in.

Name:    ${data.displayName}
Email:   ${data.email}
Score:   ${score}
Pacing:  ${pacing}

Review it here: ${data.adminUrl}`;

  const rows = [
    ['Name', data.displayName],
    ['Email', data.email],
    ['Overall score', score],
    ['Pacing level', pacing],
  ]
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#64748b;font-size:14px;width:140px;">${escapeHtml(label)}</td>
          <td style="padding:8px 0;color:#0d1b3a;font-size:14px;font-weight:600;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join('');

  const html = shell(
    'New application',
    subject,
    [
      p('A new application has come in.'),
      `<table style="width:100%;border-collapse:collapse;margin:0 0 22px;">${rows}</table>`,
      `<div style="text-align:center;margin:0 0 18px;">
        <a href="${escapeHtml(data.adminUrl)}" style="display:inline-block;background:linear-gradient(135deg,#37b5ff,#0ea5e9);color:#001426;font-size:15px;font-weight:800;letter-spacing:0.5px;text-decoration:none;padding:14px 32px;border-radius:10px;">Review the application</a>
      </div>`,
    ].join('\n')
  );

  return { subject, text, html };
}
