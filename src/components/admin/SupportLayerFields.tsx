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
}: SupportLayerFieldsProps) {
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
        <Label htmlFor="segmentStart">Replay starts at</Label>
        <Input
          id="segmentStart"
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
          <Label htmlFor="layer3FreezeAt">Layer 3 holds the frame at</Label>
          <Input
            id="layer3FreezeAt"
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
          <Label htmlFor="layer3Photo">Layer 3 photo instead (link)</Label>
          <Input
            id="layer3Photo"
            type="url"
            placeholder="https://..."
            value={media.freezeImageUrl ?? ''}
            onChange={(e) => setMedia({ freezeImageUrl: e.target.value })}
            className="w-full border-slate-300 focus-visible:ring-red-200 bg-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="layer4Answer">Layer 4: the answer, in your words</Label>
        <Textarea
          id="layer4Answer"
          value={media.answerText ?? ''}
          onChange={(e) => setMedia({ answerText: e.target.value })}
          placeholder="Leave empty to show the explanation above"
          rows={2}
          className="border-slate-300 focus-visible:ring-red-200 bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="layer4Photo">Layer 4 photo (link, optional)</Label>
        <Input
          id="layer4Photo"
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
