import type { LegalDocument } from '@/types/legal';

/**
 * Privacy Policy.
 *
 * ── HOW TO PUBLISH THIS ──────────────────────────────────────────────────
 * Identical to terms.ts: fill each `body`, set `effectiveDate`, set `version`
 * to '1.0'. The page changes state on its own.
 *
 * ── WHY THE SECTIONS ARE THESE SECTIONS ──────────────────────────────────
 * Smarter Goalie operates from Ontario and collects personal information from
 * Canadians, so PIPEDA is the relevant federal law. Its ten principles shape
 * the outline below — in particular the ones that are easy to forget: naming
 * *why* each category is collected, saying how long it is kept, and giving
 * people a route to see and correct what is held about them.
 *
 * The children's section matters more here than on most platforms. Once
 * advertising starts, minors will reach the site, and their answers to the
 * baseline profile are personal information collected from a child. That
 * section needs real care rather than a single line.
 *
 * This structure is a starting point for Michael and his lawyer, not legal
 * advice. The `brief` fields are notes to the author and are never rendered.
 */
export const privacyDocument: LegalDocument = {
  id: 'privacy',
  title: 'Privacy Policy',
  subtitle: 'What Smarter Goalie collects, why, and what you can do about it.',

  version: '0.1-draft',
  effectiveDate: null,

  intro: [],

  sections: [
    {
      id: 'scope',
      heading: 'What this policy covers',
      body: [],
      brief:
        'Which people and which parts of the service this applies to — members, parents, coaches, and visitors who only use the public pages.',
    },
    {
      id: 'collected',
      heading: 'What we collect',
      body: [],
      brief:
        'Be specific and complete: name, email, age and level; baseline profile answers; charting and training entries; quiz results; uploaded video; messages to coaches; and technical data such as device and usage logs.',
    },
    {
      id: 'why',
      heading: 'Why we collect it',
      body: [],
      brief:
        'PIPEDA requires the purpose be identified for each category, not blanket consent. Tie each item above to a reason — coaching, progress tracking, billing, safety, service improvement.',
    },
    {
      id: 'use',
      heading: 'How we use it',
      body: [],
      brief:
        'Who inside Smarter Goalie sees what. Specifically: what a coach can see about a goalie, and what a linked parent can see about their child.',
    },
    {
      id: 'sharing',
      heading: 'Who we share it with',
      body: [],
      brief:
        'The service providers actually in use — Google Firebase for accounts, database and file storage, and Resend for email — plus the commitment that personal information is not sold.',
    },
    {
      id: 'storage',
      heading: 'Where it is stored',
      body: [],
      brief:
        'Which country the data sits in. Firebase and Resend may hold it outside Canada, and if so that must be disclosed here along with what it means.',
    },
    {
      id: 'retention',
      heading: 'How long we keep it',
      body: [],
      brief:
        'A real retention period, including what happens after an account is paused, cancelled or deleted, and what is kept afterwards for accounting.',
    },
    {
      id: 'children',
      heading: 'Children and parental consent',
      body: [],
      brief:
        'The most important section. Who may consent for a minor, how that consent is obtained and recorded, what a parent can see and control, and how a parent asks for their child\'s information to be deleted.',
    },
    {
      id: 'rights',
      heading: 'Your rights',
      body: [],
      brief:
        'The right to see what is held, correct it, withdraw consent, and ask for deletion — plus how to make that request and how long a response takes.',
    },
    {
      id: 'security',
      heading: 'How we protect it',
      body: [],
      brief:
        'The safeguards in place, and what happens if there is a breach — who is notified and how quickly.',
    },
    {
      id: 'cookies',
      heading: 'Cookies and analytics',
      body: [],
      brief:
        'What is stored in the browser and what it is for. Keep this honest and current: it needs revisiting whenever an analytics or tracking tool is added.',
    },
    {
      id: 'changes',
      heading: 'Changes to this policy',
      body: [],
      brief: 'How people are told this policy has changed, and how much notice they get.',
    },
    {
      id: 'contact',
      heading: 'Contact and complaints',
      body: [],
      brief:
        'Who to contact with a privacy question, and the route to the Office of the Privacy Commissioner of Canada if someone is not satisfied with the answer.',
    },
  ],
};
