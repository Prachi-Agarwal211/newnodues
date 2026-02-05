export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Email notifications are imported dynamically when needed
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';
import { staffActionSchema, validateWithZod } from '@/lib/zodSchemas';
import { APP_URLS } from '@/lib/urlHelper';
import { ApiResponse } from '@/lib/apiResponse';
import { AuditLogger } from '@/lib/auditLogger';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Note: Мы используем supabase напрямую (который теперь admin), так как это серверный роут.
// Мы все еще проверяем токен пользователя через supabase.auth.getUser() для безопасности.

export async function PUT(request) {
  try {
    // Rate limiting: Prevent spam actions
    const rateLimitCheck = await rateLimit(request, RATE_LIMITS.ACTION);
    if (!rateLimitCheck.success) {
      return NextResponse.json(
        { error: rateLimitCheck.error || 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // ==================== SECURE AUTHENTICATION ====================
    // ✅ CRITICAL FIX: Get userId from auth token, NOT from request body
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    const authUserId = user.id; // Auth user ID from Supabase Auth

    // ==================== USER-BASED RATE LIMITING ====================
    // Check limit for this specific user to prevent account abuse (e.g. from multiple IPs)
    const userRateLimit = await rateLimit(request, RATE_LIMITS.ACTION, authUserId);
    if (!userRateLimit.success) {
      return NextResponse.json(
        { error: userRateLimit.error || 'Rate limit exceeded for your account' },
        { status: 429 }
      );
    }

    // ==================== ZOD VALIDATION ====================
    const body = await request.json();
    const validation = validateWithZod(body, staffActionSchema);

    if (!validation.success) {
      const errorFields = Object.keys(validation.errors);
      const firstError = validation.errors[errorFields[0]];

      return NextResponse.json(
        {
          success: false,
          error: firstError || 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // All data is validated by Zod (action is enum-validated, reason required for reject)
    const { formId, departmentName, action, reason } = validation.data;

    // OPTIMIZATION: Parallelize all validation queries for faster response using Supabase
    const [
      profileResult,
      departmentResult,
      formResult,
      existingStatusResult
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, role, assigned_department_ids, department_name, full_name')
        .eq('id', authUserId)
        .single(),
      supabase
        .from('departments')
        .select('id, name, display_name')
        .eq('name', departmentName)
        .single(),
      supabase
        .from('no_dues_forms')
        .select('id, status, student_name, registration_no')
        .eq('id', formId)
        .single(),
      supabase
        .from('no_dues_status')
        .select('id, status, department_name')
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .single()
    ]);

    const profile = profileResult.data;
    const department = departmentResult.data;
    const form = formResult.data;
    const existingStatus = existingStatusResult.data;

    // Check for errors
    if (profileResult.error && profileResult.error.code !== 'PGRST116') throw profileResult.error;
    if (departmentResult.error && departmentResult.error.code !== 'PGRST116') throw departmentResult.error;
    if (formResult.error && formResult.error.code !== 'PGRST116') throw formResult.error;
    if (existingStatusResult.error && existingStatusResult.error.code !== 'PGRST116') throw existingStatusResult.error;

    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Profile not found'
      }, { status: 404 });
    }

    // ✅ CRITICAL FIX: Use profile.id (not auth user id) for tracking actions
    const userId = profile.id;

    // Verify user has department staff or admin role
    if (profile.role !== 'department' && profile.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify department exists
    if (!department) {
      return NextResponse.json({
        success: false,
        error: 'Invalid department'
      }, { status: 400 });
    }

    // ✅ NEW UUID-BASED AUTHORIZATION CHECK
    // For department staff, verify they are assigned to this department via UUID
    if (profile.role === 'department') {
      const isAuthorized = profile.assigned_department_ids?.includes(department.id);

      if (!isAuthorized) {
        console.error('❌ Authorization failed:', {
          authUserId,
          profileId: userId,
          requestedDepartment: departmentName,
          requestedDepartmentId: department.id,
          assignedDepartmentIds: profile.assigned_department_ids
        });

        return NextResponse.json({
          success: false,
          error: `You are not authorized to manage ${department.display_name}`,
          details: {
            requestedDepartment: department.display_name,
            hint: 'Contact administrator to assign you to this department'
          }
        }, { status: 403 });
      }

      console.log('✅ Authorization passed:', {
        authUserId,
        profileId: userId,
        department: departmentName,
        departmentId: department.id
      });
    }

    if (!form) {
      return NextResponse.json({
        success: false,
        error: 'Form not found'
      }, { status: 404 });
    }

    if (!existingStatus) {
      // Get all statuses for this form to help diagnose issue
      const { data: allStatuses, error: statusesError } = await supabase
        .from('no_dues_status')
        .select('department_name')
        .eq('form_id', formId);

      if (statusesError) {
        console.error('Error fetching statuses:', statusesError);
      }

      console.error('❌ Department status not found:', {
        formId,
        requestedDepartment: departmentName,
        availableStatuses: allStatuses?.map(s => s.department_name) || [],
        profileDepartment: profile.department_name
      });

      return NextResponse.json({
        success: false,
        error: 'Department status not found for this form',
        details: {
          formId,
          requestedDepartment: departmentName,
          availableDepartments: allStatuses?.map(s => s.department_name) || [],
          hint: 'The department name in request may not match any status records for this form'
        }
      }, { status: 404 });
    }

    // Check if status is already approved or rejected
    if (existingStatus.status === 'approved' || existingStatus.status === 'rejected') {
      return NextResponse.json({
        success: false,
        error: `Status is already ${existingStatus.status}`
      }, { status: 400 });
    }

    // Update the status with user tracking
    const statusValue = action === 'approve' ? 'approved' : 'rejected';
    const updateData = {
      status: statusValue,
      action_at: new Date(),
      action_by_user_id: userId // ✅ CRITICAL: Track who performed action
    };

    // Add rejection reason if rejecting
    if (action === 'reject' && reason) {
      updateData.rejection_reason = reason;
    } else if (action === 'reject' && !reason) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason is required when rejecting'
      }, { status: 400 });
    }

    const { data: updatedStatus, error: updateError } = await supabase
      .from('no_dues_status')
      .update(updateData)
      .eq('id', existingStatus.id)
      .select()
      .single();

    if (updateError) throw updateError;

    // ==================== IMPORTANT ====================
    // Form status update is handled by database trigger: trigger_update_form_status
    // The trigger automatically sets form status to 'completed' when all departments approve
    // We don't need to manually check or update it here - this prevents race conditions
    // ===================================================

    // Get updated form status (may have been changed by trigger)
    const { data: currentForm, error: formError } = await supabase
      .from('no_dues_forms')
      .select('id, status, student_name, registration_no')
      .eq('id', formId)
      .single();

    if (formError && formError.code !== 'PGRST116') throw formError;

    // ==================== AUDIT LOGGING ====================
    // Log the action (async)
    AuditLogger.log(
      action === 'approve' ? AuditLogger.ACTIONS.APPROVE_FORM : AuditLogger.ACTIONS.REJECT_FORM,
      userId,
      {
        actorName: profile.full_name || profile.department_name || departmentName,
        department: departmentName,
        reason: reason || null,
        studentName: form.student_name,
        registrationNo: form.registration_no
      },
      formId,
      request.headers.get('x-forwarded-for') || 'unknown'
    );

    // ==================== ASYNC CERTIFICATE GENERATION ====================
    // If form is now completed (trigger updated it), generate certificate in background
    // Don't await - let it happen asynchronously to not block response
    if (currentForm?.status === 'completed') {
      console.log(`🎓 Form completed - triggering background certificate generation for ${formId}`);

      // Log certificate generation attempt
      AuditLogger.log(
        AuditLogger.ACTIONS.GENERATE_CERTIFICATE,
        userId, // Triggered by this user's action
        { actorName: profile.full_name || profile.department_name || departmentName, registrationNo: form.registration_no },
        formId
      );

      // Use new certificate trigger service for more reliable generation
      try {
        const { triggerCertificateGeneration } = await import('@/lib/certificateTrigger');

        // Fire and forget - certificate generation happens in background
        triggerCertificateGeneration(formId, userId)
          .then(result => {
            if (result.success) {
              console.log(`✅ Certificate generated: ${result.certificateUrl}`);
            } else {
              console.error('❌ Certificate generation failed:', result.error);
            }
          })
          .catch(error => {
            // Log but don't throw - this is fire-and-forget
            console.error('❌ Certificate generation error:', error.message || error);
          });
      } catch (importError) {
        console.error('❌ Failed to import certificate trigger:', importError);

        // Fallback to old fetch method
        fetch(
          APP_URLS.certificateGenerateApi(),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formId })
          }
        )
          .then(res => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.json();
          })
          .then(result => {
            if (result.success) {
              console.log(`✅ Certificate generated: ${result.certificateUrl}`);
            } else {
              console.error('❌ Certificate generation failed:', result.error);
            }
          })
          .catch(error => {
            console.error('❌ Fallback certificate generation error:', error.message || error);
          });
      }
    }

    // ==================== OPTIMIZED EMAIL NOTIFICATIONS ====================
    // 🆕 ONLY send emails to students on:
    // 1. ANY rejection (immediate notification)
    // 2. ALL departments approved (certificate ready)
    // ❌ NO emails on individual department approvals

    const { data: formWithEmail, error: emailError } = await supabase
      .from('no_dues_forms')
      .select('personal_email, college_email, student_name, registration_no, status')
      .eq('id', formId)
      .single();

    if (emailError && emailError.code !== 'PGRST116') {
      console.error('Error fetching form email info:', emailError);
    }

    if (formWithEmail && (formWithEmail.personal_email || formWithEmail.college_email)) {
      const studentEmail = formWithEmail.personal_email || formWithEmail.college_email;

      try {
        const { EMAIL_URLS } = await import('@/lib/urlHelper');

        // CASE 1: Department REJECTED - Send immediate notification
        if (action === 'reject') {
          const { sendRejectionNotification } = await import('@/lib/emailService');

          const emailResult = await sendRejectionNotification({
            studentEmail,
            studentName: formWithEmail.student_name,
            registrationNo: formWithEmail.registration_no,
            departmentName: departmentName,
            rejectionReason: reason,
            statusUrl: EMAIL_URLS.studentCheckStatus(formWithEmail.registration_no)
          });

          if (emailResult.success) {
            console.log(`📧 ✅ Rejection email sent to student: ${studentEmail}`);
          } else {
            console.warn(`📧 ⚠️ Rejection email ${emailResult.queued ? 'queued' : 'failed'}: ${studentEmail}`);
          }
        }

        // CASE 2: Department APPROVED + ALL completed - Send certificate ready email
        else if (action === 'approve' && currentForm?.status === 'completed') {
          const { sendCertificateReadyNotification } = await import('@/lib/emailService');

          const emailResult = await sendCertificateReadyNotification({
            studentEmail,
            studentName: formWithEmail.student_name,
            registrationNo: formWithEmail.registration_no,
            certificateUrl: EMAIL_URLS.studentCheckStatus(formWithEmail.registration_no)
          });

          if (emailResult.success) {
            console.log(`📧 ✅ Certificate ready email sent to student: ${studentEmail}`);
          } else {
            console.warn(`📧 ⚠️ Certificate email ${emailResult.queued ? 'queued' : 'failed'}: ${studentEmail}`);
          }
        }

        // CASE 3: Individual department approval - NO EMAIL (silent approval)
        else {
          console.log(`ℹ️ Individual approval by ${departmentName} - No email sent (waiting for all departments)`);
        }

      } catch (emailError) {
        console.error('❌ Failed to send email notification:', emailError);
        // Don't fail request if email fails
      }
    } else {
      console.log('ℹ️ Student email not available - skipping email notification');
    }

    return ApiResponse.success({
      status: updatedStatus,
      form: currentForm || form,
    }, `Successfully ${action}d no dues request for ${form.student_name}`);

  } catch (error) {
    console.error('Staff Action API Error:', error);
    return ApiResponse.error('Internal server error', 500, error.message);
  }
}
