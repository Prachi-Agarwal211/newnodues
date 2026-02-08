/**
 * Unified Application Service (Supabase Edition)
 * * Consolidates all application-related functionality using Supabase:
 * - Form submission and validation
 * - Status tracking and updates
 * - Reapplication workflow
 * - Certificate generation triggers
 * - Real-time notifications
 */

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class ApplicationService {

  /**
   * Submit a new no-dues application
   */
  async submitApplication(formData) {
    try {
      console.log('📝 Submitting application via Supabase Service...');

      // 1. Check for duplicates
      await this.checkForDuplicates(formData.registration_no);

      // 2. Create the form and related data
      const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .insert({
          registration_no: formData.registration_no.toUpperCase(),
          student_name: formData.student_name,
          parent_name: formData.parent_name,
          admission_year: formData.admission_year,
          passing_year: formData.passing_year,
          school_id: formData.school,
          school: formData.school_name || '',
          course_id: formData.course,
          course: formData.course_name || '',
          branch_id: formData.branch,
          branch: formData.branch_name || '',
          country_code: formData.country_code,
          contact_no: formData.contact_no,
          personal_email: formData.personal_email,
          college_email: formData.college_email,
          alumni_profile_link: formData.alumni_profile_link,
          status: 'pending',
          is_reapplication: false,
          reapplication_count: 0
        })
        .select()
        .single();

      if (formError) {
        if (formError.code === '23505') { // Unique violation
          throw new Error('A form with this registration number already exists');
        }
        throw new Error(formError.message || 'Failed to create form');
      }

      // 3. Create initial department statuses
      await this.createDepartmentStatuses(form.id);

      // 4. Sync student data to master table
      await this.syncStudentData(form.id, formData);

      // 5. Real-time updates are handled by PostgreSQL triggers and Supabase realtime
      // No need for manual triggers here - the database will notify all subscribers automatically
      console.log('🚀 Real-time updates will be handled by database triggers');

      // 6. Send Email Notifications (Non-blocking)
      this.sendInitialNotifications(form).catch(err =>
        console.error('Email notification error:', err)
      );

      console.log('✅ Application submitted successfully via Supabase');
      return { success: true, data: form };

    } catch (error) {
      console.error('❌ Application submission failed:', error);
      throw error;
    }
  }

  /**
   * Handle Department Approval
   */
  async handleDepartmentApproval(formId, departmentName, remarks, actionBy) {
    try {
      console.log(`✅ Handling approval for ${formId} by ${departmentName}`);

      // 1. Update status to Approved
      const { data: updatedStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .update({
          status: 'approved',
          action_by: actionBy || departmentName,
          action_at: new Date().toISOString(),
          remarks: remarks || null,
          rejection_reason: null
        })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .select()
        .single();

      if (statusError) throw new Error(statusError.message);

      // 2. Check overall status of the form
      const { data: allStatuses, error: statusesError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', formId);

      if (statusesError) throw new Error(statusesError.message);

      const allApproved = allStatuses.every(s => s.status === 'approved');
      const hasRejection = allStatuses.some(s => s.status === 'rejected');

      let newFormStatus = 'in_progress';
      if (hasRejection) newFormStatus = 'rejected';
      else if (allApproved) newFormStatus = 'completed';

      // 3. Update Form Status
      const { data: updatedForm, error: formError } = await supabase
        .from('no_dues_forms')
        .update({
          status: newFormStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select()
        .single();

      if (formError) throw new Error(formError.message);

      const result = { updatedForm, updatedStatus, allApproved, newFormStatus };

      // Post-transaction actions
      if (result.allApproved) {
        this.sendCertificateReadyNotification(result.updatedForm);
      }

      // Real-time updates are handled by PostgreSQL triggers and Supabase realtime
      // No need for manual triggers here - database will notify all subscribers automatically
      console.log('🚀 Real-time updates will be handled by database triggers');

      await this.triggerRealtimeUpdate('department_approval', result);

      return { success: true, data: result };

    } catch (error) {
      console.error('❌ Department approval failed:', error);
      throw error;
    }
  }

  /**
   * Handle Department Rejection
   */
  async handleDepartmentRejection(formId, departmentName, reason, remarks, actionBy) {
    try {
      console.log(`🚫 Handling rejection for ${formId} by ${departmentName}`);

      // 1. Update Department Status
      const { data: updatedStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          remarks: remarks || null,
          action_by: actionBy || departmentName,
          action_at: new Date().toISOString()
        })
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .select()
        .single();

      if (statusError) throw new Error(statusError.message);

      // 2. Get all department statuses to implement cascade rejection
      const { data: allStatuses, error: allStatusError } = await supabase
        .from('no_dues_status')
        .select('department_name, status')
        .eq('form_id', formId);

      if (allStatusError) throw allStatusError;

      // 3. Implement cascade rejection logic
      const pendingDepartments = allStatuses
        .filter(s => s.status === 'pending' && s.department_name !== departmentName)
        .map(s => s.department_name);

      let rejectionContext = {
        primary_rejector: departmentName,
        primary_reason: reason,
        rejected_at: new Date().toISOString(),
        cascade_count: 0,
        cascade_departments: []
      };

      // 4. Cascade reject pending departments if any exist
      if (pendingDepartments.length > 0) {
        console.log(`🔄 Auto-rejecting ${pendingDepartments.length} pending departments:`, pendingDepartments);
        
        rejectionContext.cascade_count = pendingDepartments.length;
        rejectionContext.cascade_departments = pendingDepartments;

        const { error: cascadeError } = await supabase
          .from('no_dues_status')
          .update({
            status: 'rejected',
            rejection_reason: `Auto-rejected due to ${departmentName} rejection: ${reason}`,
            action_at: new Date().toISOString(),
            action_by: 'system_cascade'
          })
          .eq('form_id', formId)
          .in('department_name', pendingDepartments);

        if (cascadeError) throw cascadeError;
      }

      // 5. Update Form Status with rejection context
      const { data: updatedForm, error: formError } = await supabase
        .from('no_dues_forms')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          rejection_context: rejectionContext,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select()
        .single();

      if (formError) throw new Error(formError.message);

      const result = { updatedForm, updatedStatus, rejectionContext };

      // Notifications
      this.sendRejectionNotifications(result.updatedForm, departmentName, reason);
      
      // IMMEDIATE REAL-TIME TRIGGER FOR DEPARTMENT DASHBOARDS
      try {
        // Trigger custom event for immediate UI updates
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('department-action-completed', {
            detail: {
              formId: formId,
              departmentName: departmentName,
              action: 'rejected',
              status: 'rejected',
              reason: reason,
              cascadeCount: rejectionContext.cascade_count,
              cascadeDepartments: rejectionContext.cascade_departments,
              timestamp: Date.now()
            }
          }));
        }

        // Also trigger global real-time event
        if (typeof global !== 'undefined' && global.realtimeManager) {
          global.realtimeManager.broadcast('globalUpdate', {
            formIds: [formId],
            eventTypes: ['department_action', 'cascade_rejection'],
            hasDepartmentAction: true,
            hasCascadeRejection: rejectionContext.cascade_count > 0,
            timestamp: Date.now()
          });
        }

        console.log('🚫 IMMEDIATE REAL-TIME TRIGGERED for department rejection:', departmentName);
        if (rejectionContext.cascade_count > 0) {
          console.log(`🔄 CASCADE REJECTION: Auto-rejected ${rejectionContext.cascade_count} departments`);
        }
      } catch (realtimeError) {
        console.error('❌ Failed to trigger immediate real-time update:', realtimeError);
      }

      await this.triggerRealtimeUpdate('department_rejection', result);

      return { success: true, data: result };

    } catch (error) {
      console.error('❌ Department rejection failed:', error);
      throw error;
    }
  }

  /**
   * Get Student Status
   */
  async getStudentStatus(registrationNo) {
    try {
      // Get the form
      const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', registrationNo.toUpperCase())
        .single();

      if (formError || !form) {
        throw new Error('No form found with this registration number');
      }

      // Get department statuses
      const { data: departmentStatuses, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .eq('form_id', form.id);

      if (statusError) {
        console.error('Error fetching department statuses:', statusError);
        // Continue with empty array if there's an error
      }

      return {
        success: true,
        data: {
          form,
          departmentStatuses: departmentStatuses || [],
          overallStatus: form.status,
          isCompleted: form.status === 'completed',
          isRejected: form.status === 'rejected',
          certificateGenerated: form.final_certificate_generated,
          certificateUrl: form.certificate_url
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Handle student reapplication for per-department rejection
   */
  async handleReapplication(formId, data) {
    try {
      console.log(`♻️ Handling reapplication for ${formId}, department: ${data.department}`);

      // 1. Fetch current form and statuses for history backup
      const [formResult, statusesResult] = await Promise.all([
        supabase.from('no_dues_forms').select('*').eq('id', formId).single(),
        supabase.from('no_dues_status').select('*').eq('form_id', formId)
      ]);

      if (formResult.error) throw formResult.error;
      const form = formResult.data;
      const statuses = statusesResult.data || [];

      const newReapplicationCount = (form.reapplication_count || 0) + 1;

      // 2. LOG HISTORY
      const { error: historyError } = await supabase
        .from('no_dues_reapplication_history')
        .insert({
          form_id: formId,
          reapplication_number: newReapplicationCount,
          department_name: data.department || null,
          student_reply_message: data.reason,
          edited_fields: data.editedFields || {},
          previous_status: statuses.map(s => ({
            department_name: s.department_name,
            status: s.status,
            rejection_reason: s.rejection_reason,
            action_at: s.action_at
          }))
        });

      if (historyError) {
        console.error('History log error:', historyError);
        // Continue anyway as this is secondary
      }

      // 3. RESET DEPARTMENT STATUS
      // Logic: If a specific department is provided, only reset THAT one.
      // If it's a global reapply (no department), reset ALL rejected departments.
      let statusQuery = supabase
        .from('no_dues_status')
        .update({
          status: 'pending',
          rejection_reason: null,
          student_reply_message: data.reason, // Store the student's reply message
          action_at: null,
          action_by_user_id: null
        })
        .eq('form_id', formId);

      if (data.department) {
        statusQuery = statusQuery.eq('department_name', data.department);
      } else {
        statusQuery = statusQuery.eq('status', 'rejected');
      }

      const { error: statusResetError } = await statusQuery;
      if (statusResetError) throw statusResetError;

      // 4. CHECK OVERALL FORM STATUS
      // After resetting, check if all departments are approved or still some rejected
      const { data: updatedStatuses } = await supabase
        .from('no_dues_status')
        .select('status')
        .eq('form_id', formId);

      const allApproved = updatedStatuses?.every(s => s.status === 'approved');
      const hasRejected = updatedStatuses?.some(s => s.status === 'rejected');

      let newFormStatus = 'in_progress';
      if (hasRejected) newFormStatus = 'rejected'; // Still has rejected departments
      else if (allApproved) newFormStatus = 'completed';

      // 5. UPDATE FORM (only update reapplication fields, not status based on global)
      const { error: formUpdateError } = await supabase
        .from('no_dues_forms')
        .update({
          status: newFormStatus, // Set based on actual department statuses
          reapplication_count: newReapplicationCount,
          last_reapplied_at: new Date().toISOString(),
          is_reapplication: true,
          student_reply_message: data.reason, // Store the latest reply message
          rejection_reason: hasRejected ? form.rejection_reason : null, // Clear only if no rejected depts
          rejection_context: hasRejected ? form.rejection_context : null
        })
        .eq('id', formId);

      if (formUpdateError) throw formUpdateError;

      // 6. TRIGGER REALTIME
      await this.triggerRealtimeUpdate('reapplication_submitted', { 
        formId, 
        type: 'reapply', 
        department: data.department,
        newStatus: newFormStatus
      });

      return {
        success: true,
        count: newReapplicationCount,
        newStatus: newFormStatus
      };

    } catch (error) {
      console.error('❌ Reapplication processing failed:', error);
      throw error;
    }
  }

  /**
   * Get reapplication history for a form
   */
  async getReapplicationHistory(formId) {
    try {
      const { data, error } = await supabase
        .from('no_dues_reapplication_history')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { success: true, data: { history: data || [] } };
    } catch (error) {
      console.error('Error fetching history:', error);
      return { success: false, error: error.message };
    }
  }

  // ================= PRIVATE HELPERS =================

  async checkForDuplicates(registrationNo) {
    const { data, error } = await supabase
      .from('no_dues_forms')
      .select('id, status')
      .eq('registration_no', registrationNo.toUpperCase())
      .maybeSingle();

    if (data) {
      if (data.status === 'rejected') {
        // Allow re-submission by marking the old form as archived or deleting if needed
        // For now, we just let the unique constraint handle it unless we decide to purge
        // A better way is to allow the submission but update the existing record
        // Here we just signal that the user already has a pending or completed form
        return;
      }
      throw new Error(`A form with this registration number already exists (Status: ${data.status})`);
    }
  }

  async createDepartmentStatuses(formId) {
    try {
      // 1. Fetch form data to get student context
      const { data: form, error: formError } = await supabase
        .from('no_dues_forms')
        .select('school_id, course_id, branch_id')
        .eq('id', formId)
        .single();

      if (formError) throw formError;

      // 2. Fetch all active departments
      const { data: departments, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error || !departments || departments.length === 0) {
        console.warn('⚠️ No active departments found in configuration.');
        return;
      }

      // 3. Filter departments based on scope
      const relevantDepartments = departments.filter(dept => {
        // If NO scope is defined, it applies to EVERYONE
        const hasNoScope =
          (!dept.allowed_school_ids || dept.allowed_school_ids.length === 0) &&
          (!dept.allowed_course_ids || dept.allowed_course_ids.length === 0) &&
          (!dept.allowed_branch_ids || dept.allowed_branch_ids.length === 0);

        if (hasNoScope) return true;

        // Check School Scope
        const schoolMatch = !dept.allowed_school_ids || dept.allowed_school_ids.length === 0 ||
          dept.allowed_school_ids.includes(form.school_id);

        // Check Course Scope
        const courseMatch = !dept.allowed_course_ids || dept.allowed_course_ids.length === 0 ||
          dept.allowed_course_ids.includes(form.course_id);

        // Check Branch Scope
        const branchMatch = !dept.allowed_branch_ids || dept.allowed_branch_ids.length === 0 ||
          dept.allowed_branch_ids.includes(form.branch_id);

        return schoolMatch && courseMatch && branchMatch;
      });

      if (relevantDepartments.length === 0) {
        console.warn('⚠️ No departments matched student scope. This form is stuck.');
        return;
      }

      // 4. Create status records
      const statusRecords = relevantDepartments.map(dept => ({
        form_id: formId,
        department_name: dept.name,
        status: 'pending'
      }));

      const { error: insertError } = await supabase
        .from('no_dues_status')
        .insert(statusRecords)
        .then();

      if (insertError) {
        console.error('Error creating department statuses:', insertError);
        throw new Error(insertError.message);
      }
    } catch (err) {
      console.error('❌ Failed to create department statuses:', err);
      throw err;
    }
  }

  async syncStudentData(formId, formData) {
    const studentData = {
      form_id: formId,
      registration_no: formData.registration_no.toUpperCase(),
      student_name: formData.student_name,
      parent_name: formData.parent_name,
      school: formData.school_name || '',
      course: formData.course_name || '',
      branch: formData.branch_name || '',
      contact_no: formData.contact_no,
      personal_email: formData.personal_email,
      college_email: formData.college_email,
      admission_year: formData.admission_year,
      passing_year: formData.passing_year,
      alumni_profile_link: formData.alumni_profile_link,
      updated_at: new Date().toISOString(),
      updated_by: 'student_submission'
    };

    // Try to upsert into StudentData table
    const { error } = await supabase
      .from('student_data')
      .upsert(studentData, { onConflict: 'form_id' })
      .then();

    if (error) {
      console.error('Error syncing student data:', error);
      // Don't throw error as this shouldn't block the main operation
    }
  }

  async triggerRealtimeUpdate(eventType, data) {
    // Use the Unified Realtime Service to broadcast
    try {
      await realtimeService.sendNotification(eventType, data);
    } catch (e) {
      console.warn('Realtime update failed to trigger', e);
    }
  }

  // Placeholders for email service integrations
  async sendInitialNotifications(form) { /* Implementation */ }
  async sendCertificateReadyNotification(form) { /* Implementation */ }
  async sendRejectionNotifications(form, dept, reason) { /* Implementation */ }
}

export default new ApplicationService();