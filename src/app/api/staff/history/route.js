export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ CRITICAL FIX: Force Supabase to bypass all caching layers (same as Admin Dashboard)
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const statusFilter = searchParams.get('status'); // approved, rejected, or all
    const offset = (page - 1) * limit;

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
      .select('role, assigned_department_ids, full_name, school_id, school_ids, course_ids, branch_ids')
      .eq('id', userId)
      .single();

    if (profileError || !profile || (profile.role !== 'department' && profile.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ✅ FIXED: Resolve department names from UUID array (fallback to profile.department_name)
    const { data: depts } = await supabaseAdmin
      .from('departments')
      .select('name, display_name')
      .in('id', profile.assigned_department_ids || []);

    let myDeptNames = depts?.map(d => d.name) || [];
    if (myDeptNames.length === 0 && profile.department_name) {
      myDeptNames = [profile.department_name];
    }

    // Build query for action history (Online forms only)
    let query = supabaseAdmin
      .from('no_dues_status')
      .select(`
        id,
        form_id,
        department_name,
        status,
        rejection_reason,
        action_at,
        action_by_user_id,
        no_dues_forms!inner (
          id,
          student_name,
          registration_no,
          course,
          branch,
          contact_no,
          created_at,
          school_id,
          course_id,
          branch_id
        )
      `);

    // Filter by department if not admin
    if (profile.role === 'department') {
      query = query.in('department_name', myDeptNames); // ✅ FIXED: Use UUID-resolved names

      // Apply scope filtering
      if (profile.school_ids && profile.school_ids.length > 0) {
        query = query.in('no_dues_forms.school_id', profile.school_ids);
      } else if (profile.department_name === 'school_hod' && profile.school_id) {
        query = query.eq('no_dues_forms.school_id', profile.school_id);
      }

      if (profile.course_ids && profile.course_ids.length > 0) {
        query = query.in('no_dues_forms.course_id', profile.course_ids);
      }

      if (profile.branch_ids && profile.branch_ids.length > 0) {
        query = query.in('no_dues_forms.branch_id', profile.branch_ids);
      }

      // Show all department actions (not just this user's)
    }

    // Filter by status if provided
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    } else {
      // Show all statuses (includes pending) to match full department history
      query = query.in('status', ['approved', 'rejected', 'pending']);
    }

    // Apply pagination and ordering
    query = query
      .order('action_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: history, error: historyError } = await query;

    if (historyError) {
      console.error('Error fetching action history:', historyError);
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('no_dues_status')
      .select('*', { count: 'exact', head: true });

    if (profile.role === 'department') {
      countQuery = countQuery
        .in('department_name', myDeptNames); // ✅ FIXED: Use UUID-resolved names
    }

    if (statusFilter && statusFilter !== 'all') {
      countQuery = countQuery.eq('status', statusFilter);
    } else {
      countQuery = countQuery.in('status', ['approved', 'rejected', 'pending']);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        history: history || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        },
        staffName: profile.full_name,
        department: depts?.[0]?.display_name || myDeptNames[0] || 'Department'
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Staff History API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
