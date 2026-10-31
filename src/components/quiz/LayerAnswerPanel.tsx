'use client';

/**
 * Support Layer 4: the answer is shown (Knowledge Check Layers, Phase 2).
 *
 * The goalie has missed a question on every layer, so instead of asking again
 * the panel shows the answer, in Michael's words where he wrote them, with his
 * photo if he added one. Nothing is marked down: the question simply comes back
 * in the next round.
 *
 * Sits in the panel below the picture, like every freeze-point panel.
 */

import { Lightbulb } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { VideoQuizQuestion } from '@/types';

interface LayerAnswerPanelProps {
  question: VideoQuizQuestion;
  /** The answer in words: Michael's Layer 4 text, or the explanation. */
  answerText?: string;
  answerImageUrl?: string;
  onContinue: () => void;
}

/** The right option(s) in words, for a question with no written answer. */
function correctAnswerInWords(question: VideoQuizQuestion): string | undefined {
  if (question.type === 'multiple_choice') {
    const right = question.options?.filter(option => option.isCorrect).map(option => option.text);
    return right && right.length > 0 ? right.join(', ') : undefined;
  }
  if (question.type === 'true_false' && question.correctAnswer !== undefined) {
    return String(question.correctAnswer) === 'true' ? 'True' : 'False';
  }
  if (question.type === 'fill_in_blank' && question.correctAnswers?.length) {
    return question.correctAnswers.join(', ');
  }
  return undefined;
}

export function LayerAnswerPanel({ question, answerText, answerImageUrl, onContinue }: LayerAnswerPanelProps) {
  const rightAnswer = correctAnswerInWords(question);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="shadow-lg">
        <CardHeader className="border-b py-4">
          <div className="mb-2">
            <Badge className="text-xs bg-amber-100 text-amber-900 hover:bg-amber-100">Support Layer 4: the answer</Badge>
          </div>
          <CardTitle className="text-xl leading-tight">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {rightAnswer && (
            <p className="text-base font-semibold text-emerald-700">Answer: {rightAnswer}</p>
          )}
          {answerText && (
            <div className="flex gap-3 rounded-lg bg-amber-50 p-3">
              <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <p className="text-base leading-relaxed text-slate-700">{answerText}</p>
            </div>
          )}
          {answerImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- an admin-supplied link on any host
            <img src={answerImageUrl} alt="" className="max-h-48 w-full rounded-md object-contain bg-slate-100" />
          )}
          <p className="text-sm text-slate-500">This one comes back in the next round, so it sticks.</p>
          <Button onClick={onContinue} className="w-full bg-red-600 text-white hover:bg-red-700" size="lg">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
