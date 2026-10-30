import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { createAuthErrorResponse } from '@/lib/auth/server-validation';

describe('createAuthErrorResponse', () => {
  it('sends the message as a plain string so a page can show it in a toast', async () => {
    const response = createAuthErrorResponse(
      { code: 'INSUFFICIENT_PERMISSIONS', message: 'Admin access is required for this resource' },
      401,
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(typeof body.error).toBe('string');
    expect(body.error).toBe('Admin access is required for this resource');
  });

  it('keeps the machine-readable code beside the message', async () => {
    const response = createAuthErrorResponse({ code: 'TOKEN_EXPIRED', message: 'Authentication token has expired' });
    const body = await response.json();

    expect(body.code).toBe('TOKEN_EXPIRED');
    expect(response.status).toBe(401);
  });
});
