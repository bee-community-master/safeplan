import { afterEach, describe, expect, it, vi } from 'vitest';
import { contentSecurityPolicy } from '../../middleware';

describe('security middleware CSP', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('allows Toss SDK network calls while keeping iframe payment windows disabled', () => {
    vi.stubEnv('APP_ENV', 'production');
    const csp = contentSecurityPolicy();

    expect(csp).toContain("script-src 'self' 'unsafe-inline' https://js.tosspayments.com");
    expect(csp).toContain("connect-src 'self' https://*.tosspayments.com");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain("form-action 'self' https://*.tosspayments.com");
  });
});
