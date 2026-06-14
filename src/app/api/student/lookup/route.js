import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

/**
 * GET /api/student/lookup?registration_no=XXX
 * Look up student data from master student_data table
 * 
 * This endpoint is used by the frontend to auto-fill form fields
 * Requires student_session cookie for authentication
 */
export async function GET(request) {
  try {
    // Rate limiting
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    // 🔐 SESSION VERIFICATION
    const cookieStore = cookies();
    const token = cookieStore.get('student_session')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Session expired or required' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    // Verify the lookup is for the authenticated student
    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

    if (!registrationNo) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      );
    }

    // Clean the registration number
    const cleanRegNo = registrationNo.trim().toUpperCase();

    // Students can only look up their own data
    if (decoded.regNo !== cleanRegNo) {
      return NextResponse.json({ success: false, error: 'Unauthorized: can only look up your own data' }, { status: 403 });
    }

    // Search in student_data table using Supabase Admin (bypasses RLS)
    let { data: student, error } = await supabaseAdmin
      .from('student_data')
      .select('*')
      .or(`registration_no.eq.${cleanRegNo},roll_number.eq.${cleanRegNo},enrollment_number.eq.${cleanRegNo}`)
      .single();

    if (error) {
      console.error('Database error:', error);
    }

    if (!student) {
      return NextResponse.json(
        {
          error: 'Student not found',
          message: 'No student found with this registration number or roll number',
          searchedFor: cleanRegNo
        },
        { status: 404 }
      );
    }

    // Check if student has a no-dues form
    const { data: existingForm, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('status, certificate_url')
      .eq('registration_no', cleanRegNo)
      .maybeSingle();

    if (formError) {
      console.error('Form lookup error:', formError);
    }

    // Return all fields for the form
    const formData = {
      registration_no: student.registration_no,
      student_name: student.student_name,
      admission_year: student.admission_year?.toString() || '',
      passing_year: student.passing_year?.toString() || '',
      parent_name: student.parent_name || '',
      school: student.school_id || student.school || '',
      course: student.course_id || student.course || '',
      branch: student.branch_id || student.branch || '',
      country_code: student.country_code || '+91',
      contact_no: student.contact_no || '',
      personal_email: student.personal_email || '',
      college_email: student.college_email || '',
      alumni_profile_link: student.alumni_profile_link || '',
      no_dues_status: existingForm?.status || 'not_applied',
      certificate_url: existingForm?.certificate_url || null
    };

    return NextResponse.json({
      success: true,
      data: formData,
      message: 'Student data found successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/student/lookup
 * Alternative method for student lookup (same logic as GET)
 */
export async function POST(request) {
  try {
    // 🔐 SESSION VERIFICATION
    const cookieStore = cookies();
    const token = cookieStore.get('student_session')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Session expired or required' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 });
    }

    const { registration_no } = await request.json();

    if (!registration_no) {
      return NextResponse.json(
        { error: 'Registration number is required' },
        { status: 400 }
      );
    }

    const cleanRegNo = registration_no.trim().toUpperCase();

    // Students can only look up their own data
    if (decoded.regNo !== cleanRegNo) {
      return NextResponse.json({ success: false, error: 'Unauthorized: can only look up your own data' }, { status: 403 });
    }

    let { data: student, error } = await supabaseAdmin
      .from('student_data')
      .select('*')
      .or(`registration_no.eq.${cleanRegNo},roll_number.eq.${cleanRegNo},enrollment_number.eq.${cleanRegNo}`)
      .single();

    if (error) {
      console.error('Database error:', error);
    }

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: 'Student not found in database',
          registration_no: cleanRegNo
        },
        { status: 404 }
      );
    }

    // Check if student has a no-dues form
    const { data: existingForm, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('status, certificate_url')
      .eq('registration_no', cleanRegNo)
      .maybeSingle();

    if (formError) {
      console.error('Form lookup error:', formError);
    }

    const formData = {
      registration_no: student.registration_no,
      student_name: student.student_name || '',
      admission_year: student.admission_year?.toString() || '',
      passing_year: student.passing_year?.toString() || '',
      parent_name: student.parent_name || '',

      // UUIDs used for dropdown synchronization
      school: student.school_id || student.school || '',
      course: student.course_id || student.course || '',
      branch: student.branch_id || student.branch || '',

      country_code: student.country_code || '+91',
      contact_no: student.contact_no || '',
      personal_email: student.personal_email || '',
      college_email: student.college_email || '',
      alumni_profile_link: student.alumni_profile_link || '',

      // Master Sync Fields
      no_dues_status: existingForm?.status || 'not_applied',
      certificate_url: existingForm?.certificate_url || null,

      // Additional fields from master record
      batch: student.batch || '',
      section: student.section || '',
      semester: student.semester?.toString() || '',
      cgpa: student.cgpa?.toString() || '',
      roll_number: student.roll_number || '',
      enrollment_number: student.enrollment_number || '',
      date_of_birth: student.date_of_birth || '',
      gender: student.gender || '',
      category: student.category || '',
      blood_group: student.blood_group || '',
      address: student.address || '',
      city: student.city || '',
      state: student.state || '',
      pin_code: student.pin_code || '',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_no: student.emergency_contact_no || ''
    };

    return NextResponse.json({
      success: true,
      data: formData,
      message: 'Student data found successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
