import { rateLimit, RATE_LIMITS, clearAllRateLimits, getStoreSize } from '@/lib/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  function createRequest(ip = '127.0.0.1') {
    return {
      headers: new Map([['x-forwarded-for', ip]]),
    };
  }

  it('allows first request', async () => {
    const result = await rateLimit(createRequest(), RATE_LIMITS.DEFAULT);
    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('blocks requests exceeding limit', async () => {
    const config = { maxRequests: 3, windowMs: 60000, message: 'Too many' };
    const req = createRequest();

    // First 3 should succeed
    for (let i = 0; i < 3; i++) {
      const result = await rateLimit(req, config);
      expect(result.success).toBe(true);
    }

    // 4th should fail
    const result = await rateLimit(req, config);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Too many');
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('different IPs have separate limits', async () => {
    const config = { maxRequests: 1, windowMs: 60000, message: 'Too many' };

    const result1 = await rateLimit(createRequest('1.1.1.1'), config);
    expect(result1.success).toBe(true);

    const result2 = await rateLimit(createRequest('2.2.2.2'), config);
    expect(result2.success).toBe(true);
  });

  it('resets after window expires', async () => {
    const config = { maxRequests: 1, windowMs: 500, message: 'Too many' };
    const req = createRequest();

    const result1 = await rateLimit(req, config);
    expect(result1.success).toBe(true);

    const result2 = await rateLimit(req, config);
    expect(result2.success).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 600));

    const result3 = await rateLimit(req, config);
    expect(result3.success).toBe(true);
  });

  it('tracks store size', () => {
    expect(getStoreSize()).toBe(0);
  });

  it('uses user identifier instead of IP when provided', async () => {
    const config = { maxRequests: 1, windowMs: 60000, message: 'Too many' };
    const req = createRequest();

    const result1 = await rateLimit(req, config, 'user-123');
    expect(result1.success).toBe(true);

    const result2 = await rateLimit(req, config, 'user-123');
    expect(result2.success).toBe(false);
  });

  it('uses RATE_LIMITS.SUBMIT config correctly', async () => {
    const req = createRequest();
    const result = await rateLimit(req, RATE_LIMITS.SUBMIT);
    expect(result).toHaveProperty('success');
  });
});
