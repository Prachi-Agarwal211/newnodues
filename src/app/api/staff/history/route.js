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
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    // ... auth and profile lookup code remains same ...


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

    // ✅ REFACTORED: Use no_dues_forms as base table for robust searching
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        registration_no,
        course,
        branch,
        contact_no,
        created_at,
        school_id,
        course_id,
        branch_id,
        no_dues_status!inner (
          id,
          form_id,
          department_name,
          status,
          rejection_reason,
          action_at,
          action_by_user_id
        )
      `, { count: 'exact' });

    // Filter by department and scope
    query = query.in('no_dues_status.department_name', myDeptNames);

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('no_dues_status.status', statusFilter);
    } else {
      query = query.in('no_dues_status.status', ['approved', 'rejected', 'pending']);
    }

    // Apply scope filtering (if department role)
    if (profile.role === 'department') {
      if (profile.school_ids && profile.school_ids.length > 0) {
        query = query.in('school_id', profile.school_ids);
      }
      if (profile.course_ids && profile.course_ids.length > 0) {
        query = query.in('course_id', profile.course_ids);
      }
      if (profile.branch_ids && profile.branch_ids.length > 0) {
        query = query.in('branch_id', profile.branch_ids);
      }
    }

    // Robust Search Implementation
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,registration_no.ilike.%${search}%`);
    }

    // Apply pagination and ordering (sort by action_at from the joined table)
    query = query
      .order('action_at', { foreignTable: 'no_dues_status', ascending: false })
      .range(offset, offset + limit - 1);

    const { data: forms, error: historyError, count: totalCount } = await query;

    if (historyError) {
      console.error('Error fetching action history:', historyError);
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    // TRANSFORM: Map back to the format the UI expects
    const transformedHistory = (forms || []).map(form => {
      // The joined data is returned as an array due to 1-to-many relationship
      // but our filters ensure only one status per form per department exists
      const statusRow = Array.isArray(form.no_dues_status) ? form.no_dues_status[0] : form.no_dues_status;
      
      return {
        ...statusRow,
        no_dues_forms: {
          id: form.id,
          student_name: form.student_name,
          registration_no: form.registration_no,
          course: form.course,
          branch: form.branch,
          contact_no: form.contact_no,
          created_at: form.created_at,
          school_id: form.school_id,
          course_id: form.course_id,
          branch_id: form.branch_id
        }
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        history: transformedHistory,
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
