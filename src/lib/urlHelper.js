/**
 * urlHelper.js
 * Centralized URL management for the application
 * Provides consistent URL generation for emails, redirects, and links
 */

// Production URL - HARDCODED for reliability
const PRODUCTION_URL = 'https://jecrc-no-dues-system.reverbex.in';

/**
 * Get the base URL for the application
 * Uses hardcoded production URL, falls back to localhost only in development
 */
export function getBaseUrl() {
  // In development (localhost), use localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }

  // Server-side development check
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  // Always use production URL in production
  return PRODUCTION_URL;
}

/**
 * Application URLs
 * Use these constants throughout the app for consistency
 */
export const APP_URLS = {
  // Base
  BASE: getBaseUrl(),

  // Public pages
  HOME: '/',
  LOGIN: '/login',
  VERIFY_CERTIFICATE: (id) => `/verify/${id}`,

  // Student pages
  STUDENT_LOGIN: '/student/login',
  STUDENT_DASHBOARD: '/student/dashboard',
  STUDENT_SUBMIT_FORM: '/student/submit-form',
  STUDENT_CHECK_STATUS: '/student/check-status',

  // Staff pages - Login required for all staff access
  STAFF_LOGIN: '/staff/login',
  staffLogin: () => getFullUrl('/staff/login'),
  STAFF_DASHBOARD: '/staff/dashboard',
  STAFF_FORGOT_PASSWORD: '/staff/forgot-password',
  STAFF_RESET_PASSWORD: (token) => `/staff/reset-password?token=${token}`,
  staffStudentForm: (formId) => getFullUrl(`/staff/student/${formId}`),

  // Admin pages
  ADMIN_DASHBOARD: '/admin/dashboard',


  // Department pages
  DEPARTMENT_DASHBOARD: (dept) => `/department/${dept}/dashboard`,

  // API endpoints
  API: {
    STUDENT_SUBMIT: '/api/student',
    STUDENT_REAPPLY: '/api/student/reapply',
    STUDENT_STATUS: '/api/student/status',
    STAFF_ACTION: '/api/staff/action',
    STAFF_FORGOT_PASSWORD: '/api/staff/forgot-password',
    STAFF_RESET_PASSWORD: '/api/staff/reset-password',
    DEPARTMENT_ACTION: '/api/department-action',
    ADMIN_STATS: '/api/admin/stats',
    ADMIN_DASHBOARD: '/api/admin/dashboard',
    CERTIFICATE_GENERATE: '/api/certificate/generate',
    CERTIFICATE_VERIFY: '/api/certificate/verify',
    SUPPORT_SUBMIT: '/api/support/submit',

  },

  // Helper functions for API URLs (full URLs needed for fetch)
  certificateGenerateApi: () => getFullUrl('/api/certificate/generate'),
};

/**
 * Generate full URL for a path
 * @param {string} path - Relative path
 * @returns {string} Full URL
 */
export function getFullUrl(path) {
  const base = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Generate email-safe URLs
 * These URLs are used in email templates and must always be absolute
 */
export const EMAIL_URLS = {
  // Student email links
  studentDashboard: () => getFullUrl(APP_URLS.STUDENT_DASHBOARD),
  studentCheckStatus: (registrationNo) => getFullUrl(`${APP_URLS.STUDENT_CHECK_STATUS}?reg=${encodeURIComponent(registrationNo)}`),
  studentSubmitForm: () => getFullUrl(APP_URLS.STUDENT_SUBMIT_FORM),

  // Staff email links - Use /staff/login since authentication required
  staffDashboard: () => getFullUrl(APP_URLS.STAFF_LOGIN),
  staffLogin: () => getFullUrl(APP_URLS.STAFF_LOGIN),
  staffResetPassword: (token) => getFullUrl(APP_URLS.STAFF_RESET_PASSWORD(token)),

  // Department email links
  departmentDashboard: (dept) => getFullUrl(APP_URLS.DEPARTMENT_DASHBOARD(dept)),

  // Certificate verification
  verifyCertificate: (id) => getFullUrl(APP_URLS.VERIFY_CERTIFICATE(id)),

  // Support
  submitSupport: () => getFullUrl('/support'),
};

/**
 * Get department-specific dashboard URL
 * @param {string} department - Department name
 * @returns {string} Department dashboard URL
 */
export function getDepartmentDashboardUrl(department) {
  if (!department) return APP_URLS.STAFF_DASHBOARD;

  const deptSlug = department.toLowerCase().replace(/\s+/g, '-');
  return `/department/${deptSlug}/dashboard`;
}

/**
 * Get role-specific dashboard URL
 * @param {string} role - User role
 * @param {string} department - Department name (optional, for department staff)
 * @returns {string} Dashboard URL
 */
export function getRoleDashboardUrl(role, department = null) {
  switch (role) {
    case 'admin':
    case 'registrar':
      return APP_URLS.ADMIN_DASHBOARD;

    case 'student':
      return APP_URLS.STUDENT_DASHBOARD;

    case 'hod':
    case 'department_staff':
      return department
        ? getDepartmentDashboardUrl(department)
        : APP_URLS.STAFF_DASHBOARD;

    case 'accounts':
    case 'library':
    case 'hostel':
    case 'exam':
    case 'transport':
      return APP_URLS.STAFF_DASHBOARD;

    default:
      return APP_URLS.HOME;
  }
}

/**
 * Check if a URL is external
 * @param {string} url - URL to check
 * @returns {boolean} True if external
 */
export function isExternalUrl(url) {
  try {
    const urlObj = new URL(url, getBaseUrl());
    return urlObj.origin !== new URL(getBaseUrl()).origin;
  } catch {
    return false;
  }
}

/**
 * Sanitize redirect URL to prevent open redirect vulnerabilities
 * @param {string} url - URL to sanitize
 * @returns {string} Safe redirect URL
 */
export function sanitizeRedirectUrl(url) {
  if (!url) return APP_URLS.HOME;

  // Prevent external redirects
  if (isExternalUrl(url)) {
    return APP_URLS.HOME;
  }

  // Ensure URL starts with /
  return url.startsWith('/') ? url : `/${url}`;
}