'use client';

import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

function DepartmentStatus({ departmentName, status, actionAt, rejectionReason }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const normalized = status === 'in_progress' ? 'pending' : status;
    switch (normalized) {
      case 'approved':
        return `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-green-900/30 text-green-300' : 'bg-green-200 text-green-900'}`;
      case 'rejected':
        return `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-red-900/30 text-red-300' : 'bg-red-200 text-red-900'}`;
      default:
        return `px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-200 text-amber-900'}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg transition-all duration-700 ease-smooth border gap-3 sm:gap-4
      ${isDark
        ? 'bg-white/[0.02] hover:bg-white/[0.05] border-white/10'
        : 'bg-white hover:bg-gray-50 border-black/5'
      }`}>
      <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
        {getStatusIcon()}
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium truncate transition-colors duration-700 ease-smooth
            ${isDark ? 'text-white' : 'text-ink-black'}`}>
            {departmentName}
          </h4>
          {status === 'rejected' && rejectionReason && (
            <p className={`text-xs mt-1 line-clamp-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              {rejectionReason}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-9 sm:pl-0">
        <span className={getStatusBadge()}>
          {status || 'pending'}
        </span>
        <span className={`text-xs whitespace-nowrap transition-colors duration-700 ease-smooth
          ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
          {formatDate(actionAt)}
        </span>
      </div>
    </div>
  );
}

// Memoize for performance (safe for real-time - props change triggers update)
export default React.memo(DepartmentStatus, (prevProps, nextProps) => {
  return (
    prevProps.departmentName === nextProps.departmentName &&
    prevProps.status === nextProps.status &&
    prevProps.actionAt === nextProps.actionAt &&
    prevProps.rejectionReason === nextProps.rejectionReason
  );
});
