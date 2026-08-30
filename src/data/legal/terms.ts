import type { LegalDocument } from '@/types/legal';

/**
 * Terms of Service.
 *
 * ── HOW TO PUBLISH THIS ──────────────────────────────────────────────────
 * When Michael's wording arrives:
 *   1. Fill each section's `body` array — one string per paragraph.
 *   2. Set `effectiveDate` to the date it comes into force (YYYY-MM-DD).
 *   3. Set `version` to '1.0'.
 * The page flips from draft outline to a real document on its own. No
 * component changes, no route changes.
 *
 * Sections with no `body` are simply skipped once the document is in force,
 * so partial wording can ship — the sections that exist render, the rest wait.
 *
 * The `brief` on each section is the note to the author and is never shown to
 * visitors. The section list below is a conventional structure for a paid
 * training platform; it is a starting point for Michael and his lawyer, not
 * legal advice, and sections should be added or dropped as they see fit.
 */
export const termsDocument: LegalDocument = {
  id: 'terms',
  title: 'Terms of Service',
  subtitle: 'The agreement between you and Smarter Goalie.',

  // '0.1-draft' rather than '1.0' on purpose: nothing here is in force, and a
  // version stamped on a user record must never imply otherwise.
  version: '0.1-draft',
  effectiveDate: null,

  intro: [],

  sections: [
    {
      id: 'about',
      heading: 'About these terms',
      body: [],
      brief:
        'Who Smarter Goalie is as a legal entity, what accepting these terms means, and that continuing to use the platform means accepting them.',
    },
    {
      id: 'eligibility',
      heading: 'Accounts and eligibility',
      body: [],
      brief:
        'Who may hold an account, the minimum age, that under-age goalies are registered by a parent or guardian, and the account holder\'s responsibility for their login details.',
    },
    {
      id: 'service',
      heading: 'What the platform provides',
      body: [],
      brief:
        'What a member actually receives — training content, assessments, charting, coach feedback — and, importantly, what is not promised. Athletic outcomes must not be guaranteed.',
    },
    {
      id: 'conduct',
      heading: 'Acceptable use',
      body: [],
      brief:
        'Account sharing, downloading or redistributing content, conduct in any coach or parent communication, and what happens when someone breaches this.',
    },
    {
      id: 'content',
      heading: 'Content and intellectual property',
      body: [],
      brief:
        'That Michael\'s videos, drills and written material remain his; the licence a member gets to use them; and who owns what a member uploads, including their own game video.',
    },
    {
      id: 'payment',
      heading: 'Fees and payment',
      body: [],
      brief:
        'Price, billing period, how payment is made (currently e-transfer), what founding-member pricing means and whether it is held for renewals, and taxes.',
    },
    {
      id: 'cancellation',
      heading: 'Pausing, cancelling and refunds',
      body: [],
      brief:
        'How a family pauses or cancels, notice required, whether anything is refundable, and what happens to their data and progress afterwards.',
    },
    {
      id: 'termination',
      heading: 'Ending an account',
      body: [],
      brief:
        'The grounds on which Smarter Goalie may suspend or close an account, whether notice is given, and what a member is owed if that happens.',
    },
    {
      id: 'liability',
      heading: 'Disclaimers and limits of liability',
      body: [],
      brief:
        'The section a lawyer should draft. Physical training carries injury risk, and a platform that instructs athletes needs this properly written — please do not have this one written in-house.',
    },
    {
      id: 'changes',
      heading: 'Changes to these terms',
      body: [],
      brief:
        'How members are told about changes and how much notice they get. The platform version-stamps every acceptance, so re-acceptance after a material change is possible — say here whether it will be required.',
    },
    {
      id: 'law',
      heading: 'Governing law',
      body: [],
      brief: 'The province and country whose law applies, and where disputes are heard.',
    },
    {
      id: 'contact',
      heading: 'Contact',
      body: [],
      brief: 'The address, email and phone number for questions about these terms.',
    },
  ],
};
