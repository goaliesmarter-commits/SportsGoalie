'use client';

/**
 * The support-layer fields on a Knowledge Check question (Knowledge Check
 * Layers, Phase 1).
 *
 * When a goalie misses the question, its own segment of the video replays,
 * slower each time, and in the end the answer is shown. These fields say where
 * that segment starts and what the slow layers show. Every one is optional:
 * left alone, the segment starts at the previous freeze point, Layer 3 holds on
 * this freeze point, and Layer 4 shows the explanation.
 */

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { QuestionLayerMedia } from '@/types/knowledge-layers';

interface SupportLayerFieldsProps {
  segmentStart: number | undefined;
  layerMedia: QuestionLayerMedia | undefined;
  onChange: (next: { segmentStart: number | undefined; layerMedia: QuestionLayerMedia | undefined }) => void;
  formatTimestamp: (seconds: number) => string;
  parseTimestampInput: (raw: string) => number | null;
  /** Keeps the field ids unique when more than one copy is on the page. */
  idPrefix?: string;
}

function isWebLink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * What is wrong with a question's support-layer fields, in words for the admin,
 * or null when nothing is. `timestamp` is the question's freeze point.
 */
export function supportLayerProblem(
  timestamp: number,
  segmentStart: number | undefined,
  media: QuestionLayerMedia | undefined
): { title: string; description: string } | null {
  const hasStart = typeof segmentStart === 'number' && Number.isFinite(segmentStart);
  if (hasStart && segmentStart >= timestamp) {
    return {
      title: 'The replay has to start before the question',
      description: 'Set "Replay starts at" earlier, or leave it empty.',
    };
  }
  const freezeAt = media?.freezeAt;
  if (typeof freezeAt === 'number' && Number.isFinite(freezeAt)) {
    const start = hasStart ? segmentStart : 0;
    if (freezeAt > timestamp || freezeAt < start) {
      return {
        title: 'Layer 3 has to hold the frame inside the replay',
        description: 'Pick a time between where the replay starts and the question, or leave it empty.',
      };
    }
  }
  for (const [label, link] of [
    ['Layer 3 photo', media?.freezeImageUrl],
    ['Layer 4 photo', media?.answerImageUrl],
  ] as const) {
    if (link?.trim() && !isWebLink(link.trim())) {
      return { title: `The ${label} link is not a web address`, description: 'It should start with https://' };
    }
  }
  return null;
}

/** Drops empty fields, so an untouched question stores no `layerMedia` at all. */
export function cleanLayerMedia(media: QuestionLayerMedia | undefined): QuestionLayerMedia | undefined {
  if (!media) return undefined;
  const cleaned: QuestionLayerMedia = {};
  if (typeof media.freezeAt === 'number' && Number.isFinite(media.freezeAt)) cleaned.freezeAt = media.freezeAt;
  if (media.freezeImageUrl?.trim()) cleaned.freezeImageUrl = media.freezeImageUrl.trim();
  if (media.answerText?.trim()) cleaned.answerText = media.answerText.trim();
  if (media.answerImageUrl?.trim()) cleaned.answerImageUrl = media.answerImageUrl.trim();
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function SupportLayerFields({
  segmentStart,
  layerMedia,
  onChange,
  formatTimestamp,
  parseTimestampInput,
  idPrefix = '',
}: SupportLayerFieldsProps) {
  const id = (name: string) => `${idPrefix}${name}`;
  // Raw text while a time is being typed, as in the builder's other time boxes,
  // so a half-typed "1:" does not wipe the field.
  const [segmentDraft, setSegmentDraft] = useState<string | null>(null);
  const [freezeDraft, setFreezeDraft] = useState<string | null>(null);
  const media = layerMedia ?? {};

  const setMedia = (patch: Partial<QuestionLayerMedia>) =>
    onChange({ segmentStart, layerMedia: { ...media, ...patch } });

  const shownTime = (draft: string | null, value: number | undefined) =>
    draft ?? (typeof value === 'number' && Number.isFinite(value) ? formatTimestamp(value) : '');

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-4">
      <div>
        <Label className="text-sm font-semibold">Support layers</Label>
        <p className="text-xs text-gray-600 mt-1">
          If he misses this question, its part of the video replays at half speed, then at
          quarter speed ending on a held frame, and then the answer is shown. All optional.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('segmentStart')}>Replay starts at</Label>
        <Input
          id={id('segmentStart')}
          type="text"
          placeholder="1:05 or 65"
          value={shownTime(segmentDraft, segmentStart)}
          onChange={(e) => {
            setSegmentDraft(e.target.value);
            const parsed = parseTimestampInput(e.target.value);
            onChange({ segmentStart: parsed === null ? undefined : parsed, layerMedia });
          }}
          onBlur={() => setSegmentDraft(null)}
          className="w-full border-slate-300 focus-visible:ring-red-200 bg-white"
        />
        <p className="text-xs text-gray-500">
          Leave empty to replay from the previous freeze point, or the start of the clip if
          this is the first. It replays up to this question.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={id('layer3FreezeAt')}>Layer 3 holds the frame at</Label>
          <Input
            id={id('layer3FreezeAt')}
            type="text"
            placeholder="This question's time"
            value={shownTime(freezeDraft, media.freezeAt)}
            onChange={(e) => {
              setFreezeDraft(e.target.value);
              const parsed = parseTimestampInput(e.target.value);
              setMedia({ freezeAt: parsed === null ? undefined : parsed });
            }}
            onBlur={() => setFreezeDraft(null)}
            className="w-full border-slate-300 focus-visible:ring-red-200 bg-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id('layer3Photo')}>Layer 3 photo instead (link)</Label>
          <Input
            id={id('layer3Photo')}
            type="url"
            placeholder="https://..."
            value={media.freezeImageUrl ?? ''}
            onChange={(e) => setMedia({ freezeImageUrl: e.target.value })}
            className="w-full border-slate-300 focus-visible:ring-red-200 bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('layer4Answer')}>Layer 4: the answer, in your words</Label>
        <Textarea
          id={id('layer4Answer')}
          value={media.answerText ?? ''}
          onChange={(e) => setMedia({ answerText: e.target.value })}
          placeholder="Leave empty to show the explanation above"
          rows={2}
          className="border-slate-300 focus-visible:ring-red-200 bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={id('layer4Photo')}>Layer 4 photo (link, optional)</Label>
        <Input
          id={id('layer4Photo')}
          type="url"
          placeholder="https://..."
          value={media.answerImageUrl ?? ''}
          onChange={(e) => setMedia({ answerImageUrl: e.target.value })}
          className="w-full border-slate-300 focus-visible:ring-red-200 bg-white"
        />
      </div>
    </div>
  );
}

interface QuestionLayerEditorProps {
  /** The question's freeze point, in seconds. */
  timestamp: number;
  segmentStart: number | undefined;
  layerMedia: QuestionLayerMedia | undefined;
  /** Called with the checked, tidied values when the admin applies them. */
  onApply: (next: { segmentStart: number | undefined; layerMedia: QuestionLayerMedia | undefined }) => void;
  /** Says what is wrong when the values cannot be applied. */
  onProblem: (problem: { title: string; description: string }) => void;
  formatTimestamp: (seconds: number) => string;
  parseTimestampInput: (raw: string) => number | null;
  idPrefix: string;
}

/**
 * The support-layer fields for a question that is already in the list, so
 * layers can be added to questions made before they existed. Edits stay in a
 * draft until applied, then go through the same check as a new question.
 */
export function QuestionLayerEditor({
  timestamp,
  segmentStart,
  layerMedia,
  onApply,
  onProblem,
  formatTimestamp,
  parseTimestampInput,
  idPrefix,
}: QuestionLayerEditorProps) {
  const [draft, setDraft] = useState({ segmentStart, layerMedia });

  const apply = () => {
    const problem = supportLayerProblem(timestamp, draft.segmentStart, draft.layerMedia);
    if (problem) {
      onProblem(problem);
      return;
    }
    onApply({
      segmentStart: Number.isFinite(draft.segmentStart) ? draft.segmentStart : undefined,
      layerMedia: cleanLayerMedia(draft.layerMedia),
    });
  };

  return (
    <div className="space-y-3">
      <SupportLayerFields
        segmentStart={draft.segmentStart}
        layerMedia={draft.layerMedia}
        onChange={setDraft}
        formatTimestamp={formatTimestamp}
        parseTimestampInput={parseTimestampInput}
        idPrefix={idPrefix}
      />
      <div className="flex items-center justify-end gap-3">
        <p className="text-xs text-gray-500">Then save the Knowledge Check to keep it.</p>
        <Button type="button" size="sm" onClick={apply}>
          Apply support layers
        </Button>
      </div>
    </div>
  );
}
