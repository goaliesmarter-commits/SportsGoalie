'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SkeletonListPage } from '@/components/ui/skeletons';
import { useAuth } from '@/lib/auth/context';
import { mindVaultService } from '@/lib/database/services/mind-vault.service';
import { MindVaultEntryCard } from '@/components/mind-vault/MindVaultEntryCard';
import { MindVaultEntryForm } from '@/components/mind-vault/MindVaultEntryForm';
import { AcceptancePromptItem } from '@/components/mind-vault/AcceptancePromptItem';
import { getMindVaultCategoryInfo, getCategoryPrompts, type MindVaultCategory, type MindVaultEntry } from '@/types/mind-vault';
import { toast } from 'sonner';

const BLUE = '#37b5ff';

export default function MindVaultCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const categorySlug = params.category as MindVaultCategory;
  const categoryInfo = getMindVaultCategoryInfo(categorySlug);

  const [entries, setEntries] = useState<MindVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !categorySlug) return;
    if (categorySlug === 'acceptance') { router.replace('/mind-vault/acceptance'); return; }
    if (categorySlug === 'cannot_accept') { router.replace('/mind-vault/cannot-accept'); return; }

    const load = async () => {
      setLoading(true);
      const result = await mindVaultService.getEntriesByCategory(user.id, categorySlug);
      if (result.success && result.data) setEntries(result.data);
      else toast.error(result.error?.message || 'Failed to load entries');
      setLoading(false);
    };
    load();
  }, [user?.id, categorySlug, router]);

  const handleAddEntry = async (content: string, isVoice: boolean) => {
    if (!user?.id) return;
    const result = await mindVaultService.addEntry({ studentId: user.id, category: categorySlug, content, isVoiceEntry: isVoice, source: 'manual' });
    if (result.success) {
      const reload = await mindVaultService.getEntriesByCategory(user.id, categorySlug);
      if (reload.success && reload.data) setEntries(reload.data);
      toast.success('Saved to your Mind Vault.');
    } else toast.error(result.error?.message || 'Failed to add entry');
  };

  const handleDeleteEntry = async (id: string) => {
    await mindVaultService.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  // Suggestions this category offers, and which of them the goalie has already
  // taken. Both are empty for every category until Michael supplies the wording,
  // which keeps these pages looking exactly as they do now.
  const prompts = getCategoryPrompts(categorySlug);
  const acceptedTexts = new Set(entries.map(e => e.content));
  const promptTexts = new Set(prompts);
  const customEntries = entries.filter(e => !promptTexts.has(e.content));

  if (!categoryInfo) {
    return (
      <div style={{ background: 'linear-gradient(145deg, #000f28 0%, #062344 100%)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '16px' }}>Category not found.</p>
          <button
            onClick={() => router.push('/mind-vault')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '20px', padding: '8px 16px', cursor: 'pointer', fontWeight: 700 }}
          >
            <ArrowLeft size={13} /> Back to Mind Vault
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{ background: 'rgba(2,18,44,0.9)', border: '1.5px solid rgba(55,181,255,0.3)', borderRadius: '16px', padding: '22px 24px' }}>
          <button
            onClick={() => router.push('/mind-vault')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: BLUE, background: 'rgba(55,181,255,0.1)', border: '1px solid rgba(55,181,255,0.25)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', fontWeight: 700, marginBottom: '16px' }}
          >
            <ArrowLeft size={12} /> Mind Vault
          </button>
          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{categoryInfo.name}</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{categoryInfo.description}</p>
        </div>

        {/* Suggestions — tap one to add it, same as the Acceptance list */}
        {!loading && prompts.length > 0 && (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(55,181,255,0.15)', borderRadius: '14px', padding: '18px 20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>Suggestions</h2>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
              Tap one to add it, or write your own below.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {prompts.map(prompt => (
                <AcceptancePromptItem
                  key={prompt}
                  promptText={prompt}
                  isAccepted={acceptedTexts.has(prompt)}
                  onAccept={text => handleAddEntry(text, false)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add Entry Form */}
        <MindVaultEntryForm onSubmit={handleAddEntry} placeholder={`What would you like to add to ${categoryInfo.shortName}?`} />

        {/* Entries */}
        {loading ? (
          <div style={{ padding: '8px 0' }}><SkeletonListPage cols={2} count={4} /></div>
        ) : entries.length === 0 ? (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px dashed rgba(55,181,255,0.2)', borderRadius: '14px', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>No entries yet.</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
              Tap &quot;Add Entry&quot; above to start building this part of your vault.
            </p>
          </div>
        ) : customEntries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {customEntries.map(entry => <MindVaultEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
