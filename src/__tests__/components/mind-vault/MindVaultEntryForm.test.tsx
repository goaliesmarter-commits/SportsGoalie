import { describe, it, expect, vi, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { MindVaultEntryForm } from '@/components/mind-vault/MindVaultEntryForm';

/**
 * Typing into the entry box and dictating into it report through the same callback, so every
 * typed entry used to be saved, and shown on its card, as "Voice".
 */

afterEach(cleanup);

describe('MindVaultEntryForm', () => {
  it('saves a typed entry as text, not voice', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<MindVaultEntryForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: /add entry/i }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'I read the play, then react.' } });
    fireEvent.click(screen.getByRole('button', { name: /save to vault/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith('I read the play, then react.', false);
  });
});
