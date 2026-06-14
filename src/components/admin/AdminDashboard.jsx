'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useDepartmentsConfig } from '@/hooks/useDepartmentsConfig';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/lib/supabaseClient';
import { exportApplicationsToCSV, exportStatsToCSV } from '@/lib/csvExport';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import SearchBar from '@/components/ui/SearchBar';
import GlassCard from '@/components/ui/GlassCard';
import StatsCard from '@/components/shared/StatsCard';
import DepartmentPerformanceChart from '@/components/admin/DepartmentPerformanceChart';
import RequestTrendChart from '@/components/admin/RequestTrendChart';
import ApplicationsTable from '@/components/admin/ApplicationsTable';
import AdminSettings from '@/components/admin/settings/AdminSettings';

import TabbedSupportTickets from '@/components/admin/TabbedSupportTickets';
import FilterPills from '@/components/ui/FilterPills';
import { LogOut, Shield, RefreshCw, Headphones, Users } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const {
    user,
    userId,
    loading,
    refreshing,
    applications,
    stats,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    lastUpdate,
    fetchDashboardData,
    fetchStats,
    refreshData,
  } = useAdminDashboard();

  // State for manual entries stats


  // Load departments for filter dropdown
  const { departments } = useDepartmentsConfig();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // ✅ PERFORMANCE FIX #1: Wait 500ms after typing stops before fetching
  const debouncedSearch = useDebounce(searchTerm, 500);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Scroll to table helper function
  const scrollToTable = () => {
    const tableElement = document.querySelector('[data-table="applications"]');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle global errors with Toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Listen for new submission notifications from real-time updates
  useEffect(() => {
    const handleNewSubmission = (event) => {
      const { registrationNo, studentName } = event.detail;
      toast.success(
        `New application received!\n${studentName || 'Student'} (${registrationNo})`,
        {
          duration: 5000,
          icon: '🔔',
          style: {
            background: isDark ? '#1f2937' : '#fff',
            color: isDark ? '#fff' : '#1f2937',
          }
        }
      );
    };

    window.addEventListener('new-submission', handleNewSubmission);
    return () => window.removeEventListener('new-submission', handleNewSubmission);
  }, [isDark]);

  // ⚡ PERFORMANCE: Initial data load - fetch everything in parallel
  useEffect(() => {
    if (userId) {
      console.log('📥 Initial admin dashboard data load (parallel)');

      // Fetch all data in parallel to minimize load time
      const loadData = async () => {
        try {
          await Promise.all([
            fetchDashboardData({
              status: statusFilter,
              search: '',
              department: departmentFilter
            }),
            fetchStats()
          ]);
          console.log('✅ All dashboard data loaded successfully');
        } catch (error) {
          console.error('❌ Error loading dashboard data:', error);
          toast.error('Failed to load dashboard data');
        }
      };

      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ PERFORMANCE FIX #1: Fetch data when filters or debounced search change
  // This prevents API spam while typing - waits 500ms after user stops typing
  useEffect(() => {
    if (userId) {
      console.log('🔍 Filters/pagination changed, fetching data');
      fetchDashboardData({
        status: statusFilter,
        search: debouncedSearch, // ✅ Use debounced value instead of searchTerm
        department: departmentFilter
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, departmentFilter, debouncedSearch]); // ✅ Removed searchTerm from deps
  // Now API is only called 500ms AFTER user stops typing, not on every keystroke!



  // ✅ FIX: Properly extract stats data
  const statusCounts = stats?.overallStats?.[0] || {
    total_requests: 0,
    pending_requests: 0,
    completed_requests: 0,
    rejected_requests: 0
  };

  // ✅ FIX: Check if stats object exists and has valid data
  const statsLoaded = Boolean(
    stats &&
    stats.overallStats &&
    Array.isArray(stats.overallStats) &&
    stats.overallStats.length > 0 &&
    stats.overallStats[0] &&
    typeof stats.overallStats[0].total_forms !== 'undefined'
  );

  // Debug logging for stats
  useEffect(() => {
    console.log('📊 Stats State Updated:', {
      statsExists: !!stats,
      statsIsNull: stats === null,
      hasOverallStats: !!stats?.overallStats,
      overallStatsIsArray: Array.isArray(stats?.overallStats),
      overallStatsLength: stats?.overallStats?.length,
      firstStatData: stats?.overallStats?.[0],
      statusCounts: statusCounts,
      statsLoaded: statsLoaded,
      fullStats: stats
    });
  }, [stats, statusCounts, statsLoaded]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner text="Loading Dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Standalone Header */}
      <GlassCard className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg
            ${isDark ? 'bg-red-700/80 shadow-red-900/30' : 'bg-jecrc-red shadow-jecrc-red/20'}`}>
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl font-bold transition-all duration-700
              ${isDark ? 'text-red-200' : 'text-jecrc-red'}`}>
              JECRC Admin
            </h1>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No Dues Management System
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Tab Switcher - Scrollable on mobile */}
          <div className="flex p-1 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center ${activeTab === 'dashboard'
                  ? 'bg-white dark:bg-jecrc-red text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('support')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[44px] ${activeTab === 'support'
                  ? 'bg-white dark:bg-jecrc-red text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
              >
                <Headphones className="w-4 h-4 flex-shrink-0" />
                Support
              </button>
              <button
                onClick={() => router.push('/admin/staff')}
                className="px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap min-h-[44px] text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                Staff
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] flex items-center justify-center ${activeTab === 'settings'
                  ? 'bg-white dark:bg-jecrc-red text-black dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
              >
                Settings
              </button>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors min-h-[44px]"
          >
            {isLoggingOut ? (
              <LoadingSpinner size="sm" color="border-red-500" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </GlassCard>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold transition-all duration-700
            ${isDark ? 'text-red-200' : 'text-jecrc-red'}`}>
            Overview
          </h2>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Real-time Status & Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Live • Updated {lastUpdate.toLocaleTimeString()}
            </span>
          </div>
          <button
            onClick={refreshData}
            disabled={refreshing}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${isDark
                ? 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
              } disabled:opacity-50`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-fade-in">
          {/* Stats Grid - Always renders with fallback values */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">


            <div
              onClick={() => {
                setStatusFilter('completed');
                // Smooth scroll to table after filter update
                setTimeout(() => {
                  scrollToTable();
                }, 100);
              }}
              className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
              title="Click to view completed requests"
            >
              <StatsCard
                title="Completed"
                value={statusCounts?.completed_requests || 0}
                change={statusCounts?.total_requests ? `${((statusCounts.completed_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%` : '0%'}
                trend="up"
                color="bg-green-500"
              />
            </div>

            <div
              onClick={() => {
                setStatusFilter('pending');
                // Smooth scroll to table after filter update
                setTimeout(() => {
                  scrollToTable();
                }, 100);
              }}
              className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
              title="Click to view pending requests"
            >
              <StatsCard
                title="Pending"
                value={statusCounts?.pending_requests || 0}
                change={statusCounts?.total_requests ? `${((statusCounts.pending_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%` : '0%'}
                trend="down"
                color="bg-yellow-500"
              />
            </div>

            <div
              onClick={() => {
                setStatusFilter('rejected');
                // Smooth scroll to table after filter update
                setTimeout(() => {
                  scrollToTable();
                }, 100);
              }}
              className="cursor-pointer transform transition-all duration-300 hover:scale-105 active:scale-95"
              title="Click to view rejected requests"
            >
              <StatsCard
                title="Rejected"
                value={statusCounts?.rejected_requests || 0}
                change={statusCounts?.total_requests ? `${((statusCounts.rejected_requests / Math.max(statusCounts.total_requests, 1)) * 100).toFixed(1)}%` : '0%'}
                trend="down"
                color="bg-red-500"
              />
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6">
              {stats?.departmentStats && <DepartmentPerformanceChart data={stats.departmentStats} key={lastUpdate.getTime()} />}
            </GlassCard>
            <GlassCard className="p-6">
              <RequestTrendChart userId={userId} lastUpdate={lastUpdate} />
            </GlassCard>
          </div>

          {/* Active Filter Pills */}
          <FilterPills
            filters={{
              status: statusFilter,
              search: searchTerm,
              department: departmentFilter
            }}
            onRemoveFilter={(filterKey) => {
              if (filterKey === 'status') setStatusFilter('');
              if (filterKey === 'search') setSearchTerm('');
              if (filterKey === 'department') setDepartmentFilter('');
            }}
            onClearAll={() => {
              setStatusFilter('');
              setSearchTerm('');
              setDepartmentFilter('');
            }}
            isDark={isDark}
          />

          {/* Filter & Actions Bar */}
          <div className={`flex flex-col md:flex-row gap-4 justify-between items-center p-4 rounded-xl border
            ${isDark ? 'bg-red-950/30 border-red-900/30' : 'bg-red-50/70 border-red-100'}`}>
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 max-w-md">
                <SearchBar
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder="Search requests..."
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-red-600 outline-none text-sm min-h-[44px] dark:[&>option]:bg-[#0f0f0f] dark:[&>option]:text-white"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-4 py-2.5 rounded-lg bg-white dark:bg-[#111111] border border-gray-200 dark:border-white/10 focus:ring-2 focus:ring-red-600 outline-none text-sm min-h-[44px] dark:[&>option]:bg-[#0f0f0f] dark:[&>option]:text-white"
              >
                <option value="">All Departments</option>
                {departments
                  .filter(dept => dept.is_active)
                  .sort((a, b) => a.display_order - b.display_order)
                  .map(dept => (
                    <option key={dept.name} value={dept.name}>
                      {dept.display_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  exportStatsToCSV(stats);
                  toast.success("Stats exported successfully");
                }}
                className="px-4 py-2 bg-jecrc-red hover:bg-jecrc-red-dark text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
              >
                Export Stats
              </button>
              <button
                onClick={() => {
                  exportApplicationsToCSV(applications);
                  toast.success("Data exported successfully");
                }}
                className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
              >
                Export Data
              </button>
            </div>
          </div>

          {/* Data Table */}
          <GlassCard className="overflow-hidden" data-table="applications">
            <ApplicationsTable
              applications={applications}
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </GlassCard>
        </div>
      ) : activeTab === 'support' ? (
        <div className="animate-fade-in">
          <TabbedSupportTickets />
        </div>
      ) : (
        <GlassCard className="p-6 animate-fade-in">
          <AdminSettings />
        </GlassCard>
      )}
    </div>
  );
}
