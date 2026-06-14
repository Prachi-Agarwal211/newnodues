import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

// Force dynamic rendering - this route uses request.url
export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

/**
 * GET /api/student/can-edit?registration_no=XXX
 * Check if a student can edit or reapply their form using Supabase
 *
 * Returns:
 * {
 *   canEdit: boolean,
 *   canReapply: boolean,
 *   reason: string,
 *   form_status: string,
 *   rejection_info: object
 * }
 */
export async function GET(request) {
  try {
    // Rate limiting: Prevent enumeration attacks
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.CHECK_STATUS);
    if (!rateLimitCheck.success) {
      return NextResponse.json({
        success: false,
        error: rateLimitCheck.error || 'Too many status check attempts',
        retryAfter: rateLimitCheck.retryAfter
      }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const registrationNo = searchParams.get('registration_no');

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
    if (!registrationNo) {
      return NextResponse.json({
        success: false,
        error: 'Registration number is required'
      }, { status: 400 });
    }

    // 🛡️ AUTHORIZATION CHECK
    if (decoded.regNo !== registrationNo.trim().toUpperCase()) {
      return NextResponse.json({ success: false, error: 'Unauthorized access' }, { status: 403 });
    }

    // ==================== GET FORM AND STATUS ====================
    const { data: form, error: formError } = await supabase
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status!no_dues_status_form_id_fkey (
          department_name,
          status,
          rejection_reason,
          action_at
        )
      `)
      .eq('registration_no', registrationNo.trim().toUpperCase())
      .single();

    if (formError && formError.code !== 'PGRST116') {
      console.error('Form lookup error:', formError);
    }

    if (!form) {
      return NextResponse.json({
        success: false,
        error: 'Form not found'
      }, { status: 404 });
    }

    // ==================== ANALYZE ELIGIBILITY ====================
    const statuses = form.no_dues_status || [];
    const hasRejection = statuses.some(s => s.status === 'rejected');
    const rejectedDepartments = statuses.filter(s => s.status === 'rejected');
    const approvedDepartments = statuses.filter(s => s.status === 'approved');
    const pendingDepartments = statuses.filter(s => s.status === 'pending');

    // Determine if form is completed
    const isCompleted = form.status === 'completed';

    // Determine if can edit (pending or rejected forms only)
    const canEdit = form.status === 'pending' || form.status === 'rejected';

    // Determine if can reapply (must have at least one rejection and not completed)
    const canReapply = hasRejection && !isCompleted;

    // Check reapplication limit
    const MAX_REAPPLICATIONS = 5;
    const hasReachedLimit = form.reapplication_count >= MAX_REAPPLICATIONS;

    // Determine reason
    let reason = '';
    if (isCompleted) {
      reason = 'Form is already completed. No changes allowed.';
    } else if (hasReachedLimit) {
      reason = `Maximum reapplication limit (${MAX_REAPPLICATIONS}) reached.`;
    } else if (hasRejection) {
      reason = `${rejectedDepartments.length} department(s) rejected. You can reapply.`;
    } else if (form.status === 'pending') {
      reason = 'Form is pending review. You can edit to fix mistakes.';
    } else {
      reason = 'Form status does not allow editing.';
    }

    // ==================== PREPARE RESPONSE ====================
    // Build per-department reapplication info
    const perDeptInfo = statuses.map(dept => ({
      department_name: dept.department_name,
      status: dept.status,
      rejection_reason: dept.rejection_reason,
      rejection_count: dept.rejection_count || 0,
      remaining_attempts: Math.max(0, MAX_REAPPLICATIONS - (dept.rejection_count || 0)),
      can_reapply: dept.status === 'rejected' && (dept.rejection_count || 0) < MAX_REAPPLICATIONS,
      action_at: dept.action_at
    }));

    const response = {
      success: true,
      data: {
        canEdit: canEdit && !hasReachedLimit,
        canReapply: canReapply && !hasReachedLimit,
        reason: reason,
        form_status: form.status,
        form_info: {
          registration_no: form.registration_no,
          student_name: form.student_name,
          created_at: form.created_at,
          reapplication_count: form.reapplication_count,
          last_reapplied_at: form.last_reapplied_at,
          has_student_message: !!form.student_reply_message
        },
        rejection_info: hasRejection ? {
          has_rejection: true,
          rejected_count: rejectedDepartments.length,
          approved_count: approvedDepartments.length,
          pending_count: pendingDepartments.length,
          rejected_departments: rejectedDepartments.map(d => ({
            department_name: d.department_name,
            rejection_reason: d.rejection_reason,
            rejection_count: d.rejection_count || 0,
            remaining_attempts: Math.max(0, MAX_REAPPLICATIONS - (d.rejection_count || 0)),
            can_reapply: (d.rejection_count || 0) < MAX_REAPPLICATIONS,
            action_at: d.action_at
          }))
        } : {
          has_rejection: false,
          approved_count: approvedDepartments.length,
          pending_count: pendingDepartments.length
        },
        limitations: {
          max_reapplications_per_dept: MAX_REAPPLICATIONS,
          global_reapplication_count: form.reapplication_count,
          has_reached_global_limit: hasReachedLimit
        },
        // NEW: Per-department status for UI
        per_department_status: perDeptInfo
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Can Edit Check Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}