import { FormTemplate, PILLARS } from '@/types';

/**
 * Which check-in templates get a card on the Progress Boards page.
 *
 * 'combined' is the full game/practice tracker and belongs to the session flow;
 * a template whose pillar isn't in the taxonomy has nowhere to be listed. The
 * boards page and the Progress page's check-in count both go through this, so
 * the number on one always adds up to the cards on the other.
 */
export function isPillarBoardTemplate(template: Pick<FormTemplate, 'pillar'>): boolean {
  return !!template.pillar
    && template.pillar !== 'combined'
    && PILLARS.some((p) => p.slug === template.pillar);
}

/** Entries that belong to one of the listed boards. */
export function countBoardCheckIns(
  templates: Array<Pick<FormTemplate, 'id' | 'pillar'>>,
  entries: Array<{ formTemplateId?: string }>
): number {
  const boardIds = new Set(templates.filter(isPillarBoardTemplate).map((t) => t.id));
  return entries.filter((e) => !!e.formTemplateId && boardIds.has(e.formTemplateId)).length;
}
