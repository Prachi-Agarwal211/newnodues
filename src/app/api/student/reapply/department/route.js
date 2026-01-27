export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { APP_URLS } from '@/lib/urlHelper';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/student/reapply/department
 * Handle student reapplication for a SINGLE rejected department
 * 
 * Request body:
 * {
 *   registration_no: string (required)
 *   department_name: string (required) - the specific department to reapply to
 *   student_reply_message: string (required, min 10 chars)
 *   updated_form_data: object (optional - only changed fields)
 * }
 */
export async function POST(request) {
    try {
        // Rate limiting: Prevent spam reapplications
        const rateLimitCheck = await rateLimit(request, RATE_LIMITS.SUBMIT);
        if (!rateLimitCheck.success) {
            return NextResponse.json({
                success: false,
                error: rateLimitCheck.error || 'Too many requests',
                retryAfter: rateLimitCheck.retryAfter
            }, { status: 429 });
        }

        const body = await request.json();
        const { registration_no, department_name, student_reply_message, updated_form_data } = body;

        // ==================== VALIDATION ====================
        if (!registration_no?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Registration number is required'
            }, { status: 400 });
        }

        if (!department_name?.trim()) {
            return NextResponse.json({
                success: false,
                error: 'Department name is required'
            }, { status: 400 });
        }

        if (!student_reply_message?.trim() || student_reply_message.trim().length < 10) {
            return NextResponse.json({
                success: false,
                error: 'Reply message is required (minimum 10 characters)'
            }, { status: 400 });
        }

        // ==================== VERIFY AUTHENTICATION FIRST ====================
        // Check student session authentication
        const cookieStore = await import('next/headers').then(m => m.cookies());
        const sessionCookie = cookieStore.get('student_session')?.value;
        
        if (!sessionCookie) {
            return NextResponse.json({
                success: false,
                error: 'Student session required'
            }, { status: 401 });
        }

        const { verify } = await import('jsonwebtoken');
        const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';
        
        let decoded;
        try {
            decoded = verify(sessionCookie, JWT_SECRET);
        } catch (err) {
            return NextResponse.json({
                success: false,
                error: 'Invalid session'
            }, { status: 401 });
        }

        // Verify that the session registration number matches the request
        if (decoded.regNo !== registration_no.trim().toUpperCase()) {
            return NextResponse.json({
                success: false,
                error: 'Unauthorized access'
            }, { status: 403 });
        }

        // ==================== GET CURRENT FORM ====================
        const { data: form, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select(`
        *,
        no_dues_status (
          department_name,
          status,
          rejection_reason,
          rejection_count,
          action_at,
          action_by_user_id
        )
      `)
            .eq('registration_no', registration_no.trim().toUpperCase())
            .single();

        if (formError) {
            if (formError.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Form not found'
                }, { status: 404 });
            }
            throw formError;
        }

        // ==================== VALIDATE DEPARTMENT STATUS ====================
        const targetDeptStatus = form.no_dues_status.find(
            s => s.department_name === department_name
        );

        if (!targetDeptStatus) {
            return NextResponse.json({
                success: false,
                error: `Department "${department_name}" not found in this form`
            }, { status: 404 });
        }

        if (targetDeptStatus.status !== 'rejected') {
            return NextResponse.json({
                success: false,
                error: `Department "${department_name}" is not rejected (current status: ${targetDeptStatus.status})`
            }, { status: 400 });
        }

        // Check if form is completed
        if (form.status === 'completed') {
            return NextResponse.json({
                success: false,
                error: 'Cannot reapply for a completed form'
            }, { status: 403 });
        }

        // ==================== PER-DEPARTMENT REAPPLICATION LIMIT ====================
        const DEFAULT_MAX_REAPPLICATIONS = 5;
        const currentRejectionCount = targetDeptStatus.rejection_count || 0;

        if (currentRejectionCount >= DEFAULT_MAX_REAPPLICATIONS) {
            return NextResponse.json({
                success: false,
                error: `Maximum reapplication limit (${DEFAULT_MAX_REAPPLICATIONS}) reached for ${department_name}. Please contact administration.`,
                canRequestOverride: true
            }, { status: 403 });
        }

        // ==================== INPUT SANITIZATION ====================
        const ALLOWED_FIELDS = [
            'student_name',
            'parent_name',
            'admission_year',
            'passing_year',
            'school',
            'course',
            'branch',
            'country_code',
            'contact_no',
            'personal_email',
            'college_email'
        ];

        const PROTECTED_FIELDS = [
            'id',
            'registration_no',
            'status',
            'created_at',
            'updated_at',
            'reapplication_count',
            'is_reapplication',
            'last_reapplied_at'
        ];

        let sanitizedData = {};

        if (updated_form_data) {
            for (const field of PROTECTED_FIELDS) {
                if (updated_form_data.hasOwnProperty(field)) {
                    return NextResponse.json({
                        success: false,
                        error: `Cannot modify protected field: ${field}`
                    }, { status: 403 });
                }
            }

            for (const field of ALLOWED_FIELDS) {
                if (updated_form_data.hasOwnProperty(field)) {
                    sanitizedData[field] = updated_form_data[field];
                }
            }
        }

        // ==================== VALIDATE SANITIZED FIELDS ====================
        if (sanitizedData && Object.keys(sanitizedData).length > 0) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (sanitizedData.personal_email && !emailPattern.test(sanitizedData.personal_email)) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid personal email format'
                }, { status: 400 });
            }

            if (sanitizedData.college_email && !emailPattern.test(sanitizedData.college_email)) {
                return NextResponse.json({
                    success: false,
                    error: 'Invalid college email format'
                }, { status: 400 });
            }

            if (sanitizedData.contact_no) {
                const phonePattern = /^[0-9]{6,15}$/;
                if (!phonePattern.test(sanitizedData.contact_no)) {
                    return NextResponse.json({
                        success: false,
                        error: 'Phone number must be 6-15 digits'
                    }, { status: 400 });
                }
            }
        }

        // ==================== HANDLE REAPPLICATION VIA SERVICE ====================
        // Centralized logic handles: history logging, form status update, dept status reset, and realtime triggers
        const { handleReapplication } = (await import('@/lib/services/ApplicationService')).default;

        await handleReapplication(form.id, {
            reason: student_reply_message.trim(),
            department: department_name,
            editedFields: sanitizedData || {}
        });

        console.log(`♻️ Per-Dept Reapply: Processed via Service for form ${form.id} and department ${department_name}`);

        // ==================== SEND EMAIL TO SPECIFIC DEPARTMENT STAFF ====================
        const { data: staffMembers, error: staffError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, department_name, school_ids, course_ids, branch_ids')
            .eq('role', 'department')
            .eq('department_name', department_name)  // ONLY this department
            .not('email', 'is', null);

        if (!staffError && staffMembers && staffMembers.length > 0) {
            try {
                // Filter staff based on HOD scope
                const staffToNotify = staffMembers.filter(staff => {
                    if (staff.department_name === 'school_hod') {
                        if (staff.school_ids && !staff.school_ids.includes(form.school_id)) {
                            return false;
                        }
                        if (staff.course_ids && staff.course_ids.length > 0 && !staff.course_ids.includes(form.course_id)) {
                            return false;
                        }
                    }
                    return true;
                });

                if (staffToNotify.length > 0) {
                    const { sendReapplicationNotification } = await import('@/lib/emailService');
                    const allStaffEmails = staffToNotify.map(staff => staff.email);

                    const emailResult = await sendReapplicationNotification({
                        allStaffEmails,
                        studentName: form.student_name,
                        registrationNo: form.registration_no,
                        studentMessage: student_reply_message.trim(),
                        reapplicationNumber: (form.reapplication_count || 0) + 1,
                        school: form.school,
                        course: form.course,
                        branch: form.branch,
                        dashboardUrl: APP_URLS.staffLogin(),
                        departmentName: department_name  // Specify which department
                    });

                    if (emailResult.success) {
                        console.log(`📧 ✅ Per-dept reapplication notification sent to ${staffToNotify.length} staff for ${department_name}`);
                    } else {
                        console.error(`📧 ❌ Failed to send reapplication notification: ${emailResult.error}`);
                    }
                }
            } catch (emailError) {
                console.error('Failed to send reapplication notifications:', emailError);
                // Don't fail the request if email fails
            }
        }

        // ==================== SUCCESS RESPONSE ====================
        console.log(`✅ Per-department reapplication processed: ${department_name} for ${form.registration_no}`);

        return NextResponse.json({
            success: true,
            message: `Reapplication submitted for ${department_name}. They will review your updated application.`,
            data: {
                department: department_name,
                reapplication_attempt: currentRejectionCount + 1,
                remaining_attempts: DEFAULT_MAX_REAPPLICATIONS - (currentRejectionCount + 1),
                form_status: 'pending'
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Per-Department Reapplication API Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error',
            details: error.message
        }, { status: 500 });
    }
}

/**
 * GET /api/student/reapply/department?registration_no=XXX
 * Get per-department reapplication eligibility and history
 */
export async function GET(request) {
    try {
        const rateLimitCheck = await rateLimit(request, RATE_LIMITS.READ);
        if (!rateLimitCheck.success) {
            return NextResponse.json({
                success: false,
                error: rateLimitCheck.error || 'Too many requests',
                retryAfter: rateLimitCheck.retryAfter
            }, { status: 429 });
        }

        const { searchParams } = new URL(request.url);
        const registrationNo = searchParams.get('registration_no');

        if (!registrationNo) {
            return NextResponse.json({
                success: false,
                error: 'Registration number is required'
            }, { status: 400 });
        }

        // Get form with department statuses
        const { data: form, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select(`
        id,
        registration_no,
        status,
        reapplication_count,
        no_dues_status (
          department_name,
          status,
          rejection_reason,
          rejection_count,
          action_at
        )
      `)
            .eq('registration_no', registrationNo.trim().toUpperCase())
            .single();

        if (formError) {
            if (formError.code === 'PGRST116') {
                return NextResponse.json({
                    success: false,
                    error: 'Form not found'
                }, { status: 404 });
            }
            throw formError;
        }

        const MAX_REAPPLICATIONS = 5;

        // Build per-department reapplication info
        const departmentReapplyInfo = form.no_dues_status.map(dept => ({
            department_name: dept.department_name,
            status: dept.status,
            rejection_reason: dept.rejection_reason,
            rejection_count: dept.rejection_count || 0,
            remaining_attempts: Math.max(0, MAX_REAPPLICATIONS - (dept.rejection_count || 0)),
            can_reapply: dept.status === 'rejected' && (dept.rejection_count || 0) < MAX_REAPPLICATIONS,
            action_at: dept.action_at
        }));

        // Get per-department history
        const { data: history, error: historyError } = await supabaseAdmin
            .from('no_dues_reapplication_history')
            .select('*')
            .eq('form_id', form.id)
            .not('department_name', 'is', null)  // Only per-department history
            .order('created_at', { ascending: false });

        return NextResponse.json({
            success: true,
            data: {
                form_id: form.id,
                registration_no: form.registration_no,
                form_status: form.status,
                global_reapplication_count: form.reapplication_count || 0,
                departments: departmentReapplyInfo,
                per_department_history: history || []
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Get Per-Department Reapply Info Error:', error);
        return NextResponse.json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
