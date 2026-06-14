import {
  validateRequiredEnvVars,
  validateOptionalEnvVars,
  validateJWTSecret,
  validateSupabaseConfig,
  validateEmailConfig,
  validateEnvironment,
} from '@/lib/envValidation';

describe('validateRequiredEnvVars', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports missing variables', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.JWT_SECRET;
    const result = validateRequiredEnvVars();
    expect(result.isValid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('reports present variables', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'abc123';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.JWT_SECRET = 'my-secret-key-for-testing-purposes';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'password123';

    const result = validateRequiredEnvVars();
    expect(result.present.length).toBeGreaterThan(0);
  });
});

describe('validateJWTSecret', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('fails on missing secret', () => {
    delete process.env.JWT_SECRET;
    expect(validateJWTSecret().isValid).toBe(false);
  });

  it('fails on short secret', () => {
    process.env.JWT_SECRET = 'short';
    expect(validateJWTSecret().isValid).toBe(false);
  });

  it('passes with long enough secret', () => {
    process.env.JWT_SECRET = 'a'.repeat(32);
    expect(validateJWTSecret().isValid).toBe(true);
  });
});

describe('validateSupabaseConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports missing URL', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const result = validateSupabaseConfig();
    expect(result.isValid).toBe(false);
  });

  it('allows valid config with correct key lengths', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'a'.repeat(40);
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'a'.repeat(40);
    const result = validateSupabaseConfig();
    expect(result.urlConfigured).toBe(true);
  });
});

describe('validateEmailConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('reports missing SMTP', () => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    const result = validateEmailConfig();
    expect(result.isValid).toBe(false);
  });

  it('reports placeholder values', () => {
    process.env.SMTP_USER = 'your-email@gmail.com';
    process.env.SMTP_PASS = 'your-app-password';
    const result = validateEmailConfig();
    expect(result.isValid).toBe(false);
  });
});

describe('validateEnvironment', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns full validation summary', () => {
    const result = validateEnvironment({ logResults: false });
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('warnings');
    expect(result).toHaveProperty('isValid');
  });
});
