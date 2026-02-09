'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatusBadge from '@/components/ui/StatusBadge';

export default function AdminRequestDetail() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRequestDetail();
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/staff/login');
        return;
      }

      // Verify user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        router.push('/unauthorized');
        return;
      }

      const { data, error } = await supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status (
            id,
            department_name,
            status,
            action_at,
            action_by_user_id,
            rejection_reason,
            profiles (
              full_name
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Calculate response times
      const requestWithMetrics = {
        ...data,
        no_dues_status: data.no_dues_status.map(status => ({
          ...status,
          response_time: calculateResponseTime(data.created_at, status.created_at, status.action_at)
        }))
      };

      setRequest(requestWithMetrics);
    } catch (err) {
      console.error('Error fetching request detail:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateResponseTime = (formCreated, statusCreated, actionAt) => {
    if (!actionAt) return 'Pending';
    
    const created = new Date(statusCreated);
    const action = new Date(actionAt);
    const diff = action - created;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-red-300 mb-4">Error Loading Request</h2>
          <p className="text-red-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-gray-300 mb-4">Request Not Found</h2>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 sm:p-6 md:p-8 transition-colors duration-700 ${
      isDark ? 'text-white' : 'text-ink-black'
    }`}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className={`px-4 py-2 rounded-lg mb-6 transition-colors duration-300 ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
            }`}
          >
            ← Back to Dashboard
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className={`text-2xl font-bold transition-colors duration-700 ${
                isDark ? 'text-white' : 'text-ink-black'
              }`}>
                Request Details
              </h1>
              <p className={`transition-colors duration-700 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                ID: {request.id}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={request.status} />
            </div>
          </div>
        </div>

        {/* Student Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className={`backdrop-blur-sm rounded-xl border p-6 transition-colors duration-700 ${
            isDark
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/60 border-black/10'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Student Information
            </h2>
            <div className="space-y-3">
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Name:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.student_name}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Registration No:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.registration_no}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Email:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.personal_email || request.college_email || 'N/A'}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Course:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.course || 'N/A'}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Branch:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.branch || 'N/A'}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>School:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.school}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Academic Period:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.admission_year} (Admission) - {request.passing_year} (Passing)</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Parent Name:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.parent_name || 'N/A'}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Contact:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{request.contact_no || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Request Details */}
          <div className={`backdrop-blur-sm rounded-xl border p-6 transition-colors duration-700 ${
            isDark
              ? 'bg-gray-800/50 border-gray-700'
              : 'bg-white/60 border-black/10'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 transition-colors duration-700 ${
              isDark ? 'text-white' : 'text-ink-black'
            }`}>
              Request Details
            </h2>
            <div className="space-y-3">
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Status:</span>
                <div className="mt-1">
                  <StatusBadge status={request.status} />
                </div>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Submitted:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{new Date(request.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className={`text-sm transition-colors duration-700 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>Last Updated:</span>
                <p className={`font-medium transition-colors duration-700 ${
                  isDark ? 'text-white' : 'text-ink-black'
                }`}>{new Date(request.updated_at).toLocaleString()}</p>
              </div>
              {request.alumniProfileLink && (
                <div>
                  <span className={`text-sm transition-colors duration-700 ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>Alumni Screenshot:</span>
                  <div className="mt-2">
                    <img
                      src={request.alumniProfileLink}
                      alt="Alumni verification"
                      className={`max-w-xs h-auto rounded-lg border transition-colors duration-700 ${
                        isDark ? 'border-gray-600' : 'border-gray-300'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Department Status */}
        <div className={`backdrop-blur-sm rounded-xl border p-6 mb-8 transition-colors duration-700 ${
          isDark
            ? 'bg-gray-800/50 border-gray-700'
            : 'bg-white/60 border-black/10'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 transition-colors duration-700 ${
            isDark ? 'text-white' : 'text-ink-black'
          }`}>
            Department Status
          </h2>
          <div className="overflow-x-auto">
            <table className={`min-w-full divide-y transition-colors duration-700 ${
              isDark ? 'divide-gray-700' : 'divide-gray-300'
            }`}>
              <thead>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>Department</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>Status</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>Response Time</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>Action By</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>Reason for Rejection</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-700 ${
                    isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                  }`}>Updated</th>
                </tr>
              </thead>
              <tbody className={`divide-y transition-colors duration-700 ${
                isDark ? 'divide-gray-700' : 'divide-gray-300'
              }`}>
                {request.no_dues_status.map((status, index) => (
                  <tr key={index}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>{status.department_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={status.status} />
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>{status.response_time}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>{status.profiles?.full_name || 'N/A'}</td>
                    <td className={`px-6 py-4 text-sm transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {status.status === 'rejected' && status.rejection_reason ? status.rejection_reason : 'N/A'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-700 ${
                      isDark ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {status.action_at ? new Date(status.action_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => window.print()}
            className={`px-6 py-2 rounded-lg transition-colors duration-300 ${
              isDark
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-ink-black'
            }`}
          >
            Print Report
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}