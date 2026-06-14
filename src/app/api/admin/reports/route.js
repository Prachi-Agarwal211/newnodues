export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const reportType = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let reportData = {};

    switch (reportType) {
      case 'department-performance':
        // Get department performance report
        const { data: deptPerformance, error: deptError } = await supabaseAdmin
          .from('no_dues_status')
          .select(`
            department_name,
            status,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM (action_at - created_at))) as avg_response_time_seconds
          `)
          .not('action_at', 'is', null)
          .group('department_name, status')
          .order('department_name');

        if (deptError) {
          throw deptError;
        }

        // Transform data for better readability
        const performanceByDept = {};
        deptPerformance.forEach(item => {
          if (!performanceByDept[item.department_name]) {
            performanceByDept[item.department_name] = {
              approved: 0,
              rejected: 0,
              pending: 0,
              avg_response_time: 0
            };
          }
          performanceByDept[item.department_name][item.status] = parseInt(item.count);
          performanceByDept[item.department_name].avg_response_time = item.avg_response_time_seconds;
        });

        reportData = {
          ...performanceByDept,
          summary: Object.keys(performanceByDept).map(dept => ({
            department: dept,
            ...performanceByDept[dept],
            avg_response_time_formatted: formatTime(performanceByDept[dept].avg_response_time)
          }))
        };
        break;

      case 'requests-over-time':
        // Get requests grouped by date
        const { data: requestsOverTime, error: timeError } = await supabaseAdmin
          .from('no_dues_forms')
          .select(`
            created_at,
            status
          `)
          .gte('created_at', startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .lte('created_at', endDate || new Date().toISOString());

        if (timeError) {
          throw timeError;
        }

        // Group by date
        const groupedByDate = {};
        requestsOverTime.forEach(req => {
          const date = new Date(req.created_at).toISOString().split('T')[0];
          if (!groupedByDate[date]) {
            groupedByDate[date] = { pending: 0, completed: 0, rejected: 0 };
          }
          if (req.status === 'in_progress' || req.status === 'pending') {
            groupedByDate[date].pending++;
          } else {
            groupedByDate[date][req.status]++;
          }
        });

        reportData = {
          dates: Object.keys(groupedByDate).sort(),
          data: groupedByDate
        };
        break;

      case 'pending-analysis':
        // Get detailed pending request analysis
        const { data: pendingAnalysis, error: pendingError } = await supabaseAdmin
          .from('no_dues_status')
          .select(`
            department_name,
            status,
            created_at,
            no_dues_forms!inner (
              student_name,
              registration_no,
              created_at as form_created_at
            )
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (pendingError) {
          throw pendingError;
        }

        reportData = pendingAnalysis;
        break;

      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    return NextResponse.json({
      reportType,
      startDate,
      endDate,
      data: reportData
    });

  } catch (error) {
    console.error('Admin reports API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatTime(seconds) {
  if (!seconds) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}