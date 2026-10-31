/**
 * Admin → Knowledge Layers: rules that make no sense are refused before Save,
 * as Coach Mike's testing report (31 Oct 2026) asked.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/lib/auth/context', () => ({
  useAuth: () => ({ user: { id: 'admin-1', role: 'admin' }, loading: false }),
}));

vi.mock('@/components/auth/protected-route', () => ({
  AdminRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/skeletons', () => ({
  SkeletonDarkPage: () => <div data-testid="skeleton" />,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/lib/database/services/layer-rules.service', async () => {
  const { DEFAULT_LAYER_RULES } = await import('@/types/knowledge-layers');
  return {
    layerRulesService: {
      getRules: vi.fn(async () => ({ success: true, data: DEFAULT_LAYER_RULES })),
      saveRules: vi.fn(async (rules: unknown) => ({ success: true, data: rules })),
    },
  };
});

import KnowledgeLayersPage from '../../../../app/admin/knowledge-layers/page';
import { layerRulesService } from '@/lib/database/services/layer-rules.service';

async function openPage() {
  render(<KnowledgeLayersPage />);
  await screen.findByLabelText('Support Layer 2 speed');
}

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('Knowledge Layers rules page', () => {
  beforeEach(() => vi.mocked(layerRulesService.saveRules).mockClear());

  it('refuses a Layer 2 "slow" replay at 2× and 0 misses, with Save off', async () => {
    await openPage();
    type('Support Layer 2 speed', '2');
    type('Misses on Layer 3 before the answer', '0');

    expect(screen.getByText('Use a number from 0.25 to 0.95.')).toBeInTheDocument();
    expect(screen.getByText('Use a number from 1 to 10.')).toBeInTheDocument();
    expect(screen.getByLabelText('Support Layer 2 speed')).toHaveAttribute('aria-invalid', 'true');

    const save = screen.getByRole('button', { name: /Save rules/ });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(layerRulesService.saveRules).not.toHaveBeenCalled();
  });

  it('refuses Layer 3 that is not slower than Layer 2', async () => {
    await openPage();
    type('Support Layer 3 speed', '0.5');
    expect(screen.getByText('Layer 3 must be slower than Layer 2 (below 0.5×).')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save rules/ })).toBeDisabled();
  });

  it('turns Save back on once the values make sense, and saves them', async () => {
    await openPage();
    type('Support Layer 2 speed', '2');
    expect(screen.getByRole('button', { name: /Save rules/ })).toBeDisabled();
    type('Support Layer 2 speed', '0.6');
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Save rules/ }));
    await waitFor(() => expect(layerRulesService.saveRules).toHaveBeenCalledTimes(1));
    expect(vi.mocked(layerRulesService.saveRules).mock.calls[0][0]).toMatchObject({ layer2Speed: 0.6 });
  });
});
