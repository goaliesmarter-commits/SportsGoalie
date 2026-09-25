import { redirect } from 'next/navigation';

/**
 * The intro screen for the retired 28-question / 7-category assessment lived
 * here. That system was replaced by the Student Baseline Profile questionnaire
 * at /onboarding (74 questions, 8 sections), and this page's wording
 * contradicted it. The route only remains so old direct links keep working.
 */
export default function GoalieOnboardingStartPage() {
  redirect('/onboarding');
}
