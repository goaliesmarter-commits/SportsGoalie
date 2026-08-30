'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ShieldAlert } from 'lucide-react';
import { SkeletonListPage } from '@/components/ui/skeletons';
import { useAuth } from '@/lib/auth/context';
import { mindVaultService } from '@/lib/database/services/mind-vault.service';
import { AcceptancePromptItem } from '@/components/mind-vault/AcceptancePromptItem';
import { MindVaultEntryForm } from '@/components/mind-vault/MindVaultEntryForm';
import { MindVaultEntryCard } from '@/components/mind-vault/MindVaultEntryCard';
import { CANNOT_ACCEPT_SUBCATEGORIES, CANNOT_ACCEPT_PROMPTS, type MindVaultEntry } from '@/types/mind-vault';
import { toast } from 'sonner';

const RED = '#f87171';

export default function CannotAcceptListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [entries, setEntries] = useState<MindVaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubcategories, setExpandedSubcategories] = useState<Record<string, boolean>>(() =>
    CANNOT_ACCEPT_SUBCATEGORIES.reduce<Record<string, boolean>>((acc, sub) => { acc[sub.slug] = true; return acc; }, {})
  );

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const result = await mindVaultService.getEntriesByCategory(user.id, 'cannot_accept');
      if (result.success && result.data) setEntries(result.data);
      else toast.error(result.error?.message || 'Failed to load Cannot Accept List');
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const acceptedTexts = new Set(entries.map(e => e.content));

  const handleAcceptPrompt = async (text: string, subcategory: string) => {
    if (!user?.id) return;
    try {
      const result = await mindVaultService.addEntry({ studentId: user.id, category: 'cannot_accept', subcategory, content: text, isVoiceEntry: false, source: 'manual' });
      if (result.success) {
        const reload = await mindVaultService.getEntriesByCategory(user.id, 'cannot_accept');
        if (reload.success && reload.data) setEntries(reload.data);
        toast.success('Saved to your Cannot Accept List.');
      } else toast.error(result.error?.message || result.message || 'Failed to add entry');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  /*
    `subcategory` is optional so the catch-all form at the bottom of the page still
    works unchanged. Entries added before per-category forms existed have no
    subcategory either, which is why the ungrouped list below is kept rather than
    folded into the categories.
  */
  const handleAddCustom = async (content: string, isVoice: boolean, subcategory?: string) => {
    if (!user?.id) return;
    const result = await mindVaultService.addEntry({ studentId: user.id, category: 'cannot_accept', ...(subcategory ? { subcategory } : {}), content, isVoiceEntry: isVoice, source: 'manual' });
    if (result.success) {
      const reload = await mindVaultService.getEntriesByCategory(user.id, 'cannot_accept');
      if (reload.success && reload.data) setEntries(reload.data);
      toast.success('Saved to your Cannot Accept List.');
    } else toast.error(result.error?.message || result.message || 'Failed to add entry');
  };

  const handleDeleteEntry = async (id: string) => {
    await mindVaultService.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const toggleSubcategory = (slug: string) => setExpandedSubcategories(prev => ({ ...prev, [slug]: !prev[slug] }));

  const promptTexts = new Set(CANNOT_ACCEPT_PROMPTS.map(p => p.text));
  const customEntries = entries.filter(e => !promptTexts.has(e.content));
  const subcategorySlugs = new Set(CANNOT_ACCEPT_SUBCATEGORIES.map(s => s.slug as string));
  // Anything whose subcategory we no longer recognise stays visible at the bottom
  // rather than disappearing with the category it used to belong to.
  const ungroupedCustomEntries = customEntries.filter(e => !e.subcategory || !subcategorySlugs.has(e.subcategory));

  if (loading) return <div style={{ padding: '16px' }}><SkeletonListPage cols={2} count={4} /></div>;

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Header */}
        <div style={{ background: 'rgba(2,18,44,0.9)', border: `1.5px solid rgba(248,113,113,0.3)`, borderRadius: '16px', padding: '22px 24px' }}>
          <button
            onClick={() => router.push('/mind-vault')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: RED, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '20px', padding: '5px 14px', cursor: 'pointer', fontWeight: 700, marginBottom: '16px' }}
          >
            <ArrowLeft size={12} /> Mind Vault
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldAlert size={20} color={RED} />
            </div>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>Cannot Accept List</h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Your psychological firewall — what you consciously refuse to surrender to.</p>
            </div>
          </div>
          <p style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', fontSize: '11px', color: RED, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '20px', padding: '4px 12px', fontWeight: 600 }}>
            These are your non-negotiables. Tap to claim them, or add your own.
          </p>
        </div>

        {/* Expandable Index info */}
        <div style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.18)', borderRadius: '14px', padding: '18px 20px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: RED, marginBottom: '6px' }}>Expandable Index</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
            Your psychological firewall grows as new pressure points appear. Add entries after difficult games, practices, or personal moments so your non-negotiables stay clear, specific, and strong.
          </p>
        </div>

        {/* Sub-categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {CANNOT_ACCEPT_SUBCATEGORIES.map(sub => {
            const prompts = CANNOT_ACCEPT_PROMPTS.filter(p => p.subcategory === sub.slug);
            const isExpanded = expandedSubcategories[sub.slug];
            const acceptedCount = prompts.filter(p => acceptedTexts.has(p.text)).length;
            const subCustomEntries = customEntries.filter(e => e.subcategory === sub.slug);
            return (
              <div key={sub.slug} style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: '14px', padding: '14px', overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => toggleSubcategory(sub.slug)}
                  aria-expanded={isExpanded}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', textAlign: 'left', marginBottom: '10px' }}
                >
                  <div>
                    <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{sub.name}</h2>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{sub.description}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: RED, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: '20px', padding: '2px 8px' }}>
                      {acceptedCount}/{prompts.length}
                    </span>
                    <ChevronDown size={15} color={RED} style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </div>
                </button>
                {isExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {prompts.map(prompt => (
                      <AcceptancePromptItem key={prompt.id} promptText={prompt.text} isAccepted={acceptedTexts.has(prompt.text)} variant="red" onAccept={text => handleAcceptPrompt(text, sub.slug)} />
                    ))}
                    {subCustomEntries.map(entry => (
                      <MindVaultEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />
                    ))}
                    {/*
                      Michael, 18 Aug: the add-suggestion button sat once after the last
                      category, so a goalie reading one category had to scroll past all the
                      others to record what that category just prompted. One per category.
                    */}
                    <MindVaultEntryForm
                      onSubmit={(content, isVoice) => handleAddCustom(content, isVoice, sub.slug)}
                      placeholder={`Add your own non-negotiable for ${sub.name}, in your own words...`}
                      label={`Add your own to ${sub.name}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom entries that belong to no category — including everything added
            before the per-category forms above existed. */}
        {ungroupedCustomEntries.length > 0 && (
          <div style={{ background: 'rgba(2,18,44,0.82)', border: '1px solid rgba(248,113,113,0.12)', borderRadius: '14px', padding: '18px 20px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Your Custom Entries</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ungroupedCustomEntries.map(entry => <MindVaultEntryCard key={entry.id} entry={entry} onDelete={handleDeleteEntry} />)}
            </div>
          </div>
        )}

        {/* Add custom entry — for anything that fits none of the categories above */}
        <MindVaultEntryForm onSubmit={handleAddCustom} placeholder="Add your own non-negotiable in your own words..." label="Add an entry outside these categories" />
      </div>
    </div>
  );
}
