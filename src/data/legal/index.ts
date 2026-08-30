import type { LegalDocument } from '@/types/legal';
import { termsDocument } from './terms';
import { privacyDocument } from './privacy';

export { termsDocument } from './terms';
export { privacyDocument } from './privacy';

/**
 * The versions stamped onto a user record when they accept at sign-up.
 *
 * Read from the documents themselves rather than written out by hand, so a
 * version bump in the data file cannot drift from what is being recorded.
 */
export const CURRENT_LEGAL_VERSIONS = {
  terms: termsDocument.version,
  privacy: privacyDocument.version,
} as const;

/**
 * Reduces a document to the fields a visitor is meant to receive, before it is
 * handed to a client component.
 *
 * Today that means dropping the author `brief` notes — internal drafting notes
 * which, while not sensitive, have no business being serialised into the page
 * payload every visitor downloads. It is written as an allow-list rather than
 * as an omission on purpose: any internal field added to LegalSection later is
 * excluded by default instead of leaking until someone remembers to exclude it.
 */
export function forPublic(doc: LegalDocument): LegalDocument {
  return {
    ...doc,
    sections: doc.sections.map(section => ({
      id: section.id,
      heading: section.heading,
      body: section.body,
    })),
  };
}
