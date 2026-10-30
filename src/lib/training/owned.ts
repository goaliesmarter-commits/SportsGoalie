import { finishedTakeDate } from '@/lib/training/attempt-streak';

/**
 * The one rule for "this skill is done": it is OWNED.
 *
 * Every graded question has been answered right at least once, on any take. Taking the
 * Knowledge Check is not enough, and a wrong answer is not a mark against the goalie:
 * a skill simply stays open until each question has been got right.
 *
 * Until now "done" was decided five different ways (any take, the latest score, a 70%
 * pass mark, a `passed` field nothing writes, the take's own finished flag), and every
 * one of them counted "took it" as "done", so a skill at 0% read as complete (item 2 of
 * Michael's 4 Oct run). Everything that says done, or is a count of done, reads this.
 */

interface AnswerLike {
  questionId?: string | null;
  isCorrect?: boolean | null;
  reflective?: boolean | null;
}

export interface OwnableAttempt {
  videoQuizId?: string | null;
  skillId?: string | null;
  percentage?: number | null;
  score?: number | null;
  maxScore?: number | null;
  questionsAnswered?: AnswerLike[] | null;
  completedAt?: unknown;
  submittedAt?: unknown;
}

function gradedAnswers(attempt: OwnableAttempt): AnswerLike[] {
  const answers = Array.isArray(attempt.questionsAnswered) ? attempt.questionsAnswered : [];
  // A reflective answer has no right or wrong ("Did that feel balanced?"), so it is
  // never something the goalie has to get right.
  return answers.filter((answer) => answer && answer.reflective !== true && !!answer.questionId);
}

function hasAnswerDetail(attempt: OwnableAttempt): boolean {
  return Array.isArray(attempt.questionsAnswered) && attempt.questionsAnswered.length > 0;
}

function percentageOf(attempt: OwnableAttempt): number {
  if (typeof attempt.percentage === 'number' && Number.isFinite(attempt.percentage)) {
    return attempt.percentage;
  }
  if (typeof attempt.score === 'number' && attempt.maxScore) {
    return (attempt.score / attempt.maxScore) * 100;
  }
  return 0;
}

function timeOf(attempt: OwnableAttempt): number {
  return finishedTakeDate(attempt as Parameters<typeof finishedTakeDate>[0])?.getTime() ?? 0;
}

/** Newest first. Takes with no date keep the order they came in. */
function newestFirst(attempts: OwnableAttempt[]): OwnableAttempt[] {
  return attempts
    .map((attempt, index) => ({ attempt, index, time: timeOf(attempt) }))
    .sort((a, b) => b.time - a.time || a.index - b.index)
    .map((entry) => entry.attempt);
}

/**
 * Whether the takes of ONE Knowledge Check own it.
 *
 * The questions to get right are the ones in the most recent take, so a question added
 * or removed since an old take is judged against the quiz as it was last taken. A take
 * with no per-question record (older data) falls back to "any take at 100%", which says
 * the same thing without needing the detail.
 */
export function quizIsOwned(attempts: OwnableAttempt[]): boolean {
  if (attempts.length === 0) return false;

  const ordered = newestFirst(attempts);
  const latest = ordered[0];

  if (!hasAnswerDetail(latest)) {
    return ordered.some((attempt) => percentageOf(attempt) >= 100);
  }

  const required = gradedAnswers(latest).map((answer) => answer.questionId as string);
  // Nothing in it is graded, so there is nothing to get wrong: finishing it is the job.
  if (required.length === 0) return true;

  const answeredRight = new Set<string>();
  for (const attempt of ordered) {
    for (const answer of gradedAnswers(attempt)) {
      if (answer.isCorrect === true) answeredRight.add(answer.questionId as string);
    }
  }
  return required.every((id) => answeredRight.has(id));
}

function groupBySkill(attempts: OwnableAttempt[]): Map<string, Map<string, OwnableAttempt[]>> {
  const bySkill = new Map<string, Map<string, OwnableAttempt[]>>();

  for (const attempt of attempts) {
    if (!attempt.skillId) continue;
    const quizKey = attempt.videoQuizId || '__no_quiz__';

    let quizzes = bySkill.get(attempt.skillId);
    if (!quizzes) {
      quizzes = new Map();
      bySkill.set(attempt.skillId, quizzes);
    }
    const takes = quizzes.get(quizKey);
    if (takes) takes.push(attempt);
    else quizzes.set(quizKey, [attempt]);
  }

  return bySkill;
}

/** Skills the goalie has taken at least one finished check for, owned or not. */
export function attemptedSkillIds(attempts: OwnableAttempt[]): Set<string> {
  return new Set(groupBySkill(attempts).keys());
}

/**
 * Skills the goalie owns: every Knowledge Check they have taken under the skill is owned.
 * A skill nobody has taken a check for is not in the set.
 */
export function ownedSkillIds(attempts: OwnableAttempt[]): Set<string> {
  const owned = new Set<string>();

  for (const [skillId, quizzes] of groupBySkill(attempts)) {
    if ([...quizzes.values()].every((takes) => quizIsOwned(takes))) {
      owned.add(skillId);
    }
  }
  return owned;
}

/**
 * A pillar is complete once it has skills and the goalie owns every one of them. A pillar
 * with no skills is never complete, so an empty one cannot count towards a goal.
 */
export function pillarIsComplete(skillIds: string[], owned: Set<string>): boolean {
  return skillIds.length > 0 && skillIds.every((id) => owned.has(id));
}

/**
 * The day each skill first became owned, for "skills done over time" and the date a
 * coach sees against a finished skill. Takes are replayed oldest first.
 */
export function skillOwnedDates(attempts: OwnableAttempt[]): Map<string, Date> {
  const dated = attempts
    .map((attempt) => ({ attempt, date: finishedTakeDate(attempt as Parameters<typeof finishedTakeDate>[0]) }))
    .filter((entry): entry is { attempt: OwnableAttempt; date: Date } => entry.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const ownedOn = new Map<string, Date>();
  const soFar: OwnableAttempt[] = [];

  for (const { attempt, date } of dated) {
    soFar.push(attempt);
    const skillId = attempt.skillId;
    if (!skillId || ownedOn.has(skillId)) continue;

    const forSkill = soFar.filter((candidate) => candidate.skillId === skillId);
    if (ownedSkillIds(forSkill).has(skillId)) {
      ownedOn.set(skillId, date);
    }
  }

  return ownedOn;
}
