export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    // Get user profile to verify admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const schoolId = searchParams.get('schoolId') || '';
    const courseId = searchParams.get('courseId') || '';
    const branchId = searchParams.get('branchId') || '';
    const status = searchParams.get('status') || '';

    // Build query for ALL matching records (no pagination)
    let query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by_user_id,
          profiles!inner (
            full_name
          )
        ),
        student_data (
          admission_year,
          passing_year,
          updated_at
        )
      `);

    // Apply filters
    if (search) {
      query = query.or(`student_name.ilike.%${search}%,registration_no.ilike.%${search}%,personal_email.ilike.%${search}%,college_email.ilike.%${search}%`);
    }
    
    if (schoolId) {
      query = query.eq('school_id', schoolId);
    }
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    // Order by created date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data: students, error } = await query;

    if (error) {
      console.error('Error fetching students for export:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data for CSV export
    const csvData = students.map(student => {
      const noDuesStatus = student.no_dues_status || [];
      
      // Create department status map
      const deptStatusMap = {};
      noDuesStatus.forEach(status => {
        deptStatusMap[status.department_name] = {
          status: status.status,
          action_at: status.action_at,
          action_by: status.profiles?.full_name || 'N/A'
        };
      });

      return {
        'Student Name': student.student_name || 'N/A',
        'Registration No': student.registration_no || 'N/A',
        'Parent Name': student.parent_name || 'N/A',
        'School': student.school || 'N/A',
        'Course': student.course || 'N/A',
        'Branch': student.branch || 'N/A',
        'Personal Email': student.personal_email || 'N/A',
        'College Email': student.college_email || 'N/A',
        'Country Code': student.country_code || '+91',
        'Contact No': student.contact_no || 'N/A',
        'Admission Year': student.student_data?.admission_year || 'N/A',
        'Passing Year': student.student_data?.passing_year || 'N/A',
        'Overall Status': student.status || 'N/A',
        'Submitted Date': new Date(student.created_at).toLocaleDateString(),
        'Updated Date': new Date(student.updated_at).toLocaleDateString(),
        // Add department status columns dynamically
        ...Object.keys(deptStatusMap).reduce((acc, deptName) => {
          acc[`${deptName} Status`] = deptStatusMap[deptName].status || 'N/A';
          acc[`${deptName} Action Date`] = deptStatusMap[deptName].action_at 
            ? new Date(deptStatusMap[deptName].action_at).toLocaleDateString() 
            : 'N/A';
          acc[`${deptName} Action By`] = deptStatusMap[deptName].action_by_user_id || 'N/A';
          return acc;
        }, {})
      };
    });

    // Generate CSV content
    if (csvData.length === 0) {
      return NextResponse.json({ error: 'No data to export' }, { status: 404 });
    }

    // Get all column headers
    const allHeaders = new Set();
    csvData.forEach(row => {
      Object.keys(row).forEach(key => allHeaders.add(key));
    });
    const headers = Array.from(allHeaders);

    // Build CSV
    const csvRows = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header] || 'N/A';
          // Escape commas and quotes in values
          const escapedValue = value.toString().replace(/"/g, '""');
          return `"${escapedValue}"`;
        }).join(',')
      )
    ];

    const csvContent = csvRows.join('\n');

    // Create filename with filters and timestamp
    const filterSuffix = [
      search ? `search_${search}` : '',
      schoolId ? `school_${schoolId}` : '',
      courseId ? `course_${courseId}` : '',
      branchId ? `branch_${branchId}` : '',
      status ? `status_${status}` : ''
    ].filter(Boolean).join('_');

    const filename = `students_export_${csvData.length}_records${filterSuffix ? '_' + filterSuffix : ''}_${new Date().toISOString().split('T')[0]}.csv`;

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
