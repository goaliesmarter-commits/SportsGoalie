'use client';

/**
 * Coach Audio — upload and manage Michael's recorded lines.
 *
 * Built around dropping a whole folder at once: Michael sends 50-odd files
 * named SG_VOICE_V-A-01.wav and they match themselves to catalogue ids. Files
 * that do not match are reported rather than stored under a guessed id.
 *
 * The screen lists all 59 expected recordings, not just the uploaded ones, so
 * a gap is visible. That is how the eight missing pillar intros surfaced on
 * 12 September.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  Check,
  CircleAlert,
  Loader2,
  Pause,
  Play,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminRoute } from '@/components/auth/protected-route';
import { CoachAudioButton } from '@/components/audio/CoachAudioButton';
import { useCoachAudio } from '@/lib/audio/context';
import { SkeletonDarkPage } from '@/components/ui/skeletons';
import { coachAudioService } from '@/lib/database/services/coach-audio.service';
import {
  COACH_AUDIO_PART_LABELS,
  COACH_AUDIO_PART_ORDER,
  coachAudioIdFromFilename,
  type CoachAudioPart,
  type CoachAudioStatus,
} from '@/types/coach-audio';

/* ─── Style constants, matching the other admin screens ────────────────────── */

const BLUE = '#37b5ff';
const GREEN = '#22c55e';
const AMBER = '#fbbf24';
const MUTED = 'rgba(255,255,255,0.45)';
const FAINT = 'rgba(255,255,255,0.3)';

const card = {
  background: 'rgba(2,18,44,0.82)',
  border: '1px solid rgba(55,181,255,0.14)',
  borderRadius: '16px',
} as const;

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

/**
 * Reads playback duration by loading the file into a detached audio element.
 * Firebase Storage does not record duration, and doing this at upload time
 * avoids decoding the file again later. Resolves null if the browser cannot
 * decode it — a duration is useful, not essential.
 */
function readDuration(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(value);
    };

    audio.addEventListener('loadedmetadata', () => {
      finish(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null);
    });
    audio.addEventListener('error', () => finish(null));
    // Some browsers never fire either event for an unsupported codec.
    setTimeout(() => finish(null), 8000);

    audio.preload = 'metadata';
    audio.src = url;
  });
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—';
  return `${seconds.toFixed(1)}s`;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

function CoachAudioAdminPage() {
  const [statuses, setStatuses] = useState<CoachAudioStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewRef = useRef<HTMLAudioElement | null>(null);
  const bulkInputRef = useRef<HTMLInputElement | null>(null);

  // The provider caches the whole collection once per page load, so an upload
  // here leaves every CoachAudioButton in the app showing the old state until
  // a refresh. Reload both together rather than only this screen's list.
  const { refresh: refreshSharedCache } = useCoachAudio();

  const load = useCallback(async () => {
    const result = await coachAudioService.getStatuses();
    if (result.success && result.data) setStatuses(result.data);
    else toast.error(result.error?.message ?? 'Could not load the catalogue.');
    setIsLoading(false);
    await refreshSharedCache();
  }, [refreshSharedCache]);

  useEffect(() => {
    void load();
  }, [load]);

  // One preview element for the screen, so starting a clip stops the last one.
  useEffect(() => {
    const element = new Audio();
    previewRef.current = element;
    const clear = () => setPreviewId(null);
    element.addEventListener('ended', clear);
    element.addEventListener('pause', clear);
    return () => {
      element.removeEventListener('ended', clear);
      element.removeEventListener('pause', clear);
      element.pause();
      previewRef.current = null;
    };
  }, []);

  const markBusy = (id: string, busy: boolean) =>
    setBusyIds(current => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const uploadOne = useCallback(
    async (id: string, file: File): Promise<boolean> => {
      markBusy(id, true);
      try {
        const duration = await readDuration(file);
        const result = await coachAudioService.uploadClip(id, file, duration);
        if (!result.success) {
          toast.error(result.error?.message ?? `Could not upload ${file.name}.`);
          return false;
        }
        return true;
      } finally {
        markBusy(id, false);
      }
    },
    []
  );

  /**
   * Takes whatever was dropped, matches each file to a catalogue id, and
   * uploads the ones that matched. Unmatched files are named in a toast — a
   * file Michael renamed by hand should not fail silently.
   */
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;

      const matched: Array<{ id: string; file: File }> = [];
      const unmatched: string[] = [];

      for (const file of list) {
        const id = coachAudioIdFromFilename(file.name);
        if (id) matched.push({ id, file });
        else unmatched.push(file.name);
      }

      if (unmatched.length > 0) {
        toast.warning(
          `${unmatched.length} file${unmatched.length === 1 ? '' : 's'} did not match a clip id`,
          { description: unmatched.slice(0, 5).join(', ') + (unmatched.length > 5 ? '…' : '') }
        );
      }
      if (matched.length === 0) return;

      const toastId = toast.loading(`Uploading ${matched.length} recording(s)…`);
      let uploaded = 0;

      // Sequential on purpose. Firebase Storage handles parallel uploads fine,
      // but 50 at once on a home connection tends to produce timeouts rather
      // than speed, and a clear progress count is worth more here.
      for (const { id, file } of matched) {
        if (await uploadOne(id, file)) uploaded += 1;
        toast.loading(`Uploaded ${uploaded} of ${matched.length}…`, { id: toastId });
      }

      toast.success(`${uploaded} of ${matched.length} uploaded`, { id: toastId });
      await load();
    },
    [uploadOne, load]
  );

  const handleSingle = useCallback(
    async (id: string, file: File | undefined) => {
      if (!file) return;
      if (await uploadOne(id, file)) {
        toast.success(`${id} uploaded`);
        await load();
      }
    },
    [uploadOne, load]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      markBusy(id, true);
      const result = await coachAudioService.deleteClip(id);
      markBusy(id, false);
      if (result.success) {
        toast.success(`${id} removed`);
        await load();
      } else {
        toast.error(result.error?.message ?? 'Could not remove that clip.');
      }
    },
    [load]
  );

  const togglePreview = useCallback(
    (id: string, url: string) => {
      const element = previewRef.current;
      if (!element) return;
      if (previewId === id) {
        element.pause();
        return;
      }
      if (element.src !== url) element.src = url;
      element.currentTime = 0;
      void element
        .play()
        .then(() => setPreviewId(id))
        .catch(() => toast.error('The browser would not play that file.'));
    },
    [previewId]
  );

  // Two or three uploaded clips is enough to prove the "only one plays at a
  // time" rule; one missing clip proves the disabled state renders.
  const previewIds = useMemo(
    () => statuses.filter(row => row.clip !== null).slice(0, 3).map(row => row.entry.id),
    [statuses]
  );
  const missingPreviewId = useMemo(
    () => statuses.find(row => row.clip === null)?.entry.id ?? null,
    [statuses]
  );

  const summary = useMemo(() => {
    const total = statuses.length;
    const uploaded = statuses.filter(s => s.clip !== null).length;
    const byPart = COACH_AUDIO_PART_ORDER.map(part => {
      const rows = statuses.filter(s => s.entry.part === part);
      return {
        part,
        total: rows.length,
        uploaded: rows.filter(s => s.clip !== null).length,
      };
    });
    return { total, uploaded, missing: total - uploaded, byPart };
  }, [statuses]);

  if (isLoading) return <SkeletonDarkPage />;

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            margin: 0,
          }}
        >
          <AudioLines size={22} color={BLUE} />
          Coach Audio
        </h1>
        <p style={{ color: MUTED, fontSize: '15px', margin: '6px 0 0' }}>
          Michael&apos;s recorded lines. Drop the whole folder — files named{' '}
          <code style={{ color: BLUE }}>SG_VOICE_V-A-01.wav</code> match themselves to their id.
        </p>
      </div>

      {/* ─── Summary ────────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '30px', fontWeight: 800, color: '#fff' }}>
            {summary.uploaded}
          </span>
          <span style={{ fontSize: '15px', color: MUTED }}>of {summary.total} recordings in</span>
          {summary.missing > 0 && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '13px',
                fontWeight: 700,
                color: AMBER,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CircleAlert size={14} />
              {summary.missing} still missing
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '18px',
            flexWrap: 'wrap',
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {summary.byPart.map(row => (
            <div key={row.part}>
              <div style={{ fontSize: '11px', color: FAINT, letterSpacing: '0.8px' }}>
                {COACH_AUDIO_PART_LABELS[row.part].toUpperCase()}
              </div>
              <div
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: row.uploaded === row.total ? GREEN : AMBER,
                }}
              >
                {row.uploaded} / {row.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Live preview ───────────────────────────────────────────────── */}
      {previewIds.length > 0 && (
        <div style={{ ...card, padding: '20px', marginBottom: '18px' }}>
          <div
            style={{
              fontSize: '11px',
              color: FAINT,
              letterSpacing: '1.2px',
              fontWeight: 700,
              marginBottom: '4px',
            }}
          >
            LIVE PREVIEW
          </div>
          <div style={{ fontSize: '12px', color: MUTED, marginBottom: '14px' }}>
            The real button, exactly as it will appear on the site. Play one, then another —
            the first should stop. VOICE OFF should silence and disable them all.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {previewIds.map(id => (
              <CoachAudioButton key={id} clipId={id} showToggle={false} />
            ))}
            {missingPreviewId && (
              <CoachAudioButton clipId={missingPreviewId} showToggle={false} />
            )}
          </div>

          <div style={{ marginTop: '14px' }}>
            <CoachAudioButton clipId={previewIds[0]} label="VOICE CONTROL" showToggle />
          </div>
        </div>
      )}

      {/* ─── Bulk drop zone ─────────────────────────────────────────────── */}
      <div
        onDragOver={event => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={event => {
          event.preventDefault();
          setIsDragging(false);
          void handleFiles(event.dataTransfer.files);
        }}
        onClick={() => bulkInputRef.current?.click()}
        style={{
          ...card,
          border: `2px dashed ${isDragging ? BLUE : 'rgba(55,181,255,0.25)'}`,
          background: isDragging ? 'rgba(55,181,255,0.08)' : card.background,
          padding: '32px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '22px',
          transition: 'all 0.15s',
        }}
      >
        <Upload size={26} color={BLUE} style={{ margin: '0 auto 10px' }} />
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
          Drop the recordings here
        </div>
        <div style={{ color: MUTED, fontSize: '13px', marginTop: '4px' }}>
          Or click to choose files. Existing recordings are replaced, not duplicated.
        </div>
        <input
          ref={bulkInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.m4a"
          multiple
          hidden
          onChange={event => {
            if (event.target.files) void handleFiles(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      {/* ─── The catalogue, grouped ─────────────────────────────────────── */}
      {COACH_AUDIO_PART_ORDER.map(part => (
        <PartSection
          key={part}
          part={part}
          rows={statuses.filter(s => s.entry.part === part)}
          busyIds={busyIds}
          previewId={previewId}
          onPreview={togglePreview}
          onUpload={handleSingle}
          onDelete={handleDelete}
        />
      ))}
    </div>
  );
}

/* ─── One recording group ──────────────────────────────────────────────────── */

function PartSection({
  part,
  rows,
  busyIds,
  previewId,
  onPreview,
  onUpload,
  onDelete,
}: {
  part: CoachAudioPart;
  rows: CoachAudioStatus[];
  busyIds: Set<string>;
  previewId: string | null;
  onPreview: (id: string, url: string) => void;
  onUpload: (id: string, file: File | undefined) => void;
  onDelete: (id: string) => void;
}) {
  const uploaded = rows.filter(r => r.clip !== null).length;

  return (
    <section style={{ marginBottom: '22px' }}>
      <h2
        style={{
          fontSize: '13px',
          fontWeight: 800,
          color: BLUE,
          letterSpacing: '1.2px',
          textTransform: 'uppercase',
          margin: '0 0 10px',
        }}
      >
        {COACH_AUDIO_PART_LABELS[part]}{' '}
        <span style={{ color: FAINT, fontWeight: 600 }}>
          — {uploaded} of {rows.length}
        </span>
      </h2>

      <div style={{ ...card, overflow: 'hidden' }}>
        {rows.map((row, index) => (
          <ClipRow
            key={row.entry.id}
            status={row}
            isBusy={busyIds.has(row.entry.id)}
            isPlaying={previewId === row.entry.id}
            isLast={index === rows.length - 1}
            onPreview={onPreview}
            onUpload={onUpload}
            onDelete={onDelete}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── One recording ────────────────────────────────────────────────────────── */

function ClipRow({
  status,
  isBusy,
  isPlaying,
  isLast,
  onPreview,
  onUpload,
  onDelete,
}: {
  status: CoachAudioStatus;
  isBusy: boolean;
  isPlaying: boolean;
  isLast: boolean;
  onPreview: (id: string, url: string) => void;
  onUpload: (id: string, file: File | undefined) => void;
  onDelete: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { entry, clip } = status;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 14px',
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Play / status dot */}
      <div style={{ width: '30px', flexShrink: 0 }}>
        {isBusy ? (
          <Loader2 size={16} color={BLUE} className="animate-spin" />
        ) : clip ? (
          <button
            type="button"
            onClick={() => onPreview(entry.id, clip.url)}
            aria-label={`${isPlaying ? 'Pause' : 'Play'} ${entry.id}`}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: 'none',
              background: `linear-gradient(135deg, ${BLUE}, #0ea5e9)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? (
              <Pause size={11} color="#fff" fill="#fff" />
            ) : (
              <Play size={11} color="#fff" fill="#fff" />
            )}
          </button>
        ) : (
          <div
            title="Not uploaded"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px dashed rgba(255,255,255,0.2)',
            }}
          />
        )}
      </div>

      {/* Id + script line */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <code style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{entry.id}</code>
          {entry.readsMessageId && (
            <span style={{ fontSize: '10px', color: FAINT, letterSpacing: '0.6px' }}>
              reads {entry.readsMessageId}
            </span>
          )}
          {clip ? (
            <Check size={13} color={GREEN} />
          ) : (
            <span style={{ fontSize: '10px', color: AMBER, fontWeight: 700 }}>MISSING</span>
          )}
        </div>
        <div
          style={{
            color: MUTED,
            fontSize: '12.5px',
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={entry.scriptLine}
        >
          {entry.scriptLine}
        </div>
        {!clip && entry.notYetRecorded && (
          <div style={{ color: FAINT, fontSize: '11px', marginTop: '3px', fontStyle: 'italic' }}>
            {entry.notYetRecorded}
          </div>
        )}
      </div>

      {/* Metadata */}
      {clip && (
        <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '90px' }}>
          <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>
            {formatSeconds(clip.durationSeconds)}
          </div>
          <div style={{ color: FAINT, fontSize: '11px' }}>{formatSize(clip.sizeBytes)}</div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isBusy}
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.8px',
            color: BLUE,
            background: 'rgba(55,181,255,0.1)',
            border: '1px solid rgba(55,181,255,0.25)',
            borderRadius: '7px',
            padding: '6px 11px',
            cursor: isBusy ? 'not-allowed' : 'pointer',
          }}
        >
          {clip ? 'REPLACE' : 'UPLOAD'}
        </button>
        {clip && (
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            disabled={isBusy}
            aria-label={`Remove ${entry.id}`}
            style={{
              background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: '7px',
              padding: '6px 9px',
              cursor: isBusy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Trash2 size={13} color="#f87171" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.m4a"
          hidden
          onChange={event => {
            onUpload(entry.id, event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <AdminRoute>
      <CoachAudioAdminPage />
    </AdminRoute>
  );
}
