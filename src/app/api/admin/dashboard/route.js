export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import adminDashboardService from '@/lib/adminDashboardService';
import applicationService from '@/lib/services/ApplicationService';

// ✅ CRITICAL FIX: Force Supabase to bypass Next.js server-side caching
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, {
          ...options,
          cache: 'no-store',
        });
      },
    },
  }
);

// ⚡ PERFORMANCE: Response cache with 30-second TTL
const dashboardCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status');
    const departments = searchParams.getAll('departments').filter(Boolean);
    const schools = searchParams.getAll('schools').filter(Boolean);
    const courses = searchParams.getAll('courses').filter(Boolean);
    const branches = searchParams.getAll('branches').filter(Boolean);
    const admissionYear = searchParams.get('admissionYear');
    const passingYear = searchParams.get('passingYear');
    const priority = searchParams.get('priority');
    const searchQuery = searchParams.get('search');
    const sortField = searchParams.get('sortField') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const includeStats = searchParams.get('includeStats') === 'true';
    
    // ⚡ PERFORMANCE: Generate cache key from ALL request params
    const cacheKey = [
      'dashboard', page, limit,
      status || 'all',
      departments.join(',') || 'all',
      schools.join(',') || 'all',
      courses.join(',') || 'all',
      branches.join(',') || 'all',
      admissionYear || 'all',
      passingYear || 'all',
      priority || 'all',
      searchQuery || 'none',
      sortField, sortOrder, includeStats
    ].join('_');
    
    // ⚡ PERFORMANCE: Check cache first
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('📦 Returning cached dashboard data');
      return NextResponse.json(cached.data);
    }

    // Get authenticated user from header/cookie via Supabase
    const authHeader = request.headers.get('Authorization');
    let userId;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = user.id;
    } else {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⚡ Fetching fresh dashboard data...');
    const startTime = Date.now();

    // ⚡ PERFORMANCE: Optimized query - only select needed columns
    // ✅ FIXED: Table now only contains online forms (manual entries in separate table)
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        school,
        contact_no,
        status,
        created_at,
        updated_at,
        reapplication_count,
        rejection_context,
        certificate_status,
        certificate_generated_at,
        final_certificate_generated,
        certificate_url,
        certificate_error,
        no_dues_status!inner (
          id,
          department_name,
          status,
          action_at,
          created_at,
          rejection_reason,
          profiles (
            full_name
          )
        )
      `)
      .order(sortField, { ascending: sortOrder === 'asc' });

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply department filter - filter by department status
    if (departments && departments.length > 0) {
      // Get forms that have this department in their status
      const { data: formsWithDept } = await supabaseAdmin
        .from('no_dues_status')
        .select('form_id')
        .in('department_name', departments);
      
      if (formsWithDept && formsWithDept.length > 0) {
        const formIds = formsWithDept.map(f => f.form_id);
        query = query.in('id', formIds);
      } else {
        // No forms found for this department, return empty
        query = query.eq('id', '00000000-0000-0000-0000-000000000000'); // Non-existent UUID
      }
    }

    if (schools && schools.length > 0) {
      query = query.in('school', schools);
    }
    
    if (courses && courses.length > 0) {
      query = query.in('course', courses);
    }
    
    if (branches && branches.length > 0) {
      query = query.in('branch', branches);
    }

    // Apply search filter
    if (searchQuery) {
      query = query.or(
        `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
      );
    }

    // Build a separate count query with the SAME filters applied
    let countQuery = supabaseAdmin
      .from('no_dues_forms')
      .select('id', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    if (departments && departments.length > 0) {
      const { data: formsWithDeptCount } = await supabaseAdmin
        .from('no_dues_status')
        .select('form_id')
        .in('department_name', departments);

      if (formsWithDeptCount && formsWithDeptCount.length > 0) {
        const formIds = formsWithDeptCount.map(f => f.form_id);
        countQuery = countQuery.in('id', formIds);
      } else {
        countQuery = countQuery.eq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    if (schools && schools.length > 0) {
      countQuery = countQuery.in('school', schools);
    }
    if (courses && courses.length > 0) {
      countQuery = countQuery.in('course', courses);
    }
    if (branches && branches.length > 0) {
      countQuery = countQuery.in('branch', branches);
    }
    if (searchQuery) {
      countQuery = countQuery.or(
        `student_name.ilike.%${searchQuery}%,registration_no.ilike.%${searchQuery}%,course.ilike.%${searchQuery}%`
      );
    }

    // Apply pagination to data query
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute count and data queries in parallel
    const [applicationsResult, countResult] = await Promise.all([
      query,
      countQuery
    ]);

    const { data: applications, error: applicationsError } = applicationsResult;
    const { count: totalCount, error: countError } = countResult;

    if (applicationsError) {
      throw applicationsError;
    }

    if (countError) {
      console.error('Count error:', countError);
      // Don't fail request if count fails
    }

    // ⚡ PERFORMANCE: Optimized metrics calculation
    const applicationsWithMetrics = applications.map(app => {
      const statuses = app.no_dues_status || [];
      let pendingCount = 0;
      let completedCount = 0;
      
      // Single pass through statuses
      const statusWithMetrics = statuses.map(status => {
        if (status.status === 'pending') pendingCount++;
        if (status.status === 'approved') completedCount++;
        
        return {
          ...status,
          response_time: calculateResponseTime(app.created_at, status.created_at, status.action_at)
        };
      });

      const totalResponseTime = calculateTotalResponseTime(statusWithMetrics);

      return {
        ...app,
        no_dues_status: statusWithMetrics,
        total_response_time: totalResponseTime,
        pending_departments: pendingCount,
        completed_departments: completedCount
      };
    });

    const responseData = {
      applications: applicationsWithMetrics,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    };

    // ⚡ PERFORMANCE: Include stats in same response if requested
    if (includeStats) {
      try {
        console.log('📊 Including stats in dashboard response...');
        
        // Parallel queries for stats (same as admin/stats API)
        const [
          overallStatsResult,
          departmentWorkloadResult,
          allStatusesResult,
          activityAndAlertsResult
        ] = await Promise.all([
          supabaseAdmin.rpc('get_form_statistics'),
          supabaseAdmin.rpc('get_department_workload'),
          supabaseAdmin
            .from('no_dues_status')
            .select('department_name, status, created_at, action_at')
            .not('action_at', 'is', null),
          Promise.all([
            supabaseAdmin
              .from('no_dues_status')
              .select('id, action_at, department_name, status, no_dues_forms!inner(student_name, registration_no)')
              .gte('action_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
              .order('action_at', { ascending: false })
              .limit(50),
            supabaseAdmin
              .from('no_dues_status')
              .select('id, created_at, department_name, no_dues_forms!inner(student_name, registration_no, created_at)')
              .eq('status', 'pending')
              .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
              .order('created_at', { ascending: true })
              .limit(20)
          ])
        ]);

        const { data: overallStats } = overallStatsResult;
        const { data: departmentWorkload } = departmentWorkloadResult;
        const { data: allStatuses } = allStatusesResult;
        const [recentActivityResult, pendingAlertsResult] = activityAndAlertsResult;
        const { data: recentActivity } = recentActivityResult;
        const { data: pendingAlerts } = pendingAlertsResult;

        // Calculate department performance stats
        const departmentStatsMap = new Map();
        if (departmentWorkload) {
          departmentWorkload.forEach(dept => {
            const total = Number(dept.pending_count || 0) + Number(dept.approved_count || 0) + Number(dept.rejected_count || 0);
            const approved = Number(dept.approved_count || 0);
            const rejected = Number(dept.rejected_count || 0);
            
            departmentStatsMap.set(dept.department_name, {
              department_name: dept.department_name,
              total_requests: total,
              approved_requests: approved,
              rejected_requests: rejected,
              pending_requests: Number(dept.pending_count || 0),
              response_times: [],
              approval_rate: total > 0 ? ((approved / total) * 100).toFixed(2) + '%' : '0%',
              rejection_rate: total > 0 ? ((rejected / total) * 100).toFixed(2) + '%' : '0%'
            });
          });
        }

        // Calculate response times
        if (allStatuses) {
          allStatuses.forEach(status => {
            if (status.action_at && status.created_at) {
              const responseTime = (new Date(status.action_at) - new Date(status.created_at)) / 1000;
              const deptStats = departmentStatsMap.get(status.department_name);
              if (deptStats) {
                deptStats.response_times.push(responseTime);
              }
            }
          });
        }

        // Format department stats
        const formattedDepartmentStats = Array.from(departmentStatsMap.values()).map(dept => {
          const avgResponseTime = dept.response_times.length > 0
            ? dept.response_times.reduce((sum, time) => sum + time, 0) / dept.response_times.length
            : 0;

          return {
            department_name: dept.department_name,
            total_requests: dept.total_requests,
            approved_requests: dept.approved_requests,
            rejected_requests: dept.rejected_requests,
            pending_requests: dept.pending_requests,
            avg_response_time: formatTime(avgResponseTime),
            avg_response_time_seconds: avgResponseTime,
            approval_rate: dept.approval_rate,
            rejection_rate: dept.rejection_rate
          };
        }).sort((a, b) => a.department_name.localeCompare(b.department_name));

        responseData.stats = {
          overallStats: [{
            total_forms: Number(overallStats?.total_applications || 0),
            total_requests: Number(overallStats?.total_applications || 0),
            pending_requests: Number(overallStats?.pending_applications || 0),
            in_progress_requests: Number(overallStats?.in_progress_applications || 0),
            completed_requests: Number(overallStats?.completed_applications || 0),
            rejected_requests: Number(overallStats?.rejected_applications || 0),
            reapplied_requests: Number(overallStats?.reapplied_applications || 0)
          }],
          departmentStats: formattedDepartmentStats,
          recentActivity: recentActivity || [],
          pendingAlerts: pendingAlerts || []
        };

        console.log('✅ Stats included in dashboard response');
      } catch (statsError) {
        console.error('Error fetching stats:', statsError);
        // Don't fail the whole request if stats fail
      }
    }

    // ⚡ PERFORMANCE: Cache the response
    dashboardCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    const queryTime = Date.now() - startTime;
    console.log(`✅ Dashboard data fetched in ${queryTime}ms`);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error.message,
      details: error.details,
      hint: error.hint
    }, { status: 500 });
  }
}

// Helper function for response time calculation
function calculateResponseTime(created_at, updated_at, action_at) {
  if (!action_at) return 'Pending';

  const created = new Date(created_at);
  const action = new Date(action_at);
  const diff = action - created;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function calculateTotalResponseTime(statuses) {
  const completed = statuses.filter(s => s.status === 'approved' && s.action_at);
  if (completed.length === 0) return 'N/A';

  const totalTime = completed.reduce((sum, status) => {
    if (status.action_at) {
      const created = new Date(status.created_at);
      const action = new Date(status.action_at);
      return sum + (action - created);
    }
    return sum;
  }, 0);

  const avgTime = totalTime / completed.length;
  const hours = Math.floor(avgTime / (1000 * 60 * 60));
  const minutes = Math.floor((avgTime % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Helper function for response time formatting (used in stats)
function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

// ⚡ PERFORMANCE: Cache invalidation endpoint for real-time updates
export async function DELETE(request) {
  try {
    dashboardCache.clear();
    console.log('🗑️ Dashboard cache cleared');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}