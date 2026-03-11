'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useStaffDashboard } from '@/hooks/useStaffDashboard';
import { exportAllStaffDataToCSV } from '@/lib/csvExport';
import PageWrapper from '@/components/landing/PageWrapper';
import GlassCard from '@/components/ui/GlassCard';
import StatusBadge from '@/components/ui/StatusBadge';
import { RealtimeStatusIndicator } from '@/components/RealtimeStatusIndicator';
import { RefreshCcw, Search, CheckCircle, XCircle, Clock, TrendingUp, Download, ChevronDown, LogOut, Info, AlertTriangle, HelpCircle, MessageCircle } from 'lucide-react';
import { getSLAStatus, getSLABadgeClasses } from '@/lib/slaHelper';
import { DEPARTMENT_GUIDELINES } from '@/lib/departmentGuidelines';
import toast from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';

export default function StaffDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const [filters, setFilters] = useState({
    course: 'All',
    branch: 'All'
  });

  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectFormId, setRejectFormId] = useState(null);
  const [rejectDeptName, setRejectDeptName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [localRequests, setLocalRequests] = useState([]);

  const {
    user,
    loading,
    requests,
    stats,
    refreshData,
    lastUpdate
  } = useStaffDashboard();

  const [rejectedForms, setRejectedForms] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [rejectedLoading, setRejectedLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [rejectedFetched, setRejectedFetched] = useState(false);

  const [unreadMessages, setUnreadMessages] = useState({});

  useEffect(() => {
    const handleNewSubmission = (e) => {
      const { studentName, registrationNo } = e.detail;
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">New Application Received!</p>
          <p className="text-xs opacity-90">{studentName} ({registrationNo})</p>
        </div>,
        { duration: 5000, icon: '📝', id: `new-sub-${registrationNo}` }
      );
    };

    const handleNewTicket = (e) => {
      const { ticketNumber, requesterType } = e.detail;
      toast.success(
        <div className="flex flex-col gap-1">
          <p className="font-bold">New Support Ticket!</p>
          <p className="text-xs opacity-90">Ticket #{ticketNumber} ({requesterType})</p>
        </div>,
        { duration: 5000, icon: '🎫' }
      );
    };

    window.addEventListener('new-submission', handleNewSubmission);
    window.addEventListener('support-ticket-created', handleNewTicket);

    return () => {
      window.removeEventListener('new-submission', handleNewSubmission);
      window.removeEventListener('support-ticket-created', handleNewTicket);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'rejected' && !rejectedFetched) fetchRejectedForms();
    if (activeTab === 'history' && !historyFetched) fetchHistory();
  }, [activeTab]);

  useEffect(() => {
    setHistoryFetched(false);
    setRejectedFetched(false);
    setSelectedItems(new Set());
  }, [lastUpdate]);

  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  useEffect(() => {
    setLocalRequests(requests);
  }, [requests]);

  const fetchUnreadMessages = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/chat/unread', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          const unreadMap = {};
          (result.data.counts || []).forEach(item => {
            unreadMap[item.form_id] = item.unread_count;
          });
          setUnreadMessages(unreadMap);
        }
      }
    } catch (err) {
      console.error('Error fetching unread messages:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadMessages();
  }, [fetchUnreadMessages, lastUpdate]);

  useEffect(() => {
    const handleDashboardRefresh = (e) => {
      console.log('🔄 Dashboard refresh event received:', e.detail);
      // Refresh unread counts when dashboard refreshes
      fetchUnreadMessages();
    };

    const handleRefreshUnreadCounts = () => {
      console.log('📊 Refreshing unread message counts');
      fetchUnreadMessages();
    };

    window.addEventListener('dashboard-refresh', handleDashboardRefresh);
    window.addEventListener('refresh-unread-counts', handleRefreshUnreadCounts);

    return () => {
      window.removeEventListener('dashboard-refresh', handleDashboardRefresh);
      window.removeEventListener('refresh-unread-counts', handleRefreshUnreadCounts);
    };
  }, [fetchUnreadMessages]);

  useEffect(() => {
    if (!user?.department_name) return;

    const channelName = `staff-chat-notifications-${user.department_name.replace(/\s+/g, '_')}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'no_dues_messages'
      }, (payload) => {
        if (payload.new.sender_type === 'student' &&
          payload.new.department_name === user.department_name) {

          setUnreadMessages(prev => ({
            ...prev,
            [payload.new.form_id]: (prev[payload.new.form_id] || 0) + 1
          }));

          toast.success(
            <div className="flex flex-col gap-1">
              <p className="font-bold">💬 New Chat Message!</p>
              <p className="text-xs opacity-90">From: {payload.new.sender_name}</p>
            </div>,
            { duration: 4000, id: `chat-${payload.new.id}` }
          );
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Staff chat notifications subscribed');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.department_name]);

  const fetchRejectedForms = async () => {
    setRejectedLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/staff/history?status=rejected&limit=300&t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        setRejectedForms(json.data.history || []);
        setRejectedFetched(true);
      }
    } catch (e) { console.error(e); } finally { setRejectedLoading(false); }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/staff/history?limit=300&t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const json = await res.json();
      if (json.success) {
        setHistoryData(json.data.history || []);
        setHistoryFetched(true);
      }
    } catch (e) { console.error(e); } finally { setHistoryLoading(false); }
  };

  const uniqueCourses = useMemo(() => {
    const allData = [...requests, ...rejectedForms, ...historyData];
    const courses = new Set(allData.map(d => d.no_dues_forms?.course).filter(Boolean));
    return ['All', ...Array.from(courses)];
  }, [requests, rejectedForms, historyData]);

  const uniqueBranches = useMemo(() => {
    const allData = [...requests, ...rejectedForms, ...historyData];
    const branches = new Set(allData.map(d => d.no_dues_forms?.branch).filter(Boolean));
    return ['All', ...Array.from(branches)];
  }, [requests, rejectedForms, historyData]);

  const filterData = useCallback((data) => {
    return data.filter(item => {
      const form = item.no_dues_forms;
      const matchesSearch =
        form?.student_name.toLowerCase().includes(search.toLowerCase()) ||
        form?.registration_no.toLowerCase().includes(search.toLowerCase());

      const matchesCourse = filters.course === 'All' || form?.course === filters.course;
      const matchesBranch = filters.branch === 'All' || form?.branch === filters.branch;

      return matchesSearch && matchesCourse && matchesBranch;
    });
  }, [search, filters]);

  const currentData = useMemo(() => {
    if (activeTab === 'pending') return filterData(localRequests);
    if (activeTab === 'rejected') return filterData(rejectedForms);
    if (activeTab === 'history') return filterData(historyData);
    return [];
  }, [activeTab, localRequests, rejectedForms, historyData, filterData]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedItems(new Set(currentData.map(item => item.no_dues_forms.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedItems(newSelected);
  };

  const handleBulkAction = async (action) => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }

    if (!user?.department_name) {
      toast.error('Department not found. Please refresh the page.');
      return;
    }

    setBulkActionLoading(true);
    toast.loading(`Processing ${selectedItems.size} items...`, { id: 'bulk-toast' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/bulk-action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          formIds: Array.from(selectedItems),
          departmentName: user?.department_name,
          action
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      toast.success(json.message || 'Bulk action successful', { id: 'bulk-toast' });
      
      // TRIGGER AUTOMATIC REAL-TIME UPDATE
      window.dispatchEvent(new CustomEvent('bulk-action-completed', {
        detail: {
          action,
          formIds: Array.from(selectedItems),
          departmentName: user?.department_name,
          timestamp: Date.now()
        }
      }));
      
      refreshData();
      setSelectedItems(new Set());
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Bulk action failed", { id: 'bulk-toast' });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleAction = async (e, formId, departmentName, action) => {
    e.stopPropagation();

    if (action === 'reject') {
      setRejectFormId(formId);
      setRejectDeptName(departmentName);
      setRejectionReason('');
      setShowRejectModal(true);
      return;
    }

    toast.loading('Approving...', { id: 'action-toast' });
    setLocalRequests(prev => prev.filter(r => r.no_dues_forms.id !== formId));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ formId, departmentName, action })
      });
      if (!res.ok) {
        refreshData();
        throw new Error('Failed');
      }
      
      toast.success('Approved ✓', { id: 'action-toast' });
      
      // TRIGGER AUTOMATIC REAL-TIME UPDATE
      window.dispatchEvent(new CustomEvent('individual-action-completed', {
        detail: {
          action,
          formId,
          departmentName,
          timestamp: Date.now()
        }
      }));
      
      refreshData();
    } catch (err) {
      toast.error('Action failed', { id: 'action-toast' });
    }
  };

  const confirmRejection = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setRejecting(true);
    toast.loading('Rejecting...', { id: 'reject-toast' });

    setLocalRequests(prev => prev.filter(r => r.no_dues_forms.id !== rejectFormId));
    setShowRejectModal(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/staff/action', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          formId: rejectFormId,
          departmentName: rejectDeptName,
          action: 'reject',
          reason: rejectionReason.trim()
        })
      });

      if (!res.ok) {
        refreshData();
        throw new Error('Failed');
      }

      toast.success('Rejected with reason', { id: 'reject-toast' });
      refreshData();
    } catch (err) {
      toast.error('Rejection failed', { id: 'reject-toast' });
    } finally {
      setRejecting(false);
      setRejectFormId(null);
      setRejectDeptName('');
      setRejectionReason('');
    }
  };

  const handleExport = async () => {
    toast.loading('Fetching all records for export...', { id: 'export-toast' });

    try {
      const success = await exportAllStaffDataToCSV(
        { activeTab, course: filters.course, branch: filters.branch, search },
        user?.department_name,
        supabase
      );

      if (success) {
        toast.success('Export completed successfully!', { id: 'export-toast' });
      } else {
        toast.error('No data to export', { id: 'export-toast' });
      }
    } catch (error) {
      toast.error('Export failed. Please try again.', { id: 'export-toast' });
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try { return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return 'Invalid'; }
  };

  return (
    <PageWrapper>
      <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen relative pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {user?.department_name || 'Department'} Dashboard
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <RealtimeStatusIndicator />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Automatic real-time updates enabled
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-blue-600/25 transition-all"
            >
              <HelpCircle className="w-4 h-4" /> Guidelines
            </button>
            <button
              onClick={handleExport}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl text-sm font-medium shadow-lg hover:shadow-green-600/25 transition-all"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => refreshData(true)}
              className={`p-2.5 rounded-xl border transition-all
                ${isDark ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              title="Force Refresh Data"
            >
              <RefreshCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => router.push('/staff/logout')}
              className="p-2.5 bg-gradient-to-r from-jecrc-red to-jecrc-red-dark text-white rounded-xl shadow-lg hover:shadow-jecrc-red/25 transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Guidelines Modal */}
        {showGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
              <div className={`p-6 border-b flex justify-between items-center ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Info className="w-5 h-5 text-blue-500" />
                  {user?.department_name} Guidelines
                </h2>
                <button
                  onClick={() => setShowGuide(false)}
                  className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <h3 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Checklist for Approval</h3>
                <ul className="space-y-3">
                  {(DEPARTMENT_GUIDELINES[user?.department_name] || DEPARTMENT_GUIDELINES['default']).map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm leading-relaxed">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`p-4 border-t flex justify-end ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
                <button
                  onClick={() => setShowGuide(false)}
                  className={`px-6 py-2 font-medium rounded-lg transition-opacity ${isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
                >
                  Understood
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Guidelines Card */}
        <GlassCard className="mb-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
              <Info className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className={`p-1.5 rounded-full ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'}`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Approve: No pending dues</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className={`p-1.5 rounded-full ${isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-600'}`}>
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Reject: Valid reason required</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className={`p-1.5 rounded-full ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>SLA: 24-48 hours target</span>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className={`p-1.5 rounded-full ${isDark ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-600'}`}>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Check: Verify all details first</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Stats Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <StatusCard label="Pending" value={stats?.pending || 0} sub="Awaiting action" icon={Clock} color="yellow" onClick={() => setActiveTab('pending')} isDark={isDark} />
          <StatusCard label="Approved" value={stats?.approved || 0} sub="By department" icon={CheckCircle} color="green" onClick={() => setActiveTab('history')} isDark={isDark} />
          <StatusCard label="Rejected" value={stats?.rejected || 0} sub="By department" icon={XCircle} color="red" onClick={() => setActiveTab('rejected')} isDark={isDark} />
          <StatusCard label="Total Processed" value={stats?.total || 0} sub={`${stats?.approvalRate || 0}% approval rate`} icon={TrendingUp} color="gray" onClick={() => setActiveTab('history')} isDark={isDark} />
        </div>

        {/* Filters & Search Toolbar */}
        <GlassCard className="flex flex-col sm:flex-row gap-4 mb-6 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search student by name or registration number..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium transition-all border border-1
                ${isDark
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/10'
                }`}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                className={`appearance-none pl-3 pr-9 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border border-1
                  ${isDark
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/10'
                  }`}
                value={filters.course}
                onChange={(e) => setFilters(prev => ({ ...prev, course: e.target.value }))}
              >
                {uniqueCourses.map(c => <option key={c} value={c} className={isDark ? 'bg-gray-800' : 'bg-white'}>{c === 'All' ? 'All Courses' : c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                className={`appearance-none pl-3 pr-9 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer border border-1
                  ${isDark
                    ? 'bg-gray-800 border-gray-600 text-white focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/20'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-jecrc-red focus:ring-2 focus:ring-jecrc-red/10'
                  }`}
                value={filters.branch}
                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
              >
                {uniqueBranches.map(b => <option key={b} value={b} className={isDark ? 'bg-gray-800' : 'bg-white'}>{b === 'All' ? 'All Branches' : b}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </GlassCard>

        {/* Tabs */}
        <div className={`flex gap-2 mb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {['pending', 'rejected', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-4 capitalize font-medium text-sm transition-all border-b-2 
                ${activeTab === tab
                  ? 'border-jecrc-red text-jecrc-red'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab} ({tab === 'pending' ? stats?.pending : tab === 'rejected' ? stats?.rejected : stats?.total})
            </button>
          ))}
        </div>

        {/* Main Table */}
        <GlassCard className="overflow-hidden min-h-[400px]">
          {loading || rejectedLoading || historyLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* MOBILE VIEW */}
              <div className="block md:hidden bg-gray-50 dark:bg-black/20 p-4">
                {currentData.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">No records found</div>
                ) : (
                  currentData.map(item => (
                    <MobileCard
                      key={item.id}
                      item={item}
                      activeTab={activeTab}
                      selected={selectedItems.has(item.no_dues_forms.id)}
                      onSelect={() => handleSelectItem(item.no_dues_forms.id)}
                      onAction={handleAction}
                      onNavigate={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                      formatDate={formatDate}
                      isDark={isDark}
                    />
                  ))
                )}
              </div>

              {/* DESKTOP VIEW */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className={`border-b ${isDark ? 'bg-red-950/40 border-red-900/40' : 'bg-red-50/80 border-red-100'}`}>
                    <tr>
                      {activeTab === 'pending' && (
                        <th className="w-12 px-4 py-3">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
                              checked={currentData.length > 0 && selectedItems.size === currentData.length}
                              onChange={handleSelectAll}
                            />
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Student</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Course / Branch</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                      {activeTab === 'pending' && <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">SLA</th>}
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                      {(activeTab === 'pending' || activeTab === 'rejected') && <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-red-900/30' : 'divide-red-100'} text-sm`}>
                    {currentData.length === 0 ? (
                      <tr><td colSpan="6" className="p-12 text-center text-gray-400">No records found</td></tr>
                    ) : (
                      currentData.map(item => (
                        <tr
                          key={item.id}
                          className={`hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-colors cursor-pointer ${selectedItems.has(item.no_dues_forms.id) ? 'bg-jecrc-red/5' : ''}`}
                          onClick={() => router.push(`/staff/student/${item.no_dues_forms.id}`)}
                        >
                          {activeTab === 'pending' && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
                                checked={selectedItems.has(item.no_dues_forms.id)}
                                onChange={() => handleSelectItem(item.no_dues_forms.id)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.no_dues_forms.student_name}</div>
                                <div className={`text-xs font-mono ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.no_dues_forms.registration_no}</div>
                              </div>
                              {unreadMessages[item.no_dues_forms.id] > 0 && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full animate-pulse">
                                  <MessageCircle className="w-3 h-3" />
                                  {unreadMessages[item.no_dues_forms.id]}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={isDark ? 'text-white' : 'text-gray-900'}>{item.no_dues_forms.course}</div>
                            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{item.no_dues_forms.branch}</div>
                          </td>
                          <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(item.no_dues_forms.created_at)}</td>
                          {activeTab === 'pending' && (
                            <td className="px-4 py-3">
                              {(() => {
                                const sla = getSLAStatus(item.no_dues_forms.created_at);
                                if (sla.level === 'normal') return <span className="text-xs text-gray-400">{sla.text}</span>;
                                return (
                                  <span className={getSLABadgeClasses(sla, true)} title={sla.text}>
                                    {sla.level === 'warning' && '⚠️'}
                                    {sla.level === 'slow' && '🐌'}
                                    {sla.level === 'critical' && '🚨'}
                                    {sla.text}
                                  </span>
                                );
                              })()}
                            </td>
                          )}
                          <td className="px-4 py-3"><StatusBadge status={item.status} /></td>

                          {activeTab === 'pending' && (
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')}
                                  className={`p-2 rounded-lg transition-all ${isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                  title="Approve"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'reject')}
                                  className={`p-2 rounded-lg transition-all ${isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                  title="Reject"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}

                          {activeTab === 'rejected' && (
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={(e) => handleAction(e, item.no_dues_forms.id, item.department_name, 'approve')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all
                                    ${isDark ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                  title="Approve (Resolved)"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Approve
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/staff/student/${item.no_dues_forms.id}`) }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all
                                    ${isDark ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                                  title="View & Chat"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  Chat
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </GlassCard>

        {/* Bulk Action Bar */}
        {selectedItems.size > 0 && activeTab === 'pending' && (
          <div className="fixed bottom-6 left-0 right-0 max-w-2xl mx-auto px-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className={`rounded-2xl shadow-2xl p-4 flex items-center justify-between border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-jecrc-red text-white text-xs font-bold px-2 py-1 rounded-md">
                  {selectedItems.size}
                </div>
                <span className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>Selected</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedItems(new Set())}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBulkAction('approve')}
                  disabled={bulkActionLoading}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm font-bold rounded-lg shadow-lg flex items-center gap-2"
                >
                  {bulkActionLoading ? <span className="animate-spin text-xl">⟳</span> : <CheckCircle className="w-4 h-4" />}
                  Approve Selected
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`p-6 border-b ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
              <h2 className={`text-xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <XCircle className="w-5 h-5 text-red-500" />
                Reject Application
              </h2>
            </div>
            <div className="p-6">
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Please provide a reason for rejection. This will be sent to the student.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className={`w-full px-4 py-3 rounded-lg border outline-none transition-all
                  ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500/50'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-red-500/20'
                  }`}
                autoFocus
              />
            </div>
            <div className={`p-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-gray-50'}`}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                  setRejectFormId(null);
                }}
                className={`px-4 py-2 font-medium rounded-lg transition-colors ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmRejection}
                disabled={!rejectionReason.trim() || rejecting}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {rejecting ? <span className="animate-spin">⟳</span> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

// Status Card Component
function StatusCard({ label, value, sub, icon: Icon, color, onClick, isDark }) {
  const colors = {
    yellow: {
      bg: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
      icon: 'text-amber-500 dark:text-amber-400',
      card: isDark
        ? 'bg-red-950/30 border border-red-900/30'
        : 'bg-red-50/70 border border-red-100'
    },
    green: {
      bg: 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400',
      icon: 'text-green-500 dark:text-green-400',
      card: isDark
        ? 'bg-red-950/30 border border-red-900/30'
        : 'bg-red-50/70 border border-red-100'
    },
    red: {
      bg: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400',
      icon: 'text-red-500 dark:text-red-400',
      card: isDark
        ? 'bg-red-950/30 border border-red-900/30'
        : 'bg-red-50/70 border border-red-100'
    },
    gray: {
      bg: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
      icon: 'text-gray-500 dark:text-gray-400',
      card: isDark
        ? 'bg-red-950/30 border border-red-900/30'
        : 'bg-red-50/70 border border-red-100'
    }
  };
  const colorScheme = colors[color] || colors.gray;

  return (
    <button onClick={onClick} className="text-left transform transition-all hover:scale-[1.02] active:scale-95 w-full">
      <GlassCard className={`p-4 sm:p-5 h-full ${colorScheme.card}`} variant="default">
        <div className="flex justify-between items-start">
          <div>
            <p className={`text-xs sm:text-sm ${colorScheme.icon}`}>{label}</p>
            <p className={`text-2xl sm:text-3xl font-bold mt-1 ${colorScheme.icon.replace('text-', 'text-').replace('dark:', 'dark:text-')}`}>{value || 0}</p>
            <p className={`text-xs mt-1 ${colors[color]?.bg.includes('dark') ? 'text-gray-400' : 'text-gray-500'}`}>{sub}</p>
          </div>
          <div>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorScheme.icon}`} />
          </div>
        </div>
      </GlassCard>
    </button>
  );
}

// Mobile Card Component
function MobileCard({ item, activeTab, selected, onSelect, onAction, onNavigate, formatDate, isDark }) {
  const sla = activeTab === 'pending' ? getSLAStatus(item.no_dues_forms.created_at) : null;

  return (
    <div
      onClick={onNavigate}
      className={`rounded-xl p-4 mb-3 shadow-sm transition-all border
        ${selected
          ? 'ring-2 ring-jecrc-red bg-jecrc-red/5'
          : isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex gap-3">
          {activeTab === 'pending' && (
            <div onClick={(e) => e.stopPropagation()} className="pt-1">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-jecrc-red focus:ring-jecrc-red"
                checked={selected}
                onChange={onSelect}
              />
            </div>
          )}
          <div>
            <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {item.no_dues_forms.student_name}
            </h3>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
              {item.no_dues_forms.registration_no}
            </span>
          </div>
        </div>
        <StatusBadge status={item.status} className="scale-90 origin-top-right" />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
        <div>
          <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Course</span>
          <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{item.no_dues_forms.course}</span>
        </div>
        <div className="text-right">
          <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Date</span>
          <span className={isDark ? 'text-gray-200' : 'text-gray-700'}>{formatDate(item.no_dues_forms.created_at)}</span>
        </div>
      </div>

      {activeTab === 'pending' && sla && (
        <div className={`flex items-center gap-3 mb-4 p-2 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
          <StatusBadge status={item.status} className="scale-90 origin-top-right" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(e, item.no_dues_forms.id, item.department_name, 'approve');
            }}
            className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
          >
            Approve
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction(e, item.no_dues_forms.id, item.department_name, 'reject');
            }}
            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {sla && (
        <div className="mt-2 text-center">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
            <Clock className="w-3 h-3.5 mr-1" />
            SLA: {sla.text}
          </span>
        </div>
      )}
    </div>
  );
}
