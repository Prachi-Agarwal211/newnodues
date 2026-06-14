import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { studentFormSchema, validateWithZod } from '@/lib/zodSchemas';
import { ApiResponse } from '@/lib/apiResponse';
import applicationService from '@/lib/services/ApplicationService';
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

    // Regular form submission
    // NOTE: Reapplication is handled by the dedicated /api/student/reapply route
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
