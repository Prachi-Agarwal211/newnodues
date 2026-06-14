import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

/**
 * GET /api/student/certificate?formId=XXX&registrationNo=XXX
 * 
 * Download/access No Dues certificate
 * 
 * Phase 1: Students have NO authentication, so we verify access by registration number
 * instead of user authentication.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');
    const registrationNo = searchParams.get('registrationNo');

    // 🔐 0. SESSION VERIFICATION
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

    // ==================== VALIDATION ====================
    if (!formId && !registrationNo) {
      return NextResponse.json({
        success: false,
        error: 'Either Form ID or Registration Number is required'
      }, { status: 400 });
    }

    // 🛡️ AUTHORIZATION CHECK - Must match session identity
    const targetRegNo = registrationNo?.trim().toUpperCase() || '';
    // We will verify this against the fetched record owner below.

    // ==================== FETCH FORM DATA ====================
    // Use Prisma to fetch form data

    let formData;
    let error;

    if (formId) {
      const { data: result, error: queryError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          student_name,
          registration_no,
          course,
          branch,
          admission_year,
          passing_year,
          status,
          final_certificate_generated,
          certificate_url,
          blockchain_hash,
          blockchain_tx
        `)
        .eq('id', formId)
        .single();

      formData = result;
      error = queryError;
    } else {
      const { data: result, error: queryError } = await supabase
        .from('no_dues_forms')
        .select(`
          id,
          student_name,
          registration_no,
          course,
          branch,
          admission_year,
          passing_year,
          status,
          final_certificate_generated,
          certificate_url,
          blockchain_hash,
          blockchain_tx
        `)
        .eq('registration_no', registrationNo.trim().toUpperCase())
        .single();

      formData = result;
      error = queryError;
    }

    if (error && error.code !== 'PGRST116') {
      console.error('Form lookup error:', error);
    }

    if (!formData) {
      return NextResponse.json({
        success: false,
        error: 'Application not found'
      }, { status: 404 });
    }

    // ==================== AUTHORIZATION CHECK ====================
    // Securely verify that the session user owns this application
    if (formData.registration_no !== decoded.regNo) {
      console.warn(`🛑 [Certificate Access Blocked] Session ${decoded.regNo} tried to access ${formData.registration_no}`);
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access to this certificate'
      }, { status: 403 });
    }

    // ==================== CHECK CERTIFICATE EXISTS ====================

    // Check if system-generated certificate exists
    if (!formData.final_certificate_generated || !formData.certificate_url) {
      return NextResponse.json({
        success: false,
        error: 'Certificate not yet generated. Please wait for all departments to approve.',
        status: formData.status,
        certificateReady: false
      }, { status: 404 });
    }

    // ==================== RETURN CERTIFICATE INFO ====================

    return NextResponse.json({
      success: true,
      certificateReady: true,
      data: {
        certificate_url: formData.certificate_url,
        student_name: formData.student_name,
        registration_no: formData.registration_no,
        course: formData.course,
        branch: formData.branch,
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        status: formData.status,
        blockchain_hash: formData.blockchain_hash,
        blockchain_tx: formData.blockchain_tx
      }
    });

  } catch (error) {
    console.error('Certificate API Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
