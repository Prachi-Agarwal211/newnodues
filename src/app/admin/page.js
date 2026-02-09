'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import GlassCard from '@/components/ui/GlassCard';
import StatsGrid from '@/components/dashboard/StatsGrid';
import ApplicationsTable from '@/components/admin/ApplicationsTable';
import { RefreshCcw, TrendingUp, Settings, ChevronRight, Clock, Download, MessageSquare, Mail, Shield, Sun, Moon } from 'lucide-react';
import { exportApplicationsToCSV, exportStatsToCSV } from '@/lib/csvExport';
import AmazonStyleFilters from '@/components/admin/AmazonStyleFilters';
import AdminNotificationBell from '@/components/admin/AdminNotificationBell';
import optimizedRealtime from '@/lib/optimizedRealtime';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

// Performance Chart Component - Clean progress bars
const PerformanceBar = ({ label, pending, approved, timeTaken }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const total = pending + approved;
  const approvedPercentage = total > 0 ? (approved / total) * 100 : 0;

  return (
    <div className={`
      p-4 rounded-lg border transition-all duration-300
      ${isDark
        ? 'bg-gray-800 border-gray-700'
        : 'bg-white border-gray-200'
      }
    `}>
      <div className="flex justify-between items-center mb-3 gap-2">
        <h4 className={`font-semibold text-sm capitalize truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {label.replace(/_/g, ' ')}
        </h4>
        <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <Clock className="w-3 h-3" /> {timeTaken || '~24'}h
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium">
          <span className={isDark ? 'text-amber-400' : 'text-amber-600'}>Pending: {pending}</span>
          <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>Cleared: {approved}</span>
        </div>
        <div className={`flex h-2.5 w-full rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="bg-amber-400 transition-all duration-1000 ease-out"
            style={{ width: `${100 - approvedPercentage}%` }}
          />
          <div
            className="bg-emerald-500 transition-all duration-1000 ease-out"
            style={{ width: `${approvedPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default function EnhancedAdminDashboard() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [data, setData] = useState({ overallStats: {}, departmentStats: [] });
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amazonFilters, setAmazonFilters] = useState({});
  const [availableFilters, setAvailableFilters] = useState({
    schools: [],
    courses: [],
    branches: [],
    departments: []
  });
  const [supportStats, setSupportStats] = useState({ total: 0, unread: 0, open: 0 });
  const [emailStats, setEmailStats] = useState({ totalEmails: 0, sentCount: 0, failedCount: 0, successRate: 0 });

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/staff/login'); return; }
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.overallStats) setData(json);
    } catch (e) {
      console.error("Stats Error:", e);
    }
  };

  const fetchAvailableFilters = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [schoolsRes, coursesRes, branchesRes, departmentsRes] = await Promise.all([
        fetch('/api/admin/config/schools', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/config/courses', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/config/branches', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/admin/config/departments', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);
      const [schoolsData, coursesData, branchesData, departmentsData] = await Promise.all([
        schoolsRes.json(), coursesRes.json(), branchesRes.json(), departmentsRes.json()
      ]);
      setAvailableFilters({
        schools: schoolsData.success ? schoolsData.schools || [] : [],
        courses: coursesData.success ? coursesData.courses || [] : [],
        branches: branchesData.success ? branchesData.branches || [] : [],
        departments: departmentsData.success ? departmentsData.departments || [] : []
      });
    } catch (e) {
      console.error("Available filters error:", e);
    }
  };

  const handleAmazonFiltersChange = (filters) => {
    setAmazonFilters(filters);
    setCurrentPage(1);
  };

  const fetchApplicationsWithFilters = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      Object.entries(amazonFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });
      if (statusFilter) params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      const res = await fetch(`/api/admin/dashboard?${params}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        cache: 'no-store'
      });
      const json = await res.json();
      if (json.applications) {
        setApplications(json.applications);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.total || 0);
      }
    } catch (e) {
      console.error("Applications Error:", e);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = fetchApplicationsWithFilters;

  const fetchSupportStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [unreadRes, ticketsRes] = await Promise.all([
        fetch('/api/support/unread-count', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch('/api/support?requester_type=student&limit=3', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);
      const unreadJson = await unreadRes.json();
      const ticketsJson = await ticketsRes.json();
      if (unreadJson.success) {
        setSupportStats({
          total: (ticketsJson.stats?.student_total || 0) + (ticketsJson.stats?.department_total || 0),
          unread: unreadJson.unreadCount || 0,
          open: (ticketsJson.stats?.student_open || 0) + (ticketsJson.stats?.department_open || 0)
        });
      }
    } catch (e) {
      console.error("Support stats error:", e);
    }
  };

  const fetchEmailStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/admin/email-logs?limit=100', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success && json.stats) {
        setEmailStats(json.stats);
      }
    } catch (e) {
      console.error("Email stats error:", e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAvailableFilters();
    fetchApplications();
    fetchSupportStats();
    fetchEmailStats();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [currentPage, amazonFilters, statusFilter, searchTerm]);

  useEffect(() => {
    console.log('🔌 Setting up optimized admin real-time connection');
    const unsubscribe = optimizedRealtime.subscribe('admin', {
      onNewForm: (payload) => {
        if (payload.new) {
          fetch(`/api/admin/application?id=${payload.new.id}`)
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                setApplications(prev => {
                  if (prev.some(app => app.id === json.data.id)) return prev;
                  return [json.data, ...prev];
                });
                setTotalItems(prev => prev + 1);
                setData(prev => ({
                  ...prev,
                  overallStats: {
                    ...prev.overallStats,
                    total: (prev.overallStats.total || 0) + 1,
                    pending: (prev.overallStats.pending || 0) + 1
                  }
                }));
                toast.success(`📝 New application: ${json.data.student_name}`);
              }
            });
        }
      },
      onStatusUpdate: (payload) => {
        if (payload.new && payload.new.form_id) {
          const newStatus = payload.new.status;
          setApplications(prev => prev.map(app =>
            app.id === payload.new.form_id
              ? { ...app, overall_status: newStatus, status: newStatus }
              : app
          ));
          setData(prev => {
            const deptStats = (prev.departmentStats || []).map(dept => {
              if (payload.new.department_name &&
                dept.department_name === payload.new.department_name) {
                return {
                  ...dept,
                  pending_count: newStatus === 'pending' ? dept.pending_count + 1 :
                    (dept.pending_count > 0 ? dept.pending_count - 1 : 0),
                  approved_count: newStatus === 'approved' ? dept.approved_count + 1 :
                    (newStatus === 'pending' ? dept.approved_count : dept.approved_count)
                };
              }
              return dept;
            });
            return {
              ...prev,
              departmentStats: deptStats,
              overallStats: {
                ...prev.overallStats,
                pending: newStatus === 'pending' ? (prev.overallStats.pending || 0) + 1 :
                  (prev.overallStats.pending > 0 ? prev.overallStats.pending - 1 : 0),
                approved: newStatus === 'approved' ? (prev.overallStats.approved || 0) + 1 :
                  (prev.overallStats.approved || 0)
              }
            };
          });
        }
      },
      onSupportTicket: (payload) => {
        setSupportStats(prev => ({
          ...prev,
          total: prev.total + 1,
          open: payload.eventType === 'INSERT' ? prev.open + 1 : prev.open,
          unread: payload.eventType === 'INSERT' ? prev.unread + 1 : prev.unread
        }));
        if (payload.eventType === 'INSERT') {
          toast.success(`🔔 New ${payload.new?.requester_type || 'user'} support ticket`);
        }
      },
      onEmailLog: () => {
        setEmailStats(prev => ({
          ...prev,
          totalEmails: prev.totalEmails + 1
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const hasSupportData = supportStats.total > 0;
  const hasEmailData = emailStats.totalEmails > 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-full mx-auto min-h-screen space-y-6 sm:space-y-8 pb-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className={`
            text-2xl sm:text-3xl font-bold
            ${isDark
              ? 'text-white'
              : 'text-gray-900'
            }
          `}>
            Admin Command Center
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-100'}`}>
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Live System</span>
            </div>
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Updates detailed every 30s</span>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            className={`p-3 rounded-xl transition-all active:scale-95 border
              ${isDark
                ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <AdminNotificationBell
            departmentStats={data.departmentStats}
            onRefresh={() => {
              fetchStats();
              fetchApplications();
            }}
          />
          <button onClick={() => router.push('/admin/settings')} className={`p-3 rounded-xl transition-all active:scale-95 border
              ${isDark
              ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}>
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setLoading(true);
              fetchStats();
              fetchApplications();
            }}
            className="px-4 py-3 bg-gradient-to-r from-jecrc-red to-jecrc-red-dark text-white rounded-xl font-medium hover:from-jecrc-red-dark hover:to-jecrc-red transition-all shadow-lg"
          >
            <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KEY METRICS */}
      <StatsGrid stats={data.overallStats} loading={loading} />

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* DATA TABLE SECTION */}
        <div className="xl:col-span-3 space-y-6">

          {/* FILTERS */}
          <GlassCard className="p-5">
            <div className="flex flex-col gap-5">
              <AmazonStyleFilters
                onFiltersChange={handleAmazonFiltersChange}
                availableFilters={availableFilters}
                loading={loading}
              />

              {/* Export Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => {
                    exportStatsToCSV(data);
                    toast.success("Stats exported!");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-jecrc-red to-jecrc-red-dark text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export Stats
                </button>
                <button
                  onClick={() => {
                    exportApplicationsToCSV(applications);
                    toast.success("Data exported!");
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium text-sm hover:shadow-lg transition-all"
                >
                  <Download className="w-4 h-4" />
                  Export Data
                </button>
              </div>
            </div>
          </GlassCard>

          {/* APPLICATIONS TABLE */}
          <ApplicationsTable
            key={`apps-${applications.length}-${currentPage}`}
            applications={applications}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* SIDEBAR WIDGETS */}
        <div className="xl:col-span-1 space-y-4">

          {/* DEPARTMENT PERFORMANCE */}
          <GlassCard className="p-5">
            <div className={`flex items-center gap-2 mb-4 border-b pb-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <TrendingUp className={`w-5 h-5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`} />
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Department Efficiency</h3>
            </div>
            <div className="space-y-3">
              {data.departmentStats.length === 0 ? (
                <div className={`text-center py-6 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  No department data available
                </div>
              ) : (
                data.departmentStats.slice(0, 5).map((dept) => (
                  <PerformanceBar
                    key={dept.department_name}
                    label={dept.department_name}
                    pending={dept.pending_count}
                    approved={dept.approved_count}
                    timeTaken={dept.avg_hours || 12}
                  />
                ))
              )}
            </div>
          </GlassCard>

          {/* FORCE SHOW SUPPORT WIDGET */}
          <GlassCard
            className={`p-5 cursor-pointer group hover:shadow-lg transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            onClick={() => router.push('/admin/support')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <ChevronRight className={`w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Support Center</h3>
            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">{supportStats.open} Open</span>
              <span className="mx-2 opacity-30">•</span>
              <span className="opacity-60">{supportStats.total} Total</span>
            </div>
          </GlassCard>

          {hasEmailData && (
            <GlassCard
              className={`p-5 cursor-pointer group hover:shadow-lg transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
              onClick={() => router.push('/admin/emails')}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                  <Mail className="w-5 h-5" />
                </div>
                <ChevronRight className={`w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
              </div>
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email System</h3>
              <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="text-green-600 dark:text-green-400 font-medium">{emailStats.successRate}% Success</span>
                <span className="mx-2 opacity-30">•</span>
                <span className="opacity-60">{emailStats.totalEmails} Sent</span>
              </div>
            </GlassCard>
          )}

          <GlassCard
            className={`p-5 cursor-pointer group hover:shadow-lg transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
            onClick={() => router.push('/admin/verify')}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-lg ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <Shield className="w-5 h-5" />
              </div>
              <ChevronRight className={`w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
            </div>
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Certificate Verification</h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Manual & QR Verify</p>
          </GlassCard>

        </div>
      </div>

    </div>
  );
}
