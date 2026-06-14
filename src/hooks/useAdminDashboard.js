'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { realtimeManager } from '@/lib/realtimeManager';
import { subscribeToRealtime } from '@/lib/supabaseRealtime';

export function useAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Store current filters for refresh
  const currentFiltersRef = useRef({});
  
  // ✅ FIX: Store current page in ref to avoid stale closures
  const currentPageRef = useRef(1);

  // Use refs to store latest functions and avoid stale closures
  const fetchDashboardDataRef = useRef(null);
  const fetchStatsRef = useRef(null);
  
  // ⚡ PERFORMANCE: Request deduplication with queued re-fetch
  const pendingDashboardRequest = useRef(null);
  const pendingStatsRequest = useRef(null);
  const queuedFiltersRef = useRef(null);

  // Fetch user data
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // ✅ Use Next.js router instead of window.location
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || userData.role !== 'admin') {
        // ✅ Use Next.js router instead of window.location
        router.push('/unauthorized');
        return;
      }

      setUser(userData);
      setUserId(session.user.id);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
    }
  };

  const fetchDashboardData = useCallback(async (filters = {}, isRefresh = false, pageOverride = null) => {
    // Always store the latest filters for real-time refresh
    if (Object.keys(filters).length > 0) {
      currentFiltersRef.current = filters;
    }

    // ⚡ FIX: If already fetching, queue the latest filters for re-fetch after completion
    if (pendingDashboardRequest.current) {
      console.log('⏭️ Dashboard fetch in progress, queueing latest filters...');
      queuedFiltersRef.current = { filters, isRefresh, pageOverride };
      return pendingDashboardRequest.current;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          throw new Error('Session expired. Please login again.');
        }

        // ✅ REAL-TIME: Use actual timestamp for immediate updates
        const params = new URLSearchParams({
          page: pageOverride !== null ? pageOverride : currentPageRef.current,
          limit: 20,
          includeStats: 'true', // ⚡ OPTIMIZATION: Fetch stats in same request
          ...filters,
          _t: Date.now()
        });

        console.log('🔍 Fetching admin dashboard with params:', Object.fromEntries(params));

        const response = await fetch(`/api/admin/dashboard?${params}`, {
          method: 'GET',
          cache: 'no-store', // ✅ Disable cache for real-time stats
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const result = await response.json();

        console.log('📦 API Response:', {
          ok: response.ok,
          status: response.status,
          applicationsCount: result.applications?.length,
          firstApp: result.applications?.[0]?.registration_no
        });

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }

        setApplications(result.applications || []);
        setTotalItems(result.pagination?.total || 0);
        setTotalPages(result.pagination?.totalPages || 1);
        
        // ⚡ OPTIMIZATION: Set stats from combined response
        if (result.stats) {
          setStats(result.stats);
          console.log('✅ Stats updated from dashboard response');
        }
        
        setLastUpdate(new Date());

        console.log('✅ Admin dashboard state updated:', result.applications?.length, 'applications');
      } catch (error) {
        console.error('❌ Error fetching dashboard data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
        pendingDashboardRequest.current = null;

        // ⚡ FIX: Process queued request if filters changed during fetch
        if (queuedFiltersRef.current) {
          const queued = queuedFiltersRef.current;
          queuedFiltersRef.current = null;
          console.log('🔄 Processing queued dashboard fetch with latest filters');
          fetchDashboardDataRef.current(queued.filters, queued.isRefresh, queued.pageOverride);
        }
      }
    })();

    pendingDashboardRequest.current = fetchPromise;
    return fetchPromise;
  }, []);

  // Store latest function in ref
  fetchDashboardDataRef.current = fetchDashboardData;

  const fetchStats = useCallback(async () => {
    console.log('🔄 fetchStats called');
    
    // ⚡ PERFORMANCE: If already fetching, return existing promise
    if (pendingStatsRequest.current) {
      console.log('⏭️ Stats fetch already in progress, reusing...');
      return pendingStatsRequest.current;
    }

    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          console.log('❌ No session found for stats fetch');
          return;
        }

        console.log('📡 Fetching stats from API...');
        // ✅ REAL-TIME: No caching for immediate stats updates
        const response = await fetch(`/api/admin/stats`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        const result = await response.json();

        console.log('📊 Stats API response:', {
          ok: response.ok,
          status: response.status,
          overallStats: result.overallStats,
          departmentCount: result.departmentStats?.length
        });

        if (response.ok) {
          // ✅ FIX: Format stats to match what AdminDashboard expects
          // The stats API returns: totalApplications, pendingApplications, approvedApplications, rejectedApplications
          // AdminDashboard expects: total_requests, pending_requests, completed_requests, rejected_requests
          const formattedStats = {
            overallStats: [{
              total_forms: result.overallStats?.totalApplications || 0,
              total_requests: result.overallStats?.totalApplications || 0,
              pending_requests: result.overallStats?.pendingApplications || 0,
              completed_requests: result.overallStats?.completedApplications || 0,
              rejected_requests: result.overallStats?.rejectedApplications || 0,
              reapplied_requests: result.overallStats?.reappliedApplications || 0
            }],
            departmentStats: (result.departmentStats || []).map(dept => ({
              ...dept,
              completed_requests: dept.completed_count || dept.approved_count || 0
            })),
            recentActivity: result.recentActivity || []
          };
          
          setStats(formattedStats);
          console.log('✅ Stats updated successfully');
        } else {
          console.error('❌ Stats API returned error:', result);
          setError('Failed to load statistics');
        }
      } catch (error) {
        console.error('❌ Error fetching stats:', error);
        setError('Failed to load statistics');
      } finally {
        pendingStatsRequest.current = null;
      }
    })();

    pendingStatsRequest.current = fetchPromise;
    return fetchPromise;
  }, []);

  // Store latest function in ref
  fetchStatsRef.current = fetchStats;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // ✅ Use Next.js router instead of window.location
    router.push('/login');
  };

  // Manual refresh function - stable reference using refs to avoid stale closures
  // ✅ FIX: Returns Promise.all() so RealtimeManager can prevent race conditions
  const refreshData = useCallback(() => {
    console.log('🔄 Refresh triggered - updating dashboard with stats');

    // Force refresh by setting refreshing state
    setRefreshing(true);

    const promises = [];

    // ⚡ OPTIMIZATION: Dashboard fetch now includes stats, no separate call needed
    if (fetchDashboardDataRef.current) {
      // ✅ FIX: For new submissions, jump to Page 1 to see them
      // If you want to stay on current page, change 1 to currentPageRef.current
      promises.push(fetchDashboardDataRef.current(currentFiltersRef.current, true, 1));
    }

    // ⚡ REMOVED: Separate stats fetch - now included in dashboard response
    // Stats are automatically updated when dashboard is fetched with includeStats=true

    // Update last update timestamp to trigger re-render
    setLastUpdate(new Date());

    // ✅ CRITICAL: Return Promise.all() so manager knows when refresh completes
    return Promise.all(promises);
  }, []); // Empty deps - stable reference, uses refs only

  // ==================== REAL-TIME SUBSCRIPTION ====================
  // NEW ARCHITECTURE: Use centralized realtime service + event manager
  useEffect(() => {
    if (!userId) return;

    let unsubscribeRealtime;
    let unsubscribeGlobal;
    let retryTimeout;

    const setupRealtime = async () => {
      console.log('🔌 Admin dashboard setting up PUBLIC realtime');
      console.log('📡 Subscribing to global event stream (no auth required)');

      // Subscribe to PUBLIC global realtime service
      // No session check needed - channel is public
      // Dashboard access is already protected by middleware
      unsubscribeRealtime = await subscribeToRealtime();

      // Subscribe to specific events via RealtimeManager
      unsubscribeGlobal = realtimeManager.subscribe('globalUpdate', (analysis) => {
        console.log('📊 Admin dashboard received real-time update:', {
          affectedForms: analysis.formIds.length,
          eventTypes: analysis.eventTypes,
          newSubmission: analysis.hasNewSubmission,
          completion: analysis.hasCompletion,
          departmentAction: analysis.hasDepartmentAction
        });

        console.log('🔄 Triggering admin dashboard refresh from real-time event...');

        // Refresh immediately - no setTimeout delays that create race conditions
        // RealtimeManager already handles deduplication and batching
        console.log('🚀 Executing refreshData() for admin dashboard');
        refreshData();
      });
    };

    setupRealtime();

    return () => {
      console.log('🧹 Admin dashboard unsubscribing from realtime');
      if (retryTimeout) clearTimeout(retryTimeout);
      if (unsubscribeRealtime) unsubscribeRealtime();
      if (unsubscribeGlobal) unsubscribeGlobal();
    };
  }, [userId, refreshData]);
  
  // ✅ FIX: Sync currentPageRef whenever currentPage state changes
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  // ✅ SAFE: Memoize derived stats (doesn't affect real-time, just reduces re-calculations)
  const memoizedStats = useMemo(() => {
    if (!stats) return null;
    
    // Return stats as-is - let component handle the display logic
    // The memoization just prevents unnecessary re-renders
    return stats;
  }, [stats]); // Only recalculate when stats change

  // ✅ SAFE: Memoize pagination info
  const paginationInfo = useMemo(() => ({
    currentPage,
    totalPages,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    startItem: (currentPage - 1) * 20 + 1,
    endItem: Math.min(currentPage * 20, totalItems)
  }), [currentPage, totalPages, totalItems]);

  return {
    user,
    userId,
    loading,
    refreshing,
    applications,
    stats: memoizedStats, // Use memoized stats
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    lastUpdate,
    paginationInfo, // Add pagination helper
    fetchDashboardData,
    fetchStats,
    refreshData,
    handleLogout,
    // Manual refresh function for UI buttons
    handleManualRefresh: refreshData
  };
}