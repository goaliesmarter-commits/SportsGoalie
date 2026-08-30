import type { Metadata } from 'next';
import { LegalDocumentPage } from '@/components/legal/LegalDocumentPage';
import { forPublic, privacyDocument } from '@/data/legal';

// See app/terms/page.tsx — same story, same date.
export const metadata: Metadata = {
  title: 'Privacy Policy · Smarter Goalie',
  description: 'What Smarter Goalie collects, why, and what you can do about it.',
};

export default function PrivacyPage() {
  return <LegalDocumentPage doc={forPublic(privacyDocument)} />;
}
