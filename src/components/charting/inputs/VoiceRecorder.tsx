'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Square, Loader2 } from 'lucide-react';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  initialText?: string;
  placeholder?: string;
}

// Extend Window for webkit prefixed SpeechRecognition
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
  resultIndex: number;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  initialText = '',
  placeholder = 'Speak or type your note...',
}: VoiceRecorderProps) {
  const [text, setText] = useState(initialText);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<unknown>(null);

  /**
   * `emittedRef` — the last value we handed up to the parent.
   * `lastPropRef` — the last value the parent handed down.
   *
   * Together they let the sync effect below tell "the parent swapped in a
   * different note" apart from "the parent is echoing back what we just typed".
   */
  const emittedRef = useRef(initialText);
  const lastPropRef = useRef(initialText);

  // Check for Speech Recognition support
  useEffect(() => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
               (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
    }
  }, []);

  /**
   * Adopt `initialText` when the parent genuinely changes it.
   *
   * `useState(initialText)` reads the prop once, so without this the box keeps
   * whatever it was showing when it first mounted. That bit in two places:
   * switching P1 → P2 on the periods screen reuses this same component instance
   * (the tabs swap data, not the tree), so period 1's note stayed on screen and
   * any edit to it then saved into period 2; and the Mind Vault form's
   * post-save `setContent('')` never cleared the box.
   *
   * Gated on the prop actually moving — not just differing from local state —
   * so a parent that lags a render behind our own `onChange` can't stomp on the
   * field mid-keystroke.
   */
  useEffect(() => {
    if (initialText === lastPropRef.current) return;
    lastPropRef.current = initialText;
    if (initialText === emittedRef.current) return;
    setText(initialText);
  }, [initialText]);

  const commit = useCallback((value: string) => {
    emittedRef.current = value;
    onTranscriptionComplete(value);
  }, [onTranscriptionComplete]);

  const startRecording = useCallback(() => {
    const SR = (window as unknown as Record<string, unknown>).SpeechRecognition ||
               (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SR as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    // Dictation appends to whatever is already in the box — typed or spoken
    // earlier — so the two inputs compose instead of overwriting each other.
    let finalTranscript = text.trim() ? `${text.trimEnd()} ` : '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < Object.keys(event.results).length; i++) {
        const result = event.results[i];
        if (result[0]) {
          // Check if result is final by checking the isFinal property
          const resultObj = event.results[i] as unknown as { isFinal: boolean; [index: number]: { transcript: string } };
          if (resultObj.isFinal) {
            finalTranscript += result[0].transcript + ' ';
          } else {
            interim += result[0].transcript;
          }
        }
      }
      setText(finalTranscript + interim);
    };

    recognition.onerror = () => {
      setIsRecording(false);
      setIsProcessing(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setIsProcessing(false);
      const final = finalTranscript.trim();
      if (final) {
        setText(final);
        commit(final);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [text, commit]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
      setIsProcessing(true);
    }
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    commit(newText);
  };

  return (
    <div className="space-y-3">
      {/* Mic button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || !supported}
          className={`
            relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0
            ${isRecording
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30 scale-110'
              : isProcessing
              ? 'bg-white/15 text-white/40'
              : supported
              ? 'bg-white/10 text-white/60 hover:bg-[rgba(55,181,255,0.12)] hover:text-[#37b5ff] hover:shadow-sm'
              : 'bg-white/10 text-white/25 cursor-not-allowed'
            }
          `}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {/* Pulse ring when recording */}
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-red-600/30 animate-ping" />
          )}

          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isRecording ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : supported ? (
            <Mic className="w-4 h-4" />
          ) : (
            <MicOff className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 text-sm">
          {isRecording ? (
            <p className="text-red-400 font-medium">Recording… tap to stop</p>
          ) : isProcessing ? (
            <p className="text-white/50">Processing…</p>
          ) : !supported ? (
            <p className="text-white/40">Voice not available in this browser — type below</p>
          ) : text ? (
            <p className="text-white/50">Tap the mic to add more, or edit below</p>
          ) : (
            <p className="text-white/40">Tap the mic to speak, or just type below</p>
          )}
        </div>
      </div>

      {/*
        The note field is always here and always editable.

        It used to render only once `text` was non-empty, and the only way to
        open it for editing was a pencil button that itself required text — so
        on any browser with speech support there was no way to type a note until
        you had recorded one first. Voice is the fast path, not the only path.
      */}
      <textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-4 py-3 rounded-xl border border-white/12 bg-white/[0.06] text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[rgba(55,181,255,0.3)] focus:border-[rgba(55,181,255,0.6)] resize-none transition-colors"
      />
    </div>
  );
}
