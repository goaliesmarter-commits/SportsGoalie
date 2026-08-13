'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceRecorder } from '@/components/charting/inputs/VoiceRecorder';

interface Props {
  onSubmit: (content: string, isVoice: boolean) => Promise<void>;
  placeholder?: string;
}

export function MindVaultEntryForm({ onSubmit, placeholder }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isVoice, setIsVoice] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleTranscription = (text: string) => {
    setContent(text);
    setIsVoice(true);
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onSubmit(content.trim(), isVoice);
      setContent('');
      setIsVoice(false);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl border-dashed border-[rgba(55,181,255,0.3)] bg-[rgba(55,181,255,0.08)] text-[#37b5ff] transition-all hover:-translate-y-0.5 hover:border-[rgba(55,181,255,0.5)] hover:bg-[rgba(55,181,255,0.14)] hover:text-[#5ac4ff]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Entry
      </Button>
    );
  }

  return (
    /*
      Every Mind Vault page this form sits on is the navy shell, but this card
      was built light — which left VoiceRecorder's white note text sitting on a
      white background, invisible. `.surface-dark` repoints the shadcn tokens so
      the Cancel/Save buttons read correctly on it (see globals.css).
    */
    <div className="surface-dark space-y-4 rounded-2xl border border-[rgba(55,181,255,0.2)] bg-[rgba(2,18,44,0.82)] p-4 shadow-sm">
      <VoiceRecorder
        onTranscriptionComplete={handleTranscription}
        initialText={content}
        placeholder={placeholder || 'Speak or type your entry...'}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            setContent('');
            setIsVoice(false);
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !content.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Saving...
            </>
          ) : (
            'Save to Vault'
          )}
        </Button>
      </div>
    </div>
  );
}
