import { NextResponse } from 'next/server';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { ApiResponse } from '@/lib/apiResponse';
import applicationService from '@/lib/services/ApplicationService';
import { supabase } from '@/lib/supabaseClient';
import { verifyStudentCanAccessForm, verifyStudentCanReapplyToDepartment } from '@/lib/authUtils';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

// JWT Secret for auto-authentication after form submission
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

export async function POST(request) {
  try {
    // 1. Rate Limiting
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
    if (!rateLimitCheck.success) {
      return ApiResponse.error('Too many requests', 429);
    }

    // 2. Parse & Validate
    const body = await request.json();

    // Check if this is a reapplication request
    if (body.action === 'reapply') {
      return handleReapplication(request, body);
    }

    // Regular form submission
    const validation = validateWithZod(body, studentFormSchema);

    if (!validation.success) {
      return ApiResponse.validationError('Validation failed', validation.errors);
    }

    // 3. Submit via Application Service
    const result = await applicationService.submitApplication(validation.data);

    // 4. Auto-authenticate the student after form submission
    // This allows them to immediately check status without needing to request OTP
    const regNo = validation.data.registration_no;
    const email = validation.data.personal_email || validation.data.college_email;
    
    // Generate JWT token
    const token = sign(
      {
        regNo: regNo,
        email: email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      JWT_SECRET
    );

    // Set HTTP-Only Cookie
    const cookieStore = cookies();
    cookieStore.set('student_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    // Return success with auto-login flag
    const response = ApiResponse.success(
      { ...result.data, autoLoggedIn: true },
      'Application submitted successfully'
    );
    
    return response;

  } catch (error) {
    console.error('Submission Error:', error);
    return ApiResponse.error(error.message || 'Failed to submit application', 500);
  }
}

async function handleReapplication(request, body) {
  try {
    const { formId, reason, department, registration_no } = body;

    if (!formId) {
      return ApiResponse.error('Form ID required for reapplication', 400);
    }

    if (!registration_no) {
      return ApiResponse.error('Registration number required for authentication', 400);
    }

    // Verify student session and authorization to access this form
    const { valid, error: authError } = await verifyStudentCanAccessForm(formId, registration_no);
    
    if (!valid) {
      return ApiResponse.error(authError || 'Unauthorized access', 403);
    }

    // Check if department is specified - for per-department reapplication
    if (department) {
      // Verify the specific department has rejected this form and student can reapply
      const { valid: canReapply, error: deptError } = await verifyStudentCanReapplyToDepartment(formId, department);
      
      if (!canReapply) {
        return ApiResponse.error(deptError || 'Cannot reapply to this department', 400);
      }
    } else {
      // No department specified - check if ANY department has rejected
      const { data: rejectedStatuses, error: statusesError } = await supabase
        .from('no_dues_status')
        .select('department_name')
        .eq('form_id', formId)
        .eq('status', 'rejected');

      if (statusesError) {
        return ApiResponse.error('Failed to check department statuses', 500);
      }

      if (!rejectedStatuses || rejectedStatuses.length === 0) {
        return ApiResponse.error('No departments have rejected your form. You can only reapply to rejected departments.', 400);
      }
    }

    // Process reapplication
    const result = await applicationService.handleReapplication(formId, {
      reason,
      department
    });

    return ApiResponse.success(result, 'Reapplication submitted successfully. The department will review your form again.');

  } catch (error) {
    console.error('Reapplication Error:', error);
    return ApiResponse.error(error.message || 'Failed to process reapplication', 500);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');
    const formId = searchParams.get('form_id');

    if (registrationNo) {
      // Get student status by registration number
      const result = await applicationService.getStudentStatus(registrationNo);
      if (!result.success) {
        return ApiResponse.error(result.error, 404);
      }
      return ApiResponse.success(result.data);
    }

    if (formId) {
      // Get reapplication history
      const result = await applicationService.getReapplicationHistory(formId);
      if (!result.success) {
        return ApiResponse.error(result.error, 404);
      }
      return ApiResponse.success(result.data);
    }

    return ApiResponse.error('Registration number or form ID required', 400);
  } catch (error) {
    console.error('Get Status Error:', error);
    return ApiResponse.error('Internal server error', 500);
  }
}
