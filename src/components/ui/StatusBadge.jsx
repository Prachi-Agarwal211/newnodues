'use client';

import React from 'react';

/**
 * StatusBadge - Consistent status indicator with proper theming
 * Uses high-contrast colors for both light and dark modes
 *
 * @param {string} status - Status type (pending, approved, rejected, etc.)
 * @param {string} className - Additional classes
 */
function StatusBadge({ status, className = "" }) {

  // High-contrast status color configurations
  const statusClasses = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
    rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700',
    in_progress: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
    completed: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
    reapplied: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
    screenshot_uploaded: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  };

  const statusLabels = {
    in_progress: 'Pending',
  };

  const classes = statusClasses[status] || 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';

  const label = statusLabels[status] || (status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '));

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 border text-xs font-semibold transition-all duration-200 ${classes} ${className}`}
    >
      {label}
    </span>
  );
}

export default React.memo(StatusBadge);