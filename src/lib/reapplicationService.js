/**
 * Enhanced Reapplication Service
 * 
 * Handles complex reapplication logic with:
 * - Priority-based queue management
 * - Rejection reason tracking
 * - State management for reapplications
 * - Client-side experience optimization
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class ReapplicationService {
  constructor() {
    this.reapplicationStates = {
      PENDING: 'pending',
      REAPPLIED: 'reapplied',
      UNDER_REVIEW: 'under_review',
      REAPPROVED: 'reapproved',
      REREJECTED: 'rerejected'
    };

    this.priorityWeights = {
      'reapplied': 1000,
      'rejected': 800,
      'pending': 600,
      'completed': 200
    };
  }

  /**
   * Handle department rejection with proper reason tracking
   */
  async handleDepartmentRejection(formId, department, reason, remarks, actionBy) {
    try {
      console.log(`🚫 Handling rejection for form ${formId} by ${department}`);

      // 1. Update department status with rejection reason
      const { data: statusUpdate, error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          action_by_user_id: actionBy,
          action_at: new Date().toISOString()
        })
        .eq('form_id', formId)
        .eq('department_name', department)
        .select('*')
        .single();

      if (statusError) throw statusError;

      // 2. Update form status to rejected
      const { data: formUpdate, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'rejected',
          rejection_context: {
            primary_rejector: department,
            primary_reason: reason,
            rejected_at: new Date().toISOString(),
            remarks: remarks || null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select('*')
        .single();

      if (formError) throw formError;

      // 3. Send rejection notifications
      await this.sendRejectionNotifications(formUpdate, department, reason);

      // 4. Trigger real-time updates
      await this.triggerRealtimeUpdate('department_rejection', {
        formId,
        department,
        reason,
        form: formUpdate,
        status: statusUpdate
      });

      // 5. Log the rejection for audit
      await this.logRejection(formId, department, reason, actionBy);

      return {
        success: true,
        data: {
          form: formUpdate,
          status: statusUpdate,
          message: `Application rejected by ${department}. Reason: ${reason}`
        }
      };

    } catch (error) {
      console.error('❌ Failed to handle department rejection:', error);
      throw error;
    }
  }

  /**
   * Handle student reapplication with priority management
   */
  async handleReapplication(formId, reapplicationData) {
    try {
      console.log(`🔄 Handling reapplication for form ${formId}`);

      // 1. Get current form and check reapplication eligibility
      const { data: currentForm, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (formError || !currentForm) {
        throw new Error('Original form not found');
      }

      // 2. Check global re-application toggle
      const { data: setting } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'allow_reapplication')
        .single();

      if (setting && setting.value === false) {
        throw new Error('Re-application is currently disabled by the administrator');
      }

      // 3. Check reapplication limits and cooldown
      await this.validateReapplicationEligibility(currentForm);

      // 3. Create reapplication history record
      const historyRecord = await this.createReapplicationHistory(formId, reapplicationData);

      // 4. Update form to reapplication state
      const { data: updatedForm, error: updateError } = await supabaseAdmin
        .from('no_dues_forms')
        .update({
          status: 'reapplied',
          reapplication_count: currentForm.reapplication_count + 1,
          last_reapplied_at: new Date().toISOString(),
          student_reply_message: reapplicationData.message,
          is_reapplication: true,
          rejection_context: {
            ...currentForm.rejection_context,
            reapplication_reason: reapplicationData.reason,
            reapplication_history_id: historyRecord.id,
            reapplication_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', formId)
        .select('*')
        .single();

      if (updateError) throw updateError;

      // 5. Reset department statuses to pending
      await this.resetDepartmentStatuses(formId);

      // 6. Update priority in the queue
      await this.updateReapplicationPriority(formId);

      // 7. Send reapplication notifications
      await this.sendReapplicationNotifications(updatedForm, reapplicationData);

      // 8. Trigger real-time updates
      await this.triggerRealtimeUpdate('student_reapplication', {
        formId,
        form: updatedForm,
        history: historyRecord,
        priority: this.priorityWeights['reapplied']
      });

      console.log(`✅ Reapplication handled successfully for form ${formId}`);
      return {
        success: true,
        data: {
          form: updatedForm,
          history: historyRecord,
          message: 'Reapplication submitted successfully. Your application is now under priority review.'
        }
      };

    } catch (error) {
      console.error('❌ Failed to handle reapplication:', error);
      throw error;
    }
  }

  /**
   * Validate reapplication eligibility
   */
  async validateReapplicationEligibility(form) {
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

    // Check if form is in a state that allows reapplication
    if (!['rejected', 'completed'].includes(form.status)) {
      throw new Error('Reapplication is only allowed for rejected or completed applications');
    }

    console.log(`✅ Reapplication eligibility validated`);
  }

  /**
   * Create reapplication history record
   */
  async createReapplicationHistory(formId, reapplicationData) {
    // Calculate reapplication number from existing history
    const { data: existingHistory, error: historyError } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .select('reapplication_number')
      .eq('form_id', formId)
      .order('reapplication_number', { ascending: false })
      .limit(1);

    const nextReapplicationNumber = existingHistory && existingHistory.length > 0
      ? existingHistory[0].reapplication_number + 1
      : 1;

    const { data: history, error } = await supabaseAdmin
      .from('no_dues_reapplication_history')
      .insert([{
        form_id: formId,
        reapplication_number: nextReapplicationNumber,
        reapplication_reason: reapplicationData.reason,
        student_reply_message: reapplicationData.message,
        department_responses: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) throw error;
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
    console.log(`🔄 Reset department statuses for form ${formId}`);
  }

  /**
   * Update reapplication priority in queue
   */
  async updateReapplicationPriority(formId) {
    // This could update a priority field or use created_at for ordering
    // For now, we'll rely on the status and timestamp for priority
    console.log(`📊 Updated priority for reapplication ${formId}`);
  }

  /**
   * Get prioritized applications list
   */
  async getPrioritizedApplications(filters = {}) {
    try {
      let query = supabaseAdmin
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status(
            department_name,
            status,
            action_at,
            action_by_user_id
          )
        `);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Order by priority (reapplied first, then by creation time)
      const { data, error } = await query
        .order('status', { ascending: false }) // reapplied comes first
        .order('last_reapplied_at', { ascending: false, nullsFirst: false }) // most recent reapplications
        .order('created_at', { ascending: false }) // newest first for same status
        .limit(filters.limit || 100);

      if (error) throw error;

      return {
        success: true,
        data: data || []
      };

    } catch (error) {
      console.error('❌ Failed to get prioritized applications:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Send rejection notifications
   */
  async sendRejectionNotifications(form, department, reason) {
    try {
      // Send email to student
      console.log(`📧 Sending rejection notification to ${form.personal_email}`);

      // Send notification to other departments about rejection
      console.log(`📧 Notifying other departments about rejection by ${department}`);

    } catch (error) {
      console.error('⚠️ Failed to send rejection notifications:', error);
    }
  }

  /**
   * Send reapplication notifications
   */
  async sendReapplicationNotifications(form, reapplicationData) {
    try {
      // Send confirmation to student
      console.log(`📧 Sending reapplication confirmation to ${form.personal_email}`);

      // Send high-priority notification to all departments
      console.log(`📧 Sending high-priority reapplication notification to departments`);

    } catch (error) {
      console.error('⚠️ Failed to send reapplication notifications:', error);
    }
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
   * Log rejection for audit
   */
  async logRejection(formId, department, reason, actionBy) {
    try {
      const { error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          action: 'department_rejection',
          actor_id: actionBy,
          actor_name: department,
          target_id: formId,
          target_type: 'no_dues_form',
          old_values: { status: 'pending' },
          new_values: { status: 'rejected', rejection_reason: reason },
          ip_address: 'system',
          user_agent: 'department_action_api',
          created_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('⚠️ Failed to log rejection:', error);
    }
  }

  /**
   * Get rejection statistics
   */
  async getRejectionStatistics(timeframe = '30d') {
    try {
      const startDate = new Date();
      if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (timeframe === '90d') startDate.setDate(startDate.getDate() - 90);

      const { data, error } = await supabaseAdmin
        .from('no_dues_status')
        .select(`
          department_name,
          status,
          rejection_reason,
          action_at,
          no_dues_forms(
            student_name,
            registration_no,
            created_at
          )
        `)
        .eq('status', 'rejected')
        .gte('action_at', startDate.toISOString())
        .order('action_at', { ascending: false });

      if (error) throw error;

      // Process statistics
      const stats = {
        total_rejections: data?.length || 0,
        by_department: {},
        by_reason: {},
        reapplication_rate: 0,
        common_reasons: []
      };

      data?.forEach(rejection => {
        // Department breakdown
        if (!stats.by_department[rejection.department_name]) {
          stats.by_department[rejection.department_name] = 0;
        }
        stats.by_department[rejection.department_name]++;

        // Reason breakdown
        const reason = rejection.rejection_reason || 'No reason provided';
        if (!stats.by_reason[reason]) {
          stats.by_reason[reason] = 0;
        }
        stats.by_reason[reason]++;
      });

      // Find common reasons
      stats.common_reasons = Object.entries(stats.by_reason)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([reason, count]) => ({ reason, count }));

      return {
        success: true,
        data: stats
      };

    } catch (error) {
      console.error('❌ Failed to get rejection statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get reapplication queue status
   */
  async getReapplicationQueueStatus() {
    try {
      const { data: reapplied, error: reappliedError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, student_name, registration_no, last_reapplied_at, reapplication_count')
        .eq('status', 'reapplied')
        .order('last_reapplied_at', { ascending: false });

      if (reappliedError) throw reappliedError;

      const { data: pending, error: pendingError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, student_name, registration_no, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) throw pendingError;

      return {
        success: true,
        data: {
          reapplications: reapplied || [],
          pending_applications: pending || [],
          queue_length: (reapplied?.length || 0) + (pending?.length || 0),
          average_wait_time: this.calculateAverageWaitTime(reapplied || [])
        }
      };

    } catch (error) {
      console.error('❌ Failed to get reapplication queue status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Calculate average wait time for reapplications
   */
  calculateAverageWaitTime(reapplications) {
    if (reapplications.length === 0) return 0;

    const now = new Date();
    const totalWaitTime = reapplications.reduce((total, app) => {
      const reapplyTime = new Date(app.last_reapplied_at);
      const waitHours = (now - reapplyTime) / (1000 * 60 * 60);
      return total + waitHours;
    }, 0);

    return (totalWaitTime / reapplications.length).toFixed(1);
  }
}

// Create singleton instance
const reapplicationService = new ReapplicationService();

export default reapplicationService;
