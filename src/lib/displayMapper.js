/**
 * PROFESSIONAL DISPLAY NAME MAPPER
 * Single source of truth for all display names across the application
 * Usage: import { getDepartmentDisplay, getStatusDisplay } from '@/lib/displayMapper'
 */

// ============================================================================
// DEPARTMENT NAMES MAPPER
// ============================================================================
export const DEPARTMENT_NAMES = {
  'school_hod': 'School Dean / HOD',
  'library': 'Central Library',
  'it_department': 'IT Services',
  'hostel': 'Hostel Management',
  'accounts_department': 'Accounts & Finance',
  'registrar': 'Office of the Registrar',
  'alumni_association': 'Alumni Relations'
};

// Short form for mobile/compact views
export const DEPARTMENT_SHORT_NAMES = {
  'school_hod': 'Dean/HOD',
  'library': 'Library',
  'it_department': 'IT',
  'hostel': 'Hostel',
  'accounts_department': 'Accounts',
  'registrar': 'Registrar',
  'alumni_association': 'Alumni'
};

// ============================================================================
// STATUS DISPLAY MAPPER
// ============================================================================
export const STATUS_DISPLAY = {
  'pending': { label: 'Pending Review', color: 'yellow', icon: '⏳' },
  'approved': { label: 'Completed', color: 'green', icon: '✅' },
  'rejected': { label: 'Rejected', color: 'red', icon: '❌' },
  'completed': { label: 'Completed', color: 'blue', icon: '🎓' }
};

// ============================================================================
// PRIORITY DISPLAY MAPPER
// ============================================================================
export const PRIORITY_DISPLAY = {
  'low': { label: 'Low Priority', color: 'gray', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100' },
  'medium': { label: 'Normal', color: 'blue', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100' },
  'high': { label: 'High Priority', color: 'orange', badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100' },
  'urgent': { label: 'Urgent', color: 'red', badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get professional department display name
 * @param {string} technicalName - Database name (e.g., 'school_hod')
 * @param {boolean} short - Use short form for mobile
 * @returns {string} Professional display name
 */
export function getDepartmentDisplay(technicalName, short = false) {
  if (!technicalName) return 'Unknown Department';
  const mapper = short ? DEPARTMENT_SHORT_NAMES : DEPARTMENT_NAMES;
  return mapper[technicalName] || technicalName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get status display with styling info
 * @param {string} status - Database status
 * @returns {object} { label, color, icon }
 */
export function getStatusDisplay(status) {
  if (!status) return { label: 'Unknown', color: 'gray', icon: '❓' };
  return STATUS_DISPLAY[status.toLowerCase()] || { label: status, color: 'gray', icon: '•' };
}

/**
 * Get priority display with styling
 * @param {string} priority - Priority level
 * @returns {object} { label, color, badge }
 */
export function getPriorityDisplay(priority) {
  if (!priority) return PRIORITY_DISPLAY.medium;
  return PRIORITY_DISPLAY[priority.toLowerCase()] || PRIORITY_DISPLAY.medium;
}

/**
 * Format school name for display
 * @param {string} schoolName - Full school name
 * @param {boolean} short - Abbreviate if too long
 * @returns {string} Formatted school name
 */
export function getSchoolDisplay(schoolName, short = false) {
  if (!schoolName) return 'School Not Specified';

  if (short && schoolName.length > 40) {
    // Abbreviate long names: "School of Engineering & Technology" → "SOE&T"
    return schoolName
      .split(' ')
      .filter(word => word[0] && word[0] === word[0].toUpperCase())
      .map(word => word[0])
      .join('');
  }

  return schoolName;
}

/**
 * Get user-friendly date display
 * @param {string|Date} dateString - ISO date string
 * @param {boolean} relative - Show relative time (e.g., "2 hours ago")
 * @returns {string} Formatted date
 */
export function getDateDisplay(dateString, relative = false) {
  if (!dateString) return 'Date not available';

  const date = new Date(dateString);

  if (relative) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Batch transform department data for display
 * @param {Array} departments - Array of department objects
 * @returns {Array} Transformed with display names
 */
export function transformDepartmentsForDisplay(departments) {
  if (!Array.isArray(departments)) return [];

  return departments.map(dept => ({
    ...dept,
    displayName: getDepartmentDisplay(dept.name || dept.department_name),
    shortName: getDepartmentDisplay(dept.name || dept.department_name, true),
    statusDisplay: getStatusDisplay(dept.status),
    dateDisplay: getDateDisplay(dept.action_at || dept.updated_at, true)
  }));
}

/**
 * Transform form data for professional display
 * @param {object} form - Raw form data from database
 * @returns {object} Transformed with display-ready fields
 */
export function transformFormForDisplay(form) {
  if (!form) return null;

  return {
    ...form,
    schoolDisplay: getSchoolDisplay(form.school),
    statusDisplay: getStatusDisplay(form.status),
    submittedDate: getDateDisplay(form.created_at),
    lastUpdated: getDateDisplay(form.updated_at, true)
  };
}