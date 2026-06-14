'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  AlertTriangle,
  Scan
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ChatBox from '@/components/chat/ChatBox';
import { realtimeService } from '@/lib/supabaseRealtime';
import { useUnread } from '@/hooks/useUnread';

export default function DepartmentDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    priority: 'all',
    dateRange: 'all'
  });
  const [sortConfig, setSortConfig] = useState({
    field: 'created_at',
    direction: 'desc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [departmentName, setDepartmentName] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const { unreadCounts, totalUnread } = useUnread('staff');

  const loadApplications = async (targetPage = page) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('department_name, full_name')
        .eq('email', user.email)
        .single();

      if (!profile) throw new Error('Profile not found');

      setCurrentUser({
        id: user.id,
        email: user.email,
        name: profile.full_name,
        type: 'department'
      });
      setDepartmentName(profile.department_name);

      // Get total count first with filters
      let countQuery = supabase
        .from('no_dues_status')
        .select(`*, no_dues_forms!inner(*)`, { count: 'exact', head: true })
        .eq('department_name', profile.department_name);

      if (filters.status && filters.status !== 'all') {
        countQuery = countQuery.eq('status', filters.status);
      }

      if (filters.search) {
        countQuery = countQuery.or(`student_name.ilike.%${filters.search}%,registration_no.ilike.%${filters.search}%`, { foreignTable: 'no_dues_forms' });
      }

      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalPages(Math.ceil((count || 0) / limit));

      const from = (targetPage - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status!inner(
            status,
            action_at,
            action_by_user_id,
            rejection_reason
          )
        `)
        .eq('no_dues_status.department_name', profile.department_name);

      if (filters.status && filters.status !== 'all') {
        query = query.eq('no_dues_status.status', filters.status);
      }

      if (filters.search) {
        query = query.or(`student_name.ilike.%${filters.search}%,registration_no.ilike.%${filters.search}%`);
      }

      const { data: forms, error: formsError } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (formsError) throw formsError;
      setApplications(forms || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!departmentName) return;

    console.log(`🔌 Setting up unified department real-time connection for ${departmentName}`);

    const unsubscribe = realtimeService.subscribeToDepartment(departmentName, {
      onStatusUpdate: (event) => {
        console.log(`🏢 Department ${departmentName}: Status update event`, event);
        const data = event.data?.new || event.data;
        if (data && data.form_id) {
          setApplications(prev => prev.map(app =>
            app.id === data.form_id
              ? { ...app, no_dues_status: [{ ...app.no_dues_status[0], status: data.status }] }
              : app
          ));
        } else {
          loadApplications();
        }
      },
      onNewApplication: (event) => {
        console.log(`📝 Department ${departmentName}: New application event`, event);
        const data = event.data?.new || event.data;
        if (data && data.id) {
          fetch(`/api/student/application?id=${data.id}`)
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                setApplications(prev => {
                  // Avoid duplicates
                  if (prev.some(app => app.id === json.data.id)) return prev;
                  return [json.data, ...prev];
                });
              }
            }).catch(() => loadApplications());
        } else {
          loadApplications();
        }
      }
    });

    setIsConnected(true);
    return () => {
      console.log(`🔌 Cleaning up department connection for ${departmentName}`);
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [departmentName]);

  useEffect(() => {
    if (showChat && selectedApplication && departmentName) {
      loadChatMessages();
    }
  }, [showChat, selectedApplication, departmentName]);

  const loadChatMessages = async () => {
    try {
      const response = await fetch(`/api/chat/${selectedApplication.id}/${departmentName}`);
      const result = await response.json();
      if (result.success && result.data?.messages) {
        setChatMessages(result.data.messages);
      }
    } catch (error) {
      console.error("Failed to load messages", error);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      setSelectedRows(applications.map(app => app.id));
    }
    setSelectAll(!selectAll);
  };

  const handleRowSelect = (id) => {
    setSelectedRows(prev => {
      if (prev.includes(id)) {
        return prev.filter(rowId => rowId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBulkAction = async (action) => {
    if (selectedRows.length === 0) {
      alert('Please select at least one application');
      return;
    }

    // Standardize action names (the bulk API expects 'approve' or 'reject')
    const apiAction = action === 'approved' ? 'approve' : (action === 'rejected' ? 'reject' : action);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/staff/bulk-action', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          formIds: selectedRows,
          action: apiAction,
          departmentName: departmentName,
          reason: apiAction === 'reject' ? prompt('Bulk rejection reason:') || 'Bulk rejection' : undefined
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSelectedRows([]);
        setSelectAll(false);
        loadApplications();
        alert(`Successfully ${apiAction}d ${selectedRows.length} applications`);
      } else {
        alert(result.error || 'Some actions failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to perform bulk action');
    }
  };

  const handleAction = async (application, action) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/department-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          form_id: application.id,
          status: action,
          department: departmentName,
          remarks: action === 'reject' ? prompt('Rejection reason:') : null
        })
      });

      const data = await response.json();
      if (data.success) {
        loadApplications();
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      alert('Failed to perform action');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Registration No', 'Student Name', 'Status', 'Created At', 'Department'].join(','),
      ...applications.map(app => [
        app.registration_no,
        app.student_name,
        app.no_dues_status[0]?.status || 'pending',
        app.created_at,
        departmentName
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${departmentName}_applications_${new Date().toISOString()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Scroll to table helper
  const scrollToTable = () => {
    const tableElement = document.getElementById('applications-table');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Filter helper for stats cards
  const toggleFilter = (status) => {
    setFilters(prev => ({ ...prev, status }));
    scrollToTable();
  };

  const filteredApplications = applications.filter(app => {
    if (filters.status !== 'all') {
      const status = app.no_dues_status[0]?.status;
      if (status !== filters.status) return false;
    }
    if (filters.search && !app.student_name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !app.registration_no.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const aValue = a[sortConfig.field];
    const bValue = b[sortConfig.field];

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const StatusBadge = ({ status }) => {
    const colors = {
      pending: 'bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
      approved: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
      rejected: 'bg-red-200 text-red-900 dark:bg-red-900/30 dark:text-red-200',
      completed: 'bg-purple-200 text-purple-900 dark:bg-purple-900/30 dark:text-purple-200',
      reapplied: 'bg-orange-200 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading && applications.length === 0) {
    return (
      <PageWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {departmentName} Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full ${isDark ? 'bg-green-500/10 border border-green-500/20' : 'bg-green-50 border border-green-100'}`}>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className={`text-xs font-semibold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Live Updates</span>
                </div>
                <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Real-time synchronization enabled
                </span>
                {totalUnread > 0 && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full animate-pulse ${isDark ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-blue-50 border border-blue-100 text-blue-700'}`}>
                    <MessageSquare className="w-3 h-3" />
                    <span className="text-xs font-bold">{totalUnread} New Messages</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.open('/staff/verify', '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl transition-all shadow-lg hover:shadow-indigo-600/25 text-sm font-medium"
              >
                <Scan className="w-4 h-4" />
                <span className="hidden sm:inline">Verify QR</span>
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-medium
                  ${isDark
                    ? 'bg-[#141414] border-white/10 text-white hover:bg-[#1a1a1a]'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-jecrc-red to-jecrc-red-dark text-white rounded-xl transition-all shadow-lg hover:shadow-jecrc-red/25 text-sm font-medium"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={loadApplications}
                className={`p-2.5 rounded-xl border transition-all
                  ${isDark
                    ? 'bg-[#141414] border-white/10 text-white hover:bg-[#1a1a1a]'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 rounded-lg mb-6"
              >
                <GlassCard className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="md:col-span-1">
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status Filter</label>
                      <select
                        value={filters.status}
                        onChange={(e) => {
                          setFilters(prev => ({ ...prev, status: e.target.value }));
                          setPage(1);
                        }}
                        className={`w-full p-3 rounded-xl text-sm font-medium transition-all border border-1
                          ${isDark
                            ? 'bg-[#141414] border-white/10 text-white focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                            : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/10'
                          }`}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
                        <option value="reapplied">Reapplied</option>
                      </select>
                    </div>
                    <div className="md:col-span-3">
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Search Records</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={filters.search}
                          onChange={(e) => {
                            setFilters(prev => ({ ...prev, search: e.target.value }));
                            setPage(1);
                          }}
                          placeholder="Search by student name or registration number..."
                          className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none text-sm font-medium transition-all
                            ${isDark
                              ? 'bg-[#141414] border-white/10 text-white placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/10'
                            }`}
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <GlassCard
              className={`p-5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filters.status === 'all' ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => toggleFilter('all')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Items</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{applications.length}</p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-blue-500/20' : 'bg-blue-50'}`}>
                  <Filter className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className={`p-5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filters.status === 'pending' ? 'ring-2 ring-amber-500' : ''}`}
              onClick={() => toggleFilter('pending')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {applications.filter(app => (app.no_dues_status?.[0]?.status || app.status) === 'pending').length}
                  </p>
                </div>
                <div className={`relative p-3 rounded-xl shadow-sm ${isDark ? 'bg-amber-500/20' : 'bg-amber-50'}`}>
                  <Clock className={`w-6 h-6 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  {/* Notification Badge Fix */}
                  {applications.some(app => unreadCounts[app.id] > 0 && (app.no_dues_status?.[0]?.status === 'pending')) && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className={`p-5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filters.status === 'approved' ? 'ring-2 ring-emerald-500' : ''}`}
              onClick={() => toggleFilter('approved')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Completed</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {applications.filter(app => (app.no_dues_status?.[0]?.status || app.status) === 'approved').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-50'}`}>
                  <CheckCircle className={`w-6 h-6 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
              </div>
            </GlassCard>

            <GlassCard
              className={`p-5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filters.status === 'rejected' ? 'ring-2 ring-red-500' : ''}`}
              onClick={() => toggleFilter('rejected')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rejected</p>
                  <p className={`text-3xl font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                    {applications.filter(app => (app.no_dues_status?.[0]?.status || app.status) === 'rejected').length}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-sm ${isDark ? 'bg-red-500/20' : 'bg-red-50'}`}>
                  <XCircle className={`w-6 h-6 ${isDark ? 'text-red-400' : 'text-red-600'}`} />
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Bulk Actions */}
          {selectedRows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-800 dark:text-blue-200 font-medium">
                    {selectedRows.length} application{selectedRows.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkAction('approved')}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm font-medium"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBulkAction('rejected')}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all text-sm font-medium"
                  >
                    Reject Selected
                  </button>
                  <button
                    onClick={() => setSelectedRows([])}
                    className="px-4 py-2 bg-[#1a1a1a] text-white rounded-lg hover:bg-[#222] border border-white/10 transition-all text-sm font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Applications Table */}
          <GlassCard>
            <div className="block md:hidden bg-gray-50 dark:bg-[#111111]/70 p-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-white/5 rounded-lg animate-pulse" />)}
                </div>
              ) : sortedApplications.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No applications found</div>
              ) : (
                sortedApplications.map((application) => (
                  <MobileApplicationCard
                    key={application.id}
                    application={application}
                    selected={selectedRows.includes(application.id)}
                    onSelect={() => handleRowSelect(application.id)}
                    onApprove={() => handleAction(application, 'approved')}
                    onReject={() => handleAction(application, 'rejected')}
                    onChat={() => {
                      setSelectedApplication(application);
                      setShowChat(true);
                    }}
                    unreadCount={unreadCounts[application.id] || 0}
                    onViewDetails={() => alert(`View details for ${application.registration_no}`)}
                    isDark={isDark}
                  />
                ))
              )}
            </div>

            {/* DESKTOP VIEW Table (>= 768px) */}
            <div id="applications-table" className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b border-gray-200 dark:border-white/10 ${isDark ? 'bg-[#111111]/70' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-6 py-4 text-left">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-jecrc-red rounded border-gray-300 focus:ring-jecrc-red"
                      />
                    </th>
                    <th className="px-6 py-4 text-left cursor-pointer group" onClick={() => handleSort('registration_no')}>
                      <div className={`flex items-center space-x-1 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black'} transition-colors`}>
                        <span>Registration No</span>
                        {sortConfig.field === 'registration_no' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left cursor-pointer group" onClick={() => handleSort('student_name')}>
                      <div className={`flex items-center space-x-1 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black'} transition-colors`}>
                        <span>Student Name</span>
                        {sortConfig.field === 'student_name' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Priority</th>
                    <th className="px-6 py-4 text-left cursor-pointer group" onClick={() => handleSort('created_at')}>
                      <div className={`flex items-center space-x-1 text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black'} transition-colors`}>
                        <span>Created</span>
                        {sortConfig.field === 'created_at' && (
                          sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                    <th className={`px-6 py-4 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-white/10' : 'divide-gray-200'}`}>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center">
                        <LoadingSpinner />
                      </td>
                    </tr>
                  ) : sortedApplications.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No applications found
                      </td>
                    </tr>
                  ) : (
                    sortedApplications.map((application) => (
                      <tr key={application.id} className={`hover:bg-gray-50 dark:hover:bg-[#1a1a1a] transition-colors`}>
                        <td className="px-6 py-4">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(application.id)}
                            onChange={() => handleRowSelect(application.id)}
                            className="h-4 w-4 text-jecrc-red rounded border-gray-300"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {application.registration_no}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-white">
                          {application.student_name}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={application.no_dues_status[0]?.status || 'pending'} />
                        </td>
                        <td className="px-6 py-4">
                          {application.status === 'reapplied' ? (
                            <span className="text-orange-500 text-sm font-medium">Reapplied</span>
                          ) : (
                            <span className="text-gray-500 text-sm">Normal</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                          {new Date(application.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleAction(application, 'approved')}
                              className="px-3 py-1 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-lg hover:from-green-700 hover:to-green-800 transition-all"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(application, 'rejected')}
                              className="px-3 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm rounded-lg hover:from-red-700 hover:to-red-800 transition-all"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApplication(application);
                                setShowChat(true);
                              }}
                              className="relative p-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {unreadCounts[application.id] > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800 animate-bounce">
                                  {unreadCounts[application.id]}
                                </span>
                              )}
                            </button>
                            <button
                              onClick={() => alert(`View details for ${application.registration_no}`)}
                              className={`p-2 rounded-lg transition-all ${isDark ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222222]' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            {!loading && totalPages > 1 && (
              <div className={`p-4 flex items-center justify-between border-t ${isDark ? 'border-gray-700 bg-[#111111]/70' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Showing page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                      ${isDark 
                        ? 'bg-[#141414] border-white/10 text-gray-300 disabled:opacity-30 hover:bg-[#1a1a1a]' 
                        : 'bg-white border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50'}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                      ${isDark 
                        ? 'bg-[#141414] border-white/10 text-gray-300 disabled:opacity-30 hover:bg-[#1a1a1a]' 
                        : 'bg-white border-gray-200 text-gray-600 disabled:opacity-50 hover:bg-gray-50'}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Chat Modal */}
        <AnimatePresence>
          {showChat && selectedApplication && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1050]"
              onClick={() => setShowChat(false)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl shadow-2xl ${isDark ? 'bg-[#141414]' : 'bg-white'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <ChatBox
                  messages={chatMessages}
                  loading={false}
                  sending={sendingMessage}
                  onSend={async (message) => {
                    setSendingMessage(true);
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      const response = await fetch(`/api/chat/${selectedApplication.id}/${departmentName}`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session?.access_token}`
                        },
                        body: JSON.stringify({
                          message,
                          senderType: 'department',
                          senderName: currentUser?.name || 'Department Staff',
                          senderId: currentUser?.id
                        })
                      });
                      const result = await response.json();
                      if (!result.success) {
                        alert(result.error);
                      }
                    } catch (err) {
                      console.error(err);
                      alert('Failed to send message');
                    } finally {
                      setSendingMessage(false);
                    }
                  }}
                  currentUserType="department"
                  currentUserName={currentUser?.name}
                  departmentName={departmentName}
                  rejectionReason={selectedApplication.no_dues_status[0]?.rejection_reason}
                  onFileUpload={async (file) => {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('bucket', 'no-dues-files');
                    try {
                      const response = await fetch('/api/upload', { method: 'POST', body: formData });
                      const result = await response.json();
                      return result.success ? { success: true, fileUrl: result.url } : { success: false, error: result.error };
                    } catch (e) {
                      return { success: false, error: e.message };
                    }
                  }}
                  isConnected={isConnected}
                  typingUsers={typingUsers}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageWrapper>
  );
}

// Mobile Card Component
function MobileApplicationCard({ application, selected, onSelect, onApprove, onReject, onChat, unreadCount, onViewDetails, isDark }) {
  const status = application.no_dues_status?.[0]?.status || 'pending';
  const isReapplied = application.status === 'reapplied';

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 mb-3 border transition-all
        ${selected
          ? 'ring-2 ring-jecrc-red bg-jecrc-red/5'
          : isDark ? 'bg-[#141414] border-white/10' : 'bg-white border-gray-200'
        }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div onClick={(e) => e.stopPropagation()} className="pt-1">
            <input
              type="checkbox"
              checked={selected}
              onChange={onSelect}
              className="w-5 h-5 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red cursor-pointer"
            />
          </div>
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {application.student_name}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono mt-1 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
              {application.registration_no}
            </span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize
          ${status === 'pending' ? 'bg-amber-200 text-amber-900' :
            status === 'approved' ? 'bg-emerald-200 text-emerald-900' :
              status === 'rejected' ? 'bg-red-200 text-red-900' :
                'bg-gray-200 text-gray-900'
          }`}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
        <div>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>Created</span>
          <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
            {new Date(application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div>
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} block`}>Priority</span>
          {isReapplied ? (
            <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">High Priority</span>
          ) : (
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Normal</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-200/50 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onApprove}
          className="flex-1 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all hover:shadow-lg"
        >
          <CheckCircle className="w-4 h-4" /> Approve
        </button>
        <button
          onClick={onReject}
          className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-all hover:shadow-lg"
        >
          <XCircle className="w-4 h-4" /> Reject
        </button>
        <button
          onClick={onChat}
          className="relative p-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg transition-all hover:shadow-lg"
        >
          <MessageSquare className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={onViewDetails}
          className={`p-2.5 rounded-lg transition-all ${isDark ? 'bg-[#1a1a1a] text-gray-300 hover:bg-[#222222]' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
        >
          <Eye className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
