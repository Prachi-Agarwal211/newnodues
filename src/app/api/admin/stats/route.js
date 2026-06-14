export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ OPTIMIZED: Admin client with no-cache enforcement
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
);

export async function GET(request) {
  try {
    // 1. Secure Auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('⚡ Fetching admin stats via optimized RPC functions...');

    // 3. Parallel Fetch: Global Stats + Department Breakdown + Recent Activity
    const [overallResult, workloadResult, recentResult] = await Promise.all([
      supabaseAdmin.rpc('get_form_statistics'),
      supabaseAdmin.rpc('get_department_workload'),
      supabaseAdmin
        .from('no_dues_status')
        .select('id, department_name, status, action_at, no_dues_forms!inner(student_name, registration_no)')
        .neq('status', 'pending')
        .order('action_at', { ascending: false })
        .limit(10)
    ]);

    if (overallResult.error) throw overallResult.error;
    if (workloadResult.error) throw workloadResult.error;

    // 4. Data Normalization (Fixes the "0" bug)
    const rawStats = overallResult.data?.[0] || {};
    
    const overallStats = {
      totalApplications: Number(rawStats.total_applications || 0),
      pendingApplications: Number(rawStats.pending_applications || 0),
      completedApplications: Number(rawStats.completed_applications || 0),
      rejectedApplications: Number(rawStats.rejected_applications || 0)
    };

    // 5. Format Department Stats
    const departmentStats = (workloadResult.data || []).map(dept => ({
      department_name: dept.department_name,
      pending_count: Number(dept.pending_count || 0),
      completed_count: Number(dept.approved_count || 0),
      rejected_count: Number(dept.rejected_count || 0),
      total_requests: Number(dept.pending_count || 0) + Number(dept.approved_count || 0) + Number(dept.rejected_count || 0)
    }));

    return NextResponse.json({
      overallStats,
      departmentStats,
      recentActivity: recentResult.data || []
    });

  } catch (error) {
    console.error('❌ Admin Stats API Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch admin statistics',
      message: error.message
    }, { status: 500 });
  }
}
