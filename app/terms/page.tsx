import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { forPublic, termsDocument } from '@/data/legal';

// The sign-up tickbox has linked here since long before this route existed,
// so every visitor who clicked through from it got a 404. Created 27 Aug 2026.
export const metadata: Metadata = {
  title: 'Terms of Service · Smarter Goalie',
  description: 'The agreement between you and Smarter Goalie.',
};

export default function TermsPage() {
  return <LegalDocumentPage doc={forPublic(termsDocument)} />;
}
