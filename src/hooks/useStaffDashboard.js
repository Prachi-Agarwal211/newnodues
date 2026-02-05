'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { realtimeManager } from '@/lib/realtimeManager';
import { subscribeToRealtime } from '@/lib/supabaseRealtime';

export function useStaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Store current search term for refresh
  const currentSearchRef = useRef('');

  // Use refs to store latest functions and avoid stale closures
  const fetchDashboardDataRef = useRef(null);
  const fetchStatsRef = useRef(null);

  // REQUEST DEDUPLICATION: Prevent multiple simultaneous fetches
  const pendingDashboardRequest = useRef(null);
  const pendingStatsRequest = useRef(null);

  // TIMEOUT PROTECTION: Prevent infinite loading states
  const loadingTimeoutRef = useRef(null);
  const statsTimeoutRef = useRef(null);

  // PERFORMANCE: Fetch user data with minimal queries
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push('/staff/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('full_name, role, department_name')
        .eq('id', session.user.id)
        .single();

      // Allow admin, department, and staff roles to access dashboard
      if (userError || !userData || (userData.role !== 'department' && userData.role !== 'admin' && userData.role !== 'staff')) {
        router.push('/unauthorized');
        return;
      }

      setUser(userData);
      setUserId(session.user.id);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError(error.message);
      setLoading(false);
    }
  };

  // PERFORMANCE: Parallel fetch of dashboard + stats for instant load
  const fetchDashboardData = useCallback(async (searchTerm = '', isRefresh = false) => {
    // Store search term for real-time refresh
    currentSearchRef.current = searchTerm;

    // DEDUPLICATION: If already fetching, return existing promise
    if (pendingDashboardRequest.current) {
      console.log('⏭️ Dashboard fetch already in progress, reusing...');
      return pendingDashboardRequest.current;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    // TIMEOUT PROTECTION: Clear loading after 30 seconds max
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ Dashboard fetch timeout - clearing loading state');
      setLoading(false);
      setRefreshing(false);
      setError('Request timeout. Please try again.');
      pendingDashboardRequest.current = null;
    }, 30000);

    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          // Session ended (e.g., logout). Redirect without surfacing an error.
          router.push('/staff/login');
          return;
        }

        // Build query params with search term
        const params = new URLSearchParams({
          userId: session.user.id,
          page: 1,
          limit: 50,
          includeStats: 'true',
          _t: Date.now()
        });

        // Add search term if present
        if (searchTerm.trim()) {
          params.append('search', searchTerm.trim());
        }

        // CRITICAL: Single combined request for dashboard + stats
        const response = await fetch(`/api/staff/dashboard?${params}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch dashboard data');
        }

        if (result.success) {
          // Extract applications
          const applications = result.data.applications || [];

          // Filter out applications with null forms (orphaned records)
          const validApplications = applications.filter(item => {
            if (!item.no_dues_forms) {
              console.warn('⚠️ Orphaned status record found, skipping:', item.form_id);
              return false;
            }
            return true;
          });

          // Preserve full application object
          setRequests(validApplications);

          // PERFORMANCE: Set stats from same response
          if (result.data.stats) {
            setStats(result.data.stats);
          }

          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Avoid flashing errors during logout or session expiry
        if (error?.message !== 'Session expired. Please login again.') {
          setError(error.message);
        }
      } finally {
        if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
        setLoading(false);
        setRefreshing(false);
        pendingDashboardRequest.current = null;
      }
    })();

    pendingDashboardRequest.current = fetchPromise;
    return fetchPromise;
  }, []);

  // Store latest function in ref
  fetchDashboardDataRef.current = fetchDashboardData;

  // PERFORMANCE: Lazy load stats only if not included in dashboard response
  const fetchStats = useCallback(async () => {
    if (!userId) return;
    if (stats) return;

    if (pendingStatsRequest.current) {
      return pendingStatsRequest.current;
    }

    setStatsLoading(true);

    if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    statsTimeoutRef.current = setTimeout(() => {
      setStatsLoading(false);
      pendingStatsRequest.current = null;
    }, 20000);

    const fetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          router.push('/staff/login');
          return;
        }

        const response = await fetch(`/api/staff/stats?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch stats');
        }

        if (result.success) {
          setStats(result.stats);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
        setStatsLoading(false);
        pendingStatsRequest.current = null;
      }
    })();

    pendingStatsRequest.current = fetchPromise;
    return fetchPromise;
  }, [userId, stats]);

  // Store latest function in ref
  fetchStatsRef.current = fetchStats;

  // PERFORMANCE: Combined initial load
  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  // Manual refresh function
  const refreshData = useCallback(() => {
    const promises = [];

    if (fetchDashboardDataRef.current) {
      promises.push(fetchDashboardDataRef.current(currentSearchRef.current, true));
    }

    return Promise.all(promises);
  }, []);

  // REAL-TIME SUBSCRIPTION
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let unsubscribeDepartment;
    let unsubscribeGlobal;
    let retryTimeout;
    let debounceTimer = null;

    const setupRealtime = async () => {
      console.log('🔌 Staff dashboard setting up PUBLIC realtime for', user.department_name);

      // DEBOUNCED REFRESH
      const debouncedRefresh = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (fetchDashboardDataRef.current) {
            fetchDashboardDataRef.current(currentSearchRef.current, true);
          }
        }, 1000);
      };

      // SIMPLIFIED: Use unified subscription method
      unsubscribeDepartment = import('@/lib/supabaseRealtime').then(({ realtimeService }) => {
        return realtimeService.subscribeToDepartment(user.department_name, {
          onStatusUpdate: (event) => {
            console.log('⚡ Performing SILENT update for department actions');
            setRequests(prevRequests => {
              const newRequests = [...prevRequests];
              let needsSoftRefresh = false;

              const formId = event.data.new.form_id;
              const newStatus = event.data.new.status;
              const index = newRequests.findIndex(r => r.no_dues_forms.id === formId);

              if (index !== -1) {
                newRequests[index] = {
                  ...newRequests[index],
                  status: newStatus
                };
              } else {
                needsSoftRefresh = true;
              }

              if (needsSoftRefresh) debouncedRefresh();

              return newRequests;
            });
            refreshData();
          },
          onNewApplication: (event) => {
            console.log('🚀 New application received');
            debouncedRefresh();
          }
        });
      });

      // Also subscribe to global updates
      unsubscribeGlobal = realtimeManager.subscribe('globalUpdate', (analysis) => {
        if (analysis.hasCompletion) {
          debouncedRefresh();
        }
      });
    };

    setupRealtime();

    return () => {
      console.log('🧹 Staff dashboard unsubscribing from realtime');
      if (retryTimeout) clearTimeout(retryTimeout);
      if (debounceTimer) clearTimeout(debounceTimer);

      if (unsubscribeDepartment) {
        unsubscribeDepartment.then(unsub => unsub && unsub());
      }

      if (unsubscribeGlobal) unsubscribeGlobal();

      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    };
  }, [userId, user?.department_name]);

  return {
    user,
    userId,
    loading,
    refreshing,
    requests,
    stats,
    statsLoading,
    error,
    lastUpdate,
    fetchDashboardData,
    refreshData,
    fetchStats,
    handleManualRefresh: refreshData
  };
}
