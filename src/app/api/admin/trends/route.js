export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/admin/trends
 * Get request trends over time for admin dashboard
 * Returns monthly aggregated data for pending, completed, and rejected requests
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const months = parseInt(searchParams.get('months')) || 12;

    // Verify user is admin
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all forms with their creation dates and statuses
    const { data: forms, error: formsError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('created_at, status')
      .order('created_at', { ascending: true });

    if (formsError) {
      console.error('Error fetching forms:', formsError);
      return NextResponse.json({ error: 'Failed to fetch trend data' }, { status: 500 });
    }

    // Generate last N months labels
    const monthLabels = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(date.toLocaleString('en-US', { month: 'short' }));
    }

    // Initialize counters for each month
    const monthlyData = {
      pending: Array(months).fill(0),
      completed: Array(months).fill(0),
      rejected: Array(months).fill(0)
    };

    // Aggregate data by month
    forms.forEach(form => {
      const formDate = new Date(form.created_at);
      const monthDiff = (now.getFullYear() - formDate.getFullYear()) * 12 + 
                        (now.getMonth() - formDate.getMonth());
      
      // Only count forms within the requested time range
      if (monthDiff >= 0 && monthDiff < months) {
        const index = months - 1 - monthDiff;
        
        if (form.status === 'pending' || form.status === 'in_progress') {
          monthlyData.pending[index]++;
        } else if (form.status === 'completed') {
          monthlyData.completed[index]++;
        } else if (form.status === 'rejected') {
          monthlyData.rejected[index]++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: 'Pending',
            data: monthlyData.pending,
            borderColor: 'rgba(245, 158, 11, 0.8)',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            tension: 0.4,
          },
          {
            label: 'Completed',
            data: monthlyData.completed,
            borderColor: 'rgba(72, 187, 120, 0.8)',
            backgroundColor: 'rgba(72, 187, 120, 0.2)',
            tension: 0.4,
          },
          {
            label: 'Rejected',
            data: monthlyData.rejected,
            borderColor: 'rgba(239, 68, 68, 0.8)',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            tension: 0.4,
          },
        ]
      }
    });

  } catch (error) {
    console.error('Admin trends API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}