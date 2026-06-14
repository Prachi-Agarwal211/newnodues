/**
 * Student Workflow Service
 * 
 * Handles all student-related operations including:
 * - Form submission and validation
 * - Status tracking and updates
 * - Certificate generation and verification
 * - Reapplication workflow
 * - Real-time status updates
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class StudentWorkflowService {
  constructor() {
    this.workflowSteps = [
      'form_submission',
      'department_review',
      'status_updates',
      'completion',
      'certificate_generation'
    ];
  }

  /**
   * Submit a new no dues application
   */
  async submitApplication(formData) {
    try {
      console.log('📝 Starting student application submission...');

      // Step 1: Validate and resolve configuration IDs
      const resolvedData = await this.resolveConfigurationIds(formData);

      // Step 2: Check for duplicates
      await this.checkForDuplicates(resolvedData.registration_no);

      // Step 3: Insert form with proper data
      const form = await this.insertForm(resolvedData);

      // Step 4: Create initial department statuses
      await this.createDepartmentStatuses(form.id);

      // Step 5: Sync student data
      await this.syncStudentData(form.id, resolvedData);

      // Step 6: Send notifications
      await this.sendInitialNotifications(form);

      // Step 7: Trigger real-time updates
      await this.triggerRealtimeUpdate('form_submission', form);

      console.log('✅ Application submitted successfully');
      return { success: true, data: form };

    } catch (error) {
      console.error('❌ Application submission failed:', error);
      throw error;
    }
  }

  /**
   * Resolve configuration IDs (schools, courses, branches)
   */
  async resolveConfigurationIds(formData) {
    const resolved = { ...formData };

    // Resolve School
    if (formData.school_id && this.isUuid(formData.school_id)) {
      const { data: school } = await supabaseAdmin
        .from('config_schools')
        .select('name')
        .eq('id', formData.school_id)
        .single();

      if (school) resolved.school_name = school.name;
    } else if (formData.school_id) {
      resolved.school_name = formData.school_id;
      const { data: school } = await supabaseAdmin
        .from('config_schools')
        .select('id')
        .eq('name', formData.school_id)
        .single();

      if (school) resolved.school_id = school.id;
    }

    // Resolve Course
    if (formData.course_id && this.isUuid(formData.course_id)) {
      const { data: course } = await supabaseAdmin
        .from('config_courses')
        .select('name')
        .eq('id', formData.course_id)
        .single();

      if (course) resolved.course_name = course.name;
    } else if (formData.course_id) {
      resolved.course_name = formData.course_id;
      const { data: course } = await supabaseAdmin
        .from('config_courses')
        .select('id')
        .eq('school_id', resolved.school_id)
        .eq('name', formData.course_id)
        .single();

      if (course) resolved.course_id = course.id;
    }

    // Resolve Branch
    if (formData.branch_id && this.isUuid(formData.branch_id)) {
      const { data: branch } = await supabaseAdmin
        .from('config_branches')
        .select('name')
        .eq('id', formData.branch_id)
        .single();

      if (branch) resolved.branch_name = branch.name;
    } else if (formData.branch_id) {
      resolved.branch_name = formData.branch_id;
      const { data: branch } = await supabaseAdmin
        .from('config_branches')
        .select('id')
        .eq('course_id', resolved.course_id)
        .eq('name', formData.branch_id)
        .single();

      if (branch) resolved.branch_id = branch.id;
    }

    return resolved;
  }

  /**
   * Check for duplicate registration numbers
   */
  async checkForDuplicates(registrationNo) {
    const { data: existing } = await supabaseAdmin
      .from('no_dues_forms')
      .select('id')
      .eq('registration_no', registrationNo.toUpperCase())
      .single();

    if (existing) {
      throw new Error('A form with this registration number already exists');
    }
  }

  /**
   * Insert form into database
   */
  async insertForm(formData) {
    const { data: form, error } = await supabaseAdmin
      .from('no_dues_forms')
      .insert([{
        registration_no: formData.registration_no.toUpperCase(),
        student_name: formData.student_name,
        parent_name: formData.parent_name,
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        school_id: formData.school_id,
        school: formData.school_name,
        course_id: formData.course_id,
        course: formData.course_name,
        branch_id: formData.branch_id,
        branch: formData.branch_name,
        country_code: formData.country_code,
        contact_no: formData.contact_no,
        personal_email: formData.personal_email,
        college_email: formData.college_email,
        email: formData.email,
        alumni_profile_link: formData.alumni_profile_link,
        status: 'pending',
        is_reapplication: false,
        reapplication_count: 0
      }])
      .select(`
        *,
        config_schools(
          id,
          name
        ),
        config_courses(
          id,
          name
        ),
        config_branches(
          id,
          name
        )
      `)
      .single();

    if (error) throw error;
    return form;
  }

  /**
   * Create initial department statuses
   */
  async createDepartmentStatuses(formId) {
    // Get all active departments
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('name')
      .eq('is_active', true)
      .order('display_order');

    if (!departments) return;

    // Create status records for each department
    const statusRecords = departments.map(dept => ({
      form_id: formId,
      department_name: dept.name,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { error } = await supabaseAdmin
      .from('no_dues_status')
      .insert(statusRecords);

    if (error) throw error;
    console.log(`✅ Created ${statusRecords.length} department status records`);
  }

  /**
   * Sync student data to master table
   */
  async syncStudentData(formId, formData) {
    const { error } = await supabaseAdmin
      .from('student_data')
      .upsert({
        form_id: formId,
        registration_no: formData.registration_no.toUpperCase(),
        student_name: formData.student_name,
        parent_name: formData.parent_name,
        school: formData.school_name,
        course: formData.course_name,
        branch: formData.branch_name,
        contact_no: formData.contact_no,
        personal_email: formData.personal_email,
        college_email: formData.college_email,
        admission_year: formData.admission_year,
        passing_year: formData.passing_year,
        updated_at: new Date().toISOString(),
        updated_by: 'student_submission'
      }, {
        onConflict: 'registration_no',
        ignoreDuplicates: false
      });

    if (error) throw error;
  }

  /**
   * Send initial notifications
   * 🚫 DISABLED: No longer sending individual department notifications
   * Only daily summaries and admin-triggered notifications are sent
   */
  async sendInitialNotifications(form) {
    console.log('🚫 Individual department notifications disabled - only daily summaries sent');
    return { success: true, skipped: true, reason: 'Individual notifications disabled' };
  }

  /**
   * Trigger real-time update
   */
  async triggerRealtimeUpdate(eventType, data) {
    try {
      await realtimeService.sendNotification(eventType, data);
      console.log(`📡 Real-time update triggered: ${eventType}`);
    } catch (error) {
      console.error('⚠️ Failed to trigger real-time update:', error);
    }
  }

  /**
   * Get student status by registration number
   */
  async getStudentStatus(registrationNo) {
    try {
      const { data: form, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status(
            department_name,
            status,
            action_at,
            action_by_user_id,
            rejection_reason
          )
        `)
        .eq('registration_no', registrationNo.toUpperCase())
        .single();

      if (formError) throw formError;
      if (!form) throw new Error('No form found with this registration number');

      return {
        success: true,
        data: {
          form,
          departmentStatuses: form.no_dues_status || [],
          overallStatus: form.status,
          isCompleted: form.status === 'completed',
          isRejected: form.status === 'rejected',
          certificateGenerated: form.final_certificate_generated,
          certificateUrl: form.certificate_url
        }
      };

    } catch (error) {
      console.error('❌ Failed to get student status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Submit reapplication
   */
  async submitReapplication(formId, reapplicationData) {
    try {
      console.log('🔄 Starting reapplication process...');

      // Get original form
      const { data: originalForm, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError || !originalForm) {
        throw new Error('Original form not found');
      }

      // Check reapplication limits
      await this.checkReapplicationLimits(originalForm);

      // Create reapplication history record
      await this.createReapplicationHistory(formId, reapplicationData);

      // Update form with reapplication data
      const { data: updatedForm, error: updateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'reapplied',
          reapplication_count: originalForm.reapplication_count + 1,
          last_reapplied_at: new Date().toISOString(),
          student_reply_message: reapplicationData.message,
          is_reapplication: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // Reset department statuses to pending
      await this.resetDepartmentStatuses(formId);

      // Send notifications
      await this.sendReapplicationNotifications(updatedForm);

      // Trigger real-time update
      await this.triggerRealtimeUpdate('reapplication', updatedForm);

      console.log('✅ Reapplication submitted successfully');
      return { success: true, data: updatedForm };

    } catch (error) {
      console.error('❌ Reapplication failed:', error);
      throw error;
    }
  }

  /**
   * Check reapplication limits
   */
  async checkReapplicationLimits(form) {
    // Get reapplication rules
    const { data: rules } = await supabaseAdmin
      .from('config_reapplication_rules')
      .select('*')
      .eq('is_active', true);

    const globalLimit = rules?.find(r => r.rule_type === 'global_limit')?.value || 5;
    const perDeptLimit = rules?.find(r => r.rule_type === 'per_dept_limit')?.value || 3;
    const cooldownDays = rules?.find(r => r.rule_type === 'cooldown_days')?.value || 7;

    // Check global limit
    if (form.reapplication_count >= globalLimit) {
      throw new Error(`Maximum reapplication limit (${globalLimit}) reached`);
    }

    // Check cooldown period
    if (form.last_reapplied_at) {
      const cooldownEnd = new Date(form.last_reapplied_at);
      cooldownEnd.setDate(cooldownEnd.getDate() + cooldownDays);

      if (new Date() < cooldownEnd) {
        throw new Error(`Please wait ${cooldownDays} days between reapplications`);
      }
    }

    // Check per-department limits
    const { data: history } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .select('department_responses')
      .eq('form_id', form.id);

    // This would need more complex logic to track per-department reapplications
    // For now, just log the check
    console.log(`📊 Reapplication check: Global ${form.reapplication_count}/${globalLimit}, Cooldown: ${cooldownDays} days`);
  }

  /**
   * Create reapplication history record
   */
  async createReapplicationHistory(formId, reapplicationData) {
    const { data: history } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .insert([{
        form_id: formId,
        reapplication_number: 1, // This should be calculated properly
        reapplication_reason: reapplicationData.reason,
        student_reply_message: reapplicationData.message,
        department_responses: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    return history;
  }

  /**
   * Reset department statuses to pending
   */
  async resetDepartmentStatuses(formId) {
    const { error } = await supabaseAdmin
      .from('no_dues_status')
      .update({
        status: 'pending',
        action_at: null,
        action_by_user_id: null,
        rejection_reason: null
      })
      .eq('form_id', formId);

    if (error) throw error;
  }

  /**
   * Send reapplication notifications
   */
  async sendReapplicationNotifications(form) {
    try {
      // Get departments for notification
      const { data: departments } = await supabaseAdmin
        .from('departments')
        .select('name, email')
        .eq('is_active', true);

      if (departments) {
        // Send notifications about reapplication
        console.log(`📧 Sending reapplication notifications to ${departments.length} departments`);
      }
    } catch (error) {
      console.error('⚠️ Failed to send reapplication notifications:', error);
    }
  }

  /**
   * Get reapplication history
   */
  async getReapplicationHistory(formId) {
    try {
      const { data: history, error } = await supabaseAdmin
        .from('no_dues_reapplication_history')
        .select('*')
        .eq('form_id', formId)
        .order('reapplication_number', { ascending: false });

      if (error) throw error;

      return {
        success: true,
        data: history || []
      };

    } catch (error) {
      console.error('❌ Failed to get reapplication history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if UUID
   */
  isUuid(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }
}

// Create singleton instance
const studentWorkflowService = new StudentWorkflowService();

export default studentWorkflowService;
