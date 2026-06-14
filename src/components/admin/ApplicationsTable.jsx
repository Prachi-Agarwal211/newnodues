'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import StatusBadge from '@/components/ui/StatusBadge';
import { DepartmentStatusSummary, ExpandedDepartmentDetails } from './DepartmentStatusDisplay';
import { RefreshCw, ChevronRight, ChevronDown, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import { realtimeManager } from '@/lib/realtimeManager';

export default function ApplicationsTable({ applications: initialApplications, currentPage, totalPages, totalItems, onPageChange }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [applications, setApplications] = useState(initialApplications);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [updatingRows, setUpdatingRows] = useState(new Set());
  const [generatingIds, setGeneratingIds] = useState(new Set());

  const handleGenerateCertificate = async (appId) => {
    setGeneratingIds(prev => new Set(prev).add(appId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Unauthorized');
        return;
      }

      const res = await fetch('/api/admin/certificate/bulk-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ formIds: [appId] })
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Certificate generated successfully');
        setApplications(prev => prev.map(app =>
          app.id === appId
            ? { ...app, certificate_status: 'generated', certificate_generated_at: new Date().toISOString() }
            : app
        ));
      } else {
        toast.error(data.error || 'Failed to generate');
        setApplications(prev => prev.map(app =>
          app.id === appId
            ? { ...app, certificate_status: 'failed' }
            : app
        ));
      }
    } catch (err) {
      console.error(err);
      toast.error('Error generating certificate');
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(appId);
        return next;
      });
    }
  };

  useEffect(() => {
    setApplications(initialApplications);
  }, [initialApplications]);

  useEffect(() => {
    const handleRealtimeUpdate = (event) => {
      if (!event.formIds || event.formIds.length === 0) return;
      const impactedIds = new Set(event.formIds);
      setUpdatingRows(prev => {
        const next = new Set(prev);
        impactedIds.forEach(id => next.add(id));
        return next;
      });
      setTimeout(() => {
        setUpdatingRows(prev => {
          const next = new Set(prev);
          impactedIds.forEach(id => next.delete(id));
          return next;
        });
      }, 2000);
      setApplications(prevApps => {
        return prevApps.map(app => {
          if (!impactedIds.has(app.id)) return app;
          return app;
        });
      });
    };

    const unsubscribe = realtimeManager.subscribe('globalUpdate', handleRealtimeUpdate);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setExpandedRows(new Set());
  }, [applications]);

  const toggleRowExpansion = (appId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(appId)) {
        newSet.delete(appId);
      } else {
        newSet.add(appId);
      }
      return newSet;
    });
  };

  // Format date as "26 Jan 2026"
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Check if table is empty
  const isEmpty = !applications || applications.length === 0;

  return (
    <div className={`
      rounded-xl overflow-hidden transition-all duration-200 border
      ${isDark
        ? 'bg-white/[0.04] border-red-900/40'
        : 'bg-white border-red-100'
      }
    `}>
      {/* Header */}
      <div className={`px-4 py-3 border-b ${isDark ? 'bg-red-950/40 border-red-900/40' : 'bg-red-50/80 border-red-100'}`}>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`}>
          Recent Applications
        </h3>
      </div>

      {isEmpty ? (
        <div className={`p-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No applications found</p>
          <p className="text-xs opacity-60 mt-1">New applications will appear here</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-red-200 dark:scrollbar-thumb-red-900 scrollbar-track-transparent">
            <table className="min-w-[1000px] w-full">
              <thead className={`${isDark ? 'bg-red-950/40 border-red-900/40' : 'bg-red-50/80 border-red-100'} border-b`}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200 w-12">Expand</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Reg. No</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Course</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Dept. Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Certificate</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-200 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100 dark:divide-red-900/30 text-gray-600 dark:text-gray-300">
                {applications.map((app) => {
                  const isExpanded = expandedRows.has(app.id);
                  return (
                    <React.Fragment key={app.id}>
                      <tr className={`group transition-colors duration-200 gpu-accelerated ${updatingRows.has(app.id) ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-red-50 dark:hover:bg-red-950/30'}`}>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleRowExpansion(app.id)}
                            className={`
                              p-2 rounded-lg transition-all duration-200 
                              flex items-center justify-center
                              ${isExpanded
                                ? 'bg-jecrc-red/10 text-jecrc-red dark:text-jecrc-red-bright'
                                : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-600 dark:hover:text-gray-300'
                              }
                            `}
                            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium text-gray-900 dark:text-white group-hover:text-jecrc-red dark:group-hover:text-jecrc-red-light transition-colors">
                          <div className="flex items-center gap-2">
                            {app.student_name}
                            {app.is_reapplication && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30">
                                <RefreshCw className="w-3 h-3" />
                                Reapplied
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm font-mono text-gray-600 dark:text-gray-300">{app.registration_no}</td>
                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {app.course && app.course !== 'N/A' ? app.course : '—'}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={app.status} />
                            {app.reapplication_count > 0 && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({app.reapplication_count}×)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <DepartmentStatusSummary departmentStatuses={app.no_dues_status || []} />
                        </td>
                        <td className="px-4 py-4">
                          {app.status === 'completed' ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`
                                inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                                ${ (app.certificate_status === 'generated' || app.certificate_url)
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : app.certificate_status === 'failed'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                }
                              `}>
                                {app.certificate_status || (app.certificate_url ? 'generated' : 'pending')}
                              </span>
                              {(app.certificate_url) && (
                                <a
                                  href={app.certificate_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className={`
                                    p-1.5 rounded transition-colors inline-flex items-center
                                    ${isDark
                                      ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                                    }
                                  `}
                                  title="Download / View Certificate"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {(!app.certificate_url && (app.certificate_status === 'pending' || app.certificate_status === 'failed' || !app.certificate_status)) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateCertificate(app.id);
                                  }}
                                  disabled={generatingIds.has(app.id)}
                                  className={`
                                    p-1.5 rounded transition-colors
                                    ${isDark
                                      ? 'bg-white/10 hover:bg-white/20 text-gray-300'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                    }
                                    disabled:opacity-50
                                  `}
                                  title={app.certificate_status === 'failed' ? 'Retry Generation' : 'Generate Certificate'}
                                >
                                  <RefreshCw className={`w-3.5 h-3.5 ${generatingIds.has(app.id) ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(app.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => window.location.href = `/admin/request/${app.id}`}
                            className={`
                              px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                              ${isDark
                                ? 'text-jecrc-red-bright hover:bg-jecrc-red/10'
                                : 'text-jecrc-red hover:bg-jecrc-red/10'
                              }
                            `}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan="9" className="px-4 py-4 bg-red-50/70 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30">
                            <div className="animate-fade-in">
                              <ExpandedDepartmentDetails departments={app.no_dues_status} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-red-100 dark:border-red-900/30 gap-3 bg-red-50/70 dark:bg-red-950/30">
            <div className="text-sm text-gray-600 dark:text-gray-400 order-2 sm:order-1">
              Page <span className="font-semibold text-gray-900 dark:text-white">{currentPage}</span> of <span className="font-semibold text-gray-900 dark:text-white">{totalPages}</span>
              <span className="mx-2 opacity-50">•</span>
              <span className="opacity-70">{totalItems} total</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="flex-1 sm:flex-none px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="flex-1 sm:flex-none px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-all bg-jecrc-red hover:bg-jecrc-red-dark text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Missing import for FileText icon
import { FileText } from 'lucide-react';
