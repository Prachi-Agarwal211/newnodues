/**
 * @jest-environment node
 */
import {
  getBaseUrl,
  APP_URLS,
  getFullUrl,
  EMAIL_URLS,
  getDepartmentDashboardUrl,
  getRoleDashboardUrl,
  sanitizeRedirectUrl,
  isExternalUrl,
} from '@/lib/urlHelper';

describe('getBaseUrl', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns localhost in development', () => {
    process.env.NODE_ENV = 'development';
    expect(getBaseUrl()).toBe('http://localhost:3000');
  });

  it('returns production URL when not development', () => {
    // Note: in test environment, NODE_ENV is 'test', not 'development'
    // So getBaseUrl falls to the production URL
    delete process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    expect(getBaseUrl()).toContain('reverbex.in');
  });
});

describe('APP_URLS', () => {
  it('has all expected page paths', () => {
    expect(APP_URLS.HOME).toBe('/');
    expect(APP_URLS.STUDENT_SUBMIT_FORM).toBe('/student/submit-form');
    expect(APP_URLS.STAFF_LOGIN).toBe('/staff/login');
    expect(APP_URLS.VERIFY_CERTIFICATE('abc')).toBe('/verify/abc');
    expect(APP_URLS.STAFF_RESET_PASSWORD('tok')).toBe('/staff/reset-password?token=tok');
  });

  it('has API endpoints', () => {
    expect(APP_URLS.API.STUDENT_SUBMIT).toBe('/api/student');
    expect(APP_URLS.API.CERTIFICATE_VERIFY).toBe('/api/certificate/verify');
  });
});

describe('getFullUrl', () => {
  it('creates absolute URL from relative path', () => {
    const url = getFullUrl('/api/student');
    // In test env, base is production URL since NODE_ENV=test
    expect(url).toMatch(/^https?:\/\/.+\/api\/student$/);
    expect(url).toContain('/api/student');
  });
});

describe('EMAIL_URLS', () => {
  it('generates certificate verification URL', () => {
    const url = EMAIL_URLS.verifyCertificate('form-123');
    expect(url).toContain('/verify/form-123');
  });

  it('generates student check status URL', () => {
    const url = EMAIL_URLS.studentCheckStatus('22BCAN001');
    expect(url).toContain('/student/check-status?reg=22BCAN001');
  });

  it('generates reset password URL', () => {
    const url = EMAIL_URLS.staffResetPassword('token-xyz');
    expect(url).toContain('token=token-xyz');
  });
});

describe('isExternalUrl', () => {
  it('detects external URLs', () => {
    expect(isExternalUrl('https://google.com')).toBe(true);
  });

  it('detects internal URLs', () => {
    expect(isExternalUrl('/student/submit-form')).toBe(false);
  });
});

describe('sanitizeRedirectUrl', () => {
  it('returns home for null/empty', () => {
    expect(sanitizeRedirectUrl(null)).toBe('/');
    expect(sanitizeRedirectUrl('')).toBe('/');
  });

  it('prevents external redirects', () => {
    expect(sanitizeRedirectUrl('https://evil.com')).toBe('/');
  });

  it('allows internal paths', () => {
    expect(sanitizeRedirectUrl('/admin')).toBe('/admin');
  });

  it('adds leading slash if missing', () => {
    expect(sanitizeRedirectUrl('dashboard')).toBe('/dashboard');
  });
});

describe('getDepartmentDashboardUrl', () => {
  it('returns staff dashboard for null department', () => {
    expect(getDepartmentDashboardUrl(null)).toBe('/staff/dashboard');
  });

  it('creates department slug', () => {
    expect(getDepartmentDashboardUrl('Library Department')).toBe('/department/library-department/dashboard');
  });
});

describe('getRoleDashboardUrl', () => {
  it('returns admin dashboard for admin', () => {
    expect(getRoleDashboardUrl('admin')).toBe('/admin/dashboard');
  });

  it('returns student dashboard for student', () => {
    expect(getRoleDashboardUrl('student')).toBe('/student/dashboard');
  });

  it('returns staff dashboard for library', () => {
    expect(getRoleDashboardUrl('library')).toBe('/staff/dashboard');
  });

  it('returns department dashboard for hod with department', () => {
    const url = getRoleDashboardUrl('hod', 'Library');
    expect(url).toContain('/department/');
  });
});
