'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { realtimeManager } from '@/lib/realtimeManager';
import { realtimeService } from '@/lib/supabaseRealtime';

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

  // ENHANCED Manual refresh function with real-time sync
  const refreshData = useCallback(async (force = false) => {
    console.log('🔄 Manual refresh triggered - force:', force);

    const promises = [];

    if (fetchDashboardDataRef.current) {
      promises.push(fetchDashboardDataRef.current(currentSearchRef.current, true));
    }

    if (force && fetchStatsRef.current) {
      promises.push(fetchStatsRef.current());
    }

    // Trigger real-time sync event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dashboard-refresh', {
        detail: { timestamp: Date.now(), force }
      }));
    }

    try {
      await Promise.all(promises);
      console.log('✅ Dashboard refresh completed successfully');
    } catch (error) {
      console.error('❌ Dashboard refresh failed:', error);
    }
  }, []);

  // PERFORMANCE: Combined initial load
  useEffect(() => {
    if (userId) {
      fetchDashboardData();
    }
  }, [userId]);

  // REAL-TIME SUBSCRIPTION - ENHANCED FOR AUTOMATIC UPDATES
  useEffect(() => {
    if (!userId || !user?.department_name) return;

    let unsubscribeRealtime;
    let unsubscribeGlobal;
    let retryTimeout;
    let debounceTimer = null;

    const setupRealtime = async () => {
      console.log('🔌 Staff dashboard setting up AUTOMATIC realtime for', user.department_name);

      // IMMEDIATE UPDATES - No debounce for critical changes
      const immediateUpdate = (updateType, data) => {
        console.log(`⚡ IMMEDIATE UPDATE: ${updateType}`, data);

        if (updateType === 'status_change') {
          // Update local state instantly for status changes
          setRequests(prevRequests => {
            const newRequests = [...prevRequests];
            const formId = data.formId || data.new?.form_id;
            const newStatus = data.status || data.new?.status;
            const index = newRequests.findIndex(r => r.no_dues_forms.id === formId);

            if (index !== -1) {
              // Update existing request in place
              newRequests[index] = {
                ...newRequests[index],
                status: newStatus,
                action_at: data.action_at || data.new?.action_at || newRequests[index].action_at
              };
              console.log(`✅ Instantly updated request ${formId} status to ${newStatus}`);
            } else {
              // New request - fetch latest data
              console.log('🆕 New request detected, fetching latest data');
              fetchDashboardDataRef.current(currentSearchRef.current, true);
            }

            return newRequests;
          });

          // Update stats after status change
          setTimeout(() => {
            if (fetchStatsRef.current) {
              fetchStatsRef.current();
            }
          }, 500);
        } else if (updateType === 'new_application') {
          // New application - refresh immediately
          console.log('🚀 New application - immediate refresh');
          fetchDashboardDataRef.current(currentSearchRef.current, true);
        } else if (updateType === 'bulk_action') {
          // Bulk action completed - refresh data
          console.log('📋 Bulk action completed - refreshing data');
          fetchDashboardDataRef.current(currentSearchRef.current, true);
        }
      };

      // ENHANCED REALTIME SUBSCRIPTION
      unsubscribeRealtime = realtimeService.subscribeToDepartment(user.department_name, {
        onStatusUpdate: (event) => {
          console.log('⚡ Department status update received - AUTOMATIC UI UPDATE');
          immediateUpdate('status_change', {
            formId: event.data.new?.form_id || event.data.form_id,
            status: event.data.new?.status || event.data.status,
            action_at: event.data.new?.action_at
          });
        },
        onNewApplication: (event) => {
          console.log('🚀 New application received - AUTOMATIC REFRESH');
          immediateUpdate('new_application', event.data);
        },
        onMessage: (event) => {
          console.log('💬 New message received - update unread counts');
          // Trigger unread message count refresh
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('refresh-unread-counts'));
          }, 100);
        }
      });

      // Also subscribe to global updates for form completions
      unsubscribeGlobal = realtimeManager.subscribe('globalUpdate', (analysis) => {
        if (analysis.hasCompletion) {
          console.log('🎯 Form completion detected - AUTOMATIC REFRESH');
          immediateUpdate('new_application', { completion: true });
        }
      });

      // Listen for bulk action completions
      window.addEventListener('bulk-action-completed', (e) => {
        immediateUpdate('bulk_action', e.detail);
      });

      // Listen for individual action completions
      window.addEventListener('individual-action-completed', (e) => {
        console.log('🎯 Individual action completed - AUTOMATIC REFRESH');
        immediateUpdate('status_change', {
          formId: e.detail.formId,
          status: e.detail.action === 'approve' ? 'approved' : 'rejected',
          action_at: e.detail.timestamp
        });
      });

      // Listen for department action completions (NEW)
      window.addEventListener('department-action-completed', (e) => {
        console.log('🏢 Department action completed - IMMEDIATE REFRESH');
        immediateUpdate('status_change', {
          formId: e.detail.formId,
          status: e.detail.status,
          action_at: e.detail.timestamp
        });
      });

      // ✅ CRITICAL: Listen for force refresh events from broadcast handler
      // This is the most reliable path for new form submission updates
      const handleForceRefresh = (e) => {
        console.log('🔄 Force dashboard refresh received:', e.detail);
        if (fetchDashboardDataRef.current) {
          console.log('🚀 Executing immediate dashboard data fetch');
          fetchDashboardDataRef.current(currentSearchRef.current, true);
        }
      };
      window.addEventListener('force-dashboard-refresh', handleForceRefresh);

      return () => {
        if (unsubscribeRealtime) {
          unsubscribeRealtime();
        }
        unsubscribeGlobal();
        window.removeEventListener('bulk-action-completed', immediateUpdate);
        window.removeEventListener('individual-action-completed', immediateUpdate);
        window.removeEventListener('department-action-completed', immediateUpdate);
        window.removeEventListener('force-dashboard-refresh', handleForceRefresh);
      };
    };

    const cleanup = setupRealtime();

    return () => {
      console.log('🧹 Staff dashboard cleaning up AUTOMATIC realtime subscriptions');
      if (retryTimeout) clearTimeout(retryTimeout);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
      // Call the cleanup function returned by setupRealtime (handles all event listeners)
      if (cleanup) cleanup();
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
