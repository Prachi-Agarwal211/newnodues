'use client';

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import StatusBadge from '@/components/ui/StatusBadge';

export function DepartmentStatusSummary({ departmentStatuses }) {
  const approved = departmentStatuses.filter(d => d.status === 'approved').length;
  const pending = departmentStatuses.filter(d => d.status === 'pending').length;
  const rejected = departmentStatuses.filter(d => d.status === 'rejected').length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {approved > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          Approved {approved}
        </span>
      )}
      {pending > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pending {pending}
        </span>
      )}
      {rejected > 0 && (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Rejected {rejected}
        </span>
      )}
    </div>
  );
}

export function ExpandedDepartmentDetails({ departments }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm mb-3">Department-wise Status:</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments?.map((dept, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border transition-colors duration-700 ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{dept.department_name}</span>
              <StatusBadge status={dept.status} />
            </div>
            <div className={`text-xs space-y-1 transition-colors duration-700 ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {dept.profiles?.full_name && (
                <div>By: {dept.profiles.full_name}</div>
              )}
              {dept.action_at && (
                <div>On: {new Date(dept.action_at).toLocaleDateString()}</div>
              )}
              {dept.response_time && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Response Time: {dept.response_time}</span>
                </div>
              )}
              {dept.rejection_reason && (
                <div className={`mt-1 ${isDark ? 'text-red-400' : 'text-jecrc-red'}`}>
                  Reason: {dept.rejection_reason}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
