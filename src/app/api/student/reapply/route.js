import { NextResponse } from 'next/server';
import { rateLimit, addRateLimitHeaders, RATE_LIMITS } from '@/lib/rateLimiter';
import { z } from 'zod';
import { verify } from 'jsonwebtoken';
import { cookies } from 'next/headers';
import applicationService from '@/lib/services/ApplicationService';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema
const reapplySchema = z.object({
  form_id: z.string().uuid(),
  reapplication_reason: z.string().min(10, 'Reapplication reason must be at least 10 characters'),
  department: z.string().min(1, 'Department is required'),
  registration_no: z.string().min(1, 'Registration number is required')
});

/**
 * POST /api/student/reapply
 * Handle student reapplication with enhanced rate limiting and priority queue management
 */
export async function POST(request) {
  try {
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

    // Parse and validate request body
    const body = await request.json();
    const validatedData = reapplySchema.parse(body);

    // 🛡️ AUTHORIZATION CHECK
    if (decoded.regNo !== validatedData.registration_no.toUpperCase().trim()) {
      return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 403 });
    }

    // Verify form exists and belongs to the student
    const { data: form, error: formError } = await supabase
      .from('no_dues_forms')
      .select('id, registration_no, status')
      .eq('id', validatedData.form_id)
      .eq('registration_no', validatedData.registration_no.toUpperCase().trim())
      .single();

    if (formError || !form) {
      return NextResponse.json({ success: false, error: 'Form not found or unauthorized' }, { status: 404 });
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, RATE_LIMITS.STUDENT_REAPPLY);

    if (!rateLimitResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: rateLimitResult.error,
            retryAfter: rateLimitResult.retryAfter
          },
          { status: 429 }
        ),
        rateLimitResult
      );
    }

    // Check per-department reapplication limit
    const departmentLimitResult = await rateLimit(
      request,
      RATE_LIMITS.REAPPLY_PER_DEPARTMENT,
      `dept:${validatedData.department}`
    );

    if (!departmentLimitResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: departmentLimitResult.error,
            retryAfter: departmentLimitResult.retryAfter
          },
          { status: 429 }
        ),
        departmentLimitResult
      );
    }

    // Check per-student reapplication limit
    const studentLimitResult = await rateLimit(
      request,
      RATE_LIMITS.REAPPLY_PER_STUDENT,
      `student:${validatedData.registration_no}`
    );

    if (!studentLimitResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: studentLimitResult.error,
            retryAfter: studentLimitResult.retryAfter
          },
          { status: 429 }
        ),
        studentLimitResult
      );
    }

    // Check cooldown period
    const cooldownResult = await rateLimit(
      request,
      RATE_LIMITS.REAPPLY_COOLDOWN,
      `cooldown:${validatedData.registration_no}:${validatedData.department}`
    );

    if (!cooldownResult.success) {
      return addRateLimitHeaders(
        NextResponse.json(
          {
            error: cooldownResult.error,
            retryAfter: cooldownResult.retryAfter
          },
          { status: 429 }
        ),
        cooldownResult
      );
    }

    // Validate inputs
    if (!validatedData.form_id) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    if (!validatedData.reapplication_reason || validatedData.reapplication_reason.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Reapplication reason must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (!validatedData.department) {
      return NextResponse.json(
        { success: false, error: 'Department is required' },
        { status: 400 }
      );
    }

    // Additional validation for department-specific rules
    await validateDepartmentReapplication(validatedData.form_id, validatedData.department, validatedData.registration_no);

    // Handle reapplication with centralized service
    const result = await applicationService.handleReapplication(validatedData.form_id, {
      reason: validatedData.reapplication_reason.trim(),
      department: validatedData.department,
      studentId: validatedData.registration_no,
      editedFields: body.updated_form_data || {} // Optional fields if any
    });

    return NextResponse.json({
      success: true,
      data: result,
      rateLimit: {
        remaining: departmentLimitResult.remaining,
        resetTime: departmentLimitResult.resetTime
      }
    });

  } catch (error) {
    console.error('❌ Reapplication error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit reapplication'
      },
      { status: 500 }
    );
  }
}

/**
 * Validate department-specific reapplication rules
 */
async function validateDepartmentReapplication(formId, department, studentId) {
  try {
    // Check if form is in correct state for reapplication
    const { data: form, error } = await supabase
      .from('no_dues_forms')
      .select('status, last_reapplied_at')
      .eq('id', formId)
      .single();

    if (error || !form) {
      throw new Error('Original form not found');
    }

    if (!['rejected', 'completed'].includes(form.status)) {
      throw new Error('Reapplication is only allowed for rejected or completed applications');
    }

    // Check cooldown period
    if (form.last_reapplied_at) {
      const cooldownEnd = new Date(form.last_reapplied_at);
      cooldownEnd.setHours(cooldownEnd.getHours() + 24); // 24 hour cooldown

      if (new Date() < cooldownEnd) {
        throw new Error('Please wait 24 hours between reapplications');
      }
    }

  } catch (error) {
    throw error;
  }
}

/**
 * GET /api/student/reapply?formId=xxx
 * Get reapplication history for a form
 */
export async function GET(request) {
  try {
    // 🔐 SESSION VERIFICATION
    const cookieStore = cookies();
    const token = cookieStore.get('student_session')?.value;

    if (!token) return NextResponse.json({ error: 'Session required' }, { status: 401 });

    let decoded;
    try {
      decoded = verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('formId');

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'Form ID is required' },
        { status: 400 }
      );
    }

    // 🛡️ AUTHORIZATION CHECK - Verify this form belongs to the session user
    const { data: formCheck, error: checkError } = await supabase
      .from('no_dues_forms')
      .select('registration_no')
      .eq('id', formId)
      .single();

    if (checkError || !formCheck || formCheck.registration_no !== decoded.regNo) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    // Get reapplication history
    const result = await applicationService.getReapplicationHistory(formId);

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Get reapplication history error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get reapplication history'
      },
      { status: 500 }
    );
  }
}
