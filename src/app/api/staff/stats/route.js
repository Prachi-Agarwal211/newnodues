export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
          cache: 'no-store', // Bypass Next.js fetch cache
        });
      },
    },
  }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get authenticated user from Authorization header
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

    // Get user profile to verify role and department
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, assigned_department_ids, department_name, school_id, school_ids, course_ids, branch_ids')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (profile.role !== 'department' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let stats = {};

    if (profile.role === 'admin') {
      // Admin gets comprehensive stats for all departments
      const { count: totalForms, error: totalError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true });

      const { count: completedForms, error: completedError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      const { count: pendingForms, error: pendingError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (totalError || completedError || pendingError) {
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      stats = {
        totalApplications: totalForms || 0,
        completedApplications: completedForms || 0,
        pendingApplications: pendingForms || 0,
        departmentStats: []
      };

      // Get department-specific stats - OPTIMIZED: Single query with aggregation
      const { data: departments, error: deptError } = await supabaseAdmin
        .from('departments')
        .select('name, display_name')
        .order('display_order');

      if (!deptError && departments) {
        // Single aggregated query instead of N+1 queries
        const { data: statusCounts, error: statusError } = await supabaseAdmin
          .from('no_dues_status')
          .select('department_name, status');

        if (!statusError && statusCounts) {
          // Aggregate counts in memory (much faster than N queries)
          const statsMap = {};

          statusCounts.forEach(record => {
            if (!statsMap[record.department_name]) {
              statsMap[record.department_name] = { pending: 0, approved: 0, rejected: 0 };
            }
            if (record.status === 'pending') {
              statsMap[record.department_name].pending++;
            } else if (record.status === 'approved') {
              statsMap[record.department_name].approved++;
            } else if (record.status === 'rejected') {
              statsMap[record.department_name].rejected++;
            }
          });

          // Map back to departments with display names
          stats.departmentStats = departments.map(dept => ({
            department: dept.display_name,
            departmentName: dept.name,
            pending: statsMap[dept.name]?.pending || 0,
            approved: statsMap[dept.name]?.approved || 0,
            rejected: statsMap[dept.name]?.rejected || 0,
            total: (statsMap[dept.name]?.pending || 0) + 
                   (statsMap[dept.name]?.approved || 0) + 
                   (statsMap[dept.name]?.rejected || 0)
          }));
        } else {
          stats.departmentStats = [];
        }
      }
    } else if (profile.role === 'department') {
      // ✅ NEW: Get department names from assigned UUIDs
      let myDepartments = [];
      let deptError;

      if (profile.assigned_department_ids && profile.assigned_department_ids.length > 0) {
        const result = await supabaseAdmin
          .from('departments')
          .select('id, name, display_name')
          .in('id', profile.assigned_department_ids);
        myDepartments = result.data || [];
        deptError = result.error;
      }

      // Fallback for legacy accounts with only department_name set
      if ((!myDepartments || myDepartments.length === 0) && profile.department_name) {
        const result = await supabaseAdmin
          .from('departments')
          .select('id, name, display_name')
          .eq('name', profile.department_name)
          .maybeSingle();
        if (result?.data) {
          myDepartments = [result.data];
        }
        deptError = result.error || deptError;
      }

      if (deptError || !myDepartments || myDepartments.length === 0) {
        return NextResponse.json({
          error: 'No departments assigned to your account. Contact administrator.'
        }, { status: 403 });
      }

      const myDeptNames = myDepartments.map(d => d.name);
      const isHOD = myDeptNames.includes('school_hod');

      console.log('📊 Stats API - User departments:', {
        userId,
        assignedDepartments: myDeptNames,
        isHOD
      });

      // ✅ FIXED: Get BOTH department-wide AND personal stats
      
      // 1. Get ALL statuses for my departments (for pending count - department-wide)
      let allStatusesQuery = supabaseAdmin
        .from('no_dues_status')
        .select(`
          status,
          action_by_user_id,
          action_at,
          no_dues_forms!inner (
            school_id,
            course_id,
            branch_id
          )
        `)
        .in('department_name', myDeptNames);

      // Apply HOD scope filtering if needed
      if (isHOD) {
        if (profile.school_ids && profile.school_ids.length > 0) {
          allStatusesQuery = allStatusesQuery.in('no_dues_forms.school_id', profile.school_ids);
        }
        if (profile.course_ids && profile.course_ids.length > 0) {
          allStatusesQuery = allStatusesQuery.in('no_dues_forms.course_id', profile.course_ids);
        }
        if (profile.branch_ids && profile.branch_ids.length > 0) {
          allStatusesQuery = allStatusesQuery.in('no_dues_forms.branch_id', profile.branch_ids);
        }
      }

      const { data: allStatuses, error: statusError } = await allStatusesQuery;

      if (statusError) {
        console.error('Error fetching stats:', statusError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      // 2. Get PENDING counts (these need action)
      console.log('📊 Stats API - Building pending query for:', {
        departments: myDeptNames,
        userId: userId,
        isHOD
      });

      let pendingQuery = supabaseAdmin
        .from('no_dues_status')
        .select(`
          status,
          no_dues_forms!inner (
            school_id,
            course_id,
            branch_id
          )
        `)
        .in('department_name', myDeptNames)
        .eq('status', 'pending');

      // IMPORTANT: Apply scope filtering ONLY for school_hod (HOD/Dean)
      // The other departments see ALL students (consistent with dashboard API)
      if (isHOD) {
        // Apply school filtering for HOD staff using UUID arrays
        if (profile.school_ids && profile.school_ids.length > 0) {
          pendingQuery = pendingQuery.in('no_dues_forms.school_id', profile.school_ids);
        }
        
        // Apply course filtering for HOD staff using UUID arrays
        if (profile.course_ids && profile.course_ids.length > 0) {
          pendingQuery = pendingQuery.in('no_dues_forms.course_id', profile.course_ids);
        }
        
        // Apply branch filtering for HOD staff using UUID arrays
        if (profile.branch_ids && profile.branch_ids.length > 0) {
          pendingQuery = pendingQuery.in('no_dues_forms.branch_id', profile.branch_ids);
        }
      }
      // For other departments: No additional filtering

      const { data: pendingActions, error: pendingError } = await pendingQuery;

      if (pendingError) {
        console.error('Error fetching pending stats:', pendingError);
        return NextResponse.json({ error: 'Error fetching stats' }, { status: 500 });
      }

      // ✅ FIXED: Count PERSONAL actions (approved/rejected by ME) + DEPARTMENT pending
      const approvedCount = allStatuses?.filter(s => s.status === 'approved').length || 0;
      const rejectedCount = allStatuses?.filter(s => s.status === 'rejected').length || 0;
      const totalCount = approvedCount + rejectedCount; // Total department actions
      const pendingCount = pendingActions?.length || 0; // Department-wide pending

      stats = {
        departments: myDepartments.map(d => d.display_name),
        department: myDepartments[0]?.display_name || profile.department_name,
        departmentName: myDepartments[0]?.name || profile.department_name,
        pending: pendingCount, // Applications awaiting action
        approved: approvedCount, // Total approved for this department
        rejected: rejectedCount, // Total rejected for this department
        total: totalCount, // Total applications handled
        approvalRate: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0
      };

      // ✅ FIXED: Today's activity - show MY actions today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayStatuses = allStatuses?.filter(s => {
        return s.action_at &&
               new Date(s.action_at) >= today &&
               s.action_by_user_id === userId; // Only MY actions
      }) || [];

      stats.todayApproved = todayStatuses.filter(s => s.status === 'approved').length;
      stats.todayRejected = todayStatuses.filter(s => s.status === 'rejected').length;
      stats.todayTotal = todayStatuses.length;
    }

    return NextResponse.json({ 
      success: true,
      stats 
    });
  } catch (error) {
    console.error('Error fetching staff stats:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
