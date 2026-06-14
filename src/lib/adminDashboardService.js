/**
 * Admin Dashboard Service
 * 
 * Handles all admin dashboard operations including:
 * - Statistics and analytics
 * - Form management and approval
 * - User management
 * - System configuration
 * - Real-time dashboard updates
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import realtimeService from '@/lib/realtimeService';

class AdminDashboardService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStats(filters = {}) {
    try {
      console.log('📊 Fetching dashboard statistics...');

      const cacheKey = `dashboard_stats_${JSON.stringify(filters)}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📋 Using cached dashboard stats');
        return cached.data;
      }

      // Parallel fetch all statistics
      const [
        overallStats,
        departmentStats,
        recentActivity,
        trendStats,
        certificateStats
      ] = await Promise.all([
        this.getOverallStatistics(filters),
        this.getDepartmentStatistics(filters),
        this.getRecentActivity(filters),
        this.getTrendStatistics(filters),
        this.getCertificateStatistics(filters)
      ]);

      const stats = {
        overall: overallStats,
        departments: departmentStats,
        recentActivity,
        trends: trendStats,
        certificates: certificateStats,
        lastUpdated: new Date().toISOString()
      };

      // Cache the results
      this.cache.set(cacheKey, {
        data: stats,
        timestamp: Date.now()
      });

      console.log('✅ Dashboard statistics fetched successfully');
      return stats;

    } catch (error) {
      console.error('❌ Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get overall statistics
   */
  async getOverallStatistics(filters = {}) {
    const { startDate, endDate, status } = filters;

    let query = supabaseAdmin
      .from('no_dues_forms')
      .select('status, created_at');

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: data?.filter(f => f.status === 'pending' || f.status === 'in_progress').length || 0,
      completed: data?.filter(f => f.status === 'completed').length || 0,
      rejected: data?.filter(f => f.status === 'rejected').length || 0,
      reapplied: data?.filter(f => f.status === 'reapplied').length || 0
    };

    // Calculate completion rate
    stats.completion_rate = stats.total > 0 
      ? ((stats.completed / stats.total) * 100).toFixed(1) 
      : 0;

    return stats;
  }

  /**
   * Get department-wise statistics
   */
  async getDepartmentStatistics(filters = {}) {
    const { startDate, endDate } = filters;

    let query = supabaseAdmin
      .from('no_dues_status')
      .select(`
        department_name,
        status,
        action_at,
        created_at
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by department and status
    const deptStats = {};
    
    data?.forEach(status => {
      if (!deptStats[status.department_name]) {
        deptStats[status.department_name] = {
          department_name: status.department_name,
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          avg_response_time: 0,
          last_action: null
        };
      }

      const dept = deptStats[status.department_name];
      dept.total++;
      
      if (status.status === 'pending') dept.pending++;
      else if (status.status === 'approved') dept.approved++;
      else if (status.status === 'rejected') dept.rejected++;

      // Track last action
      if (status.action_at && (!dept.last_action || new Date(status.action_at) > new Date(dept.last_action))) {
        dept.last_action = status.action_at;
      }
    });

    // Calculate average response times and sort by total requests
    const sortedDepts = Object.values(deptStats)
      .map(dept => ({
        ...dept,
        approval_rate: dept.total > 0 ? ((dept.approved / dept.total) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.total - a.total);

    return sortedDepts;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20) {
    const { data, error } = await supabaseAdmin
      .from('no_dues_status')
      .select(`
        *,
        no_dues_forms(
          student_name,
          registration_no
        )
      `)
      .order('action_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data?.map(activity => ({
      ...activity,
      form: activity.no_dues_forms
    })) || [];
  }

  /**
   * Get trend statistics (last 30 days)
   */
  async getTrendStatistics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabaseAdmin
      .from('no_dues_forms')
      .select('created_at, status')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by date
    const dailyStats = {};
    
    data?.forEach(form => {
      const date = new Date(form.created_at).toISOString().split('T')[0];
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total: 0,
          pending: 0,
          completed: 0,
          rejected: 0
        };
      }

      dailyStats[date].total++;
      dailyStats[date][form.status]++;
    });

    return Object.values(dailyStats);
  }

  /**
   * Get certificate statistics
   */
  async getCertificateStatistics() {
    const { data, error } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        final_certificate_generated,
        certificate_url,
        blockchain_verified,
        created_at
      `)
      .eq('final_certificate_generated', true);

    if (error) throw error;

    const stats = {
      total_generated: data?.length || 0,
      blockchain_verified: data?.filter(f => f.blockchain_verified).length || 0,
      verification_rate: data?.length > 0 
        ? ((data.filter(f => f.blockchain_verified).length / data.length) * 100).toFixed(1)
        : 0,
      recent_generations: data?.filter(f => {
        const generatedDate = new Date(f.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return generatedDate > weekAgo;
      }).length || 0
    };

    return stats;
  }

  /**
   * Get all applications with pagination and filtering
   */
  async getApplications(options = {}) {
    const {
      page = 1,
      limit = 50,
      status,
      department,
      startDate,
      endDate,
      search
    } = options;

    const offset = (page - 1) * limit;

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
      if (status) query = query.eq('status', status);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      if (search) {
        query = query.or(`student_name.ilike.%${search}%,registration_no.ilike.%${search}%`);
      }

      // Get total count
      const { count } = await query.clone().select('*', { count: 'exact', head: true });

      // Apply pagination and ordering
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Filter by department if specified
      let filteredData = data || [];
      if (department) {
        filteredData = data?.filter(form => 
          form.no_dues_status?.some(status => status.department_name === department)
        ) || [];
      }

      return {
        success: true,
        data: filteredData,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };

    } catch (error) {
      console.error('❌ Failed to get applications:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Get application details by ID
   */
  async getApplicationDetails(formId) {
    try {
      const { data: form, error } = await supabaseAdmin
        .from('no_dues_forms')
        .select(`
          *,
          no_dues_status(
            department_name,
            status,
            action_at,
            action_by_user_id,
            rejection_reason
          ),
          no_dues_messages(
            id,
            department_name,
            message,
            sender_type,
            sender_name,
            created_at,
            is_read
          )
        `)
        .eq('id', formId)
        .single();

      if (error) throw error;
      if (!form) throw new Error('Application not found');

      // Get reapplication history if any
      const { data: reapplicationHistory } = await supabaseAdmin
        .from('no_dues_reapplication_history')
        .select('*')
        .eq('form_id', formId)
        .order('reapplication_number', { ascending: false });

      return {
        success: true,
        data: {
          ...form,
          reapplicationHistory: reapplicationHistory || []
        }
      };

    } catch (error) {
      console.error('❌ Failed to get application details:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Bulk update applications
   */
  async bulkUpdateApplications(formIds, updates) {
    try {
      console.log(`🔄 Bulk updating ${formIds.length} applications...`);

      const { data, error } = await supabaseAdmin
        .from('no_dues_forms')
        .update(updates)
        .in('id', formIds)
        .select('*');

      if (error) throw error;

      // Trigger real-time updates
      await this.triggerBulkRealtimeUpdates('bulk_update', data);

      console.log(`✅ Successfully updated ${data?.length || 0} applications`);
      return {
        success: true,
        updated: data?.length || 0,
        data
      };

    } catch (error) {
      console.error('❌ Bulk update failed:', error);
      throw error;
    }
  }

  /**
   * Get user management data
   */
  async getUserManagementData() {
    try {
      const [users, departments, stats] = await Promise.all([
        this.getAllUsers(),
        this.getDepartments(),
        this.getUserStats()
      ]);

      return {
        success: true,
        data: {
          users,
          departments,
          stats
        }
      };

    } catch (error) {
      console.error('❌ Failed to get user management data:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get departments
   */
  async getDepartments() {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('display_order');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('role');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      admin: data?.filter(u => u.role === 'admin').length || 0,
      staff: data?.filter(u => u.role === 'staff').length || 0,
      student: data?.filter(u => u.role === 'student').length || 0
    };

    return stats;
  }

  /**
   * Update user role
   */
  async updateUserRole(userId, role) {
    try {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select('*')
        .single();

      if (error) throw error;

      // Trigger real-time update
      await realtimeService.sendNotification('user_role_update', data);

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('❌ Failed to update user role:', error);
      throw error;
    }
  }

  /**
   * Get system configuration
   */
  async getSystemConfiguration() {
    try {
      const [schools, courses, branches, emails, validationRules] = await Promise.all([
        supabaseAdmin.from('config_schools').select('*').order('display_order'),
        supabaseAdmin.from('config_courses').select('*').order('display_order'),
        supabaseAdmin.from('config_branches').select('*').order('display_order'),
        supabaseAdmin.from('config_emails').select('*'),
        supabaseAdmin.from('config_validation_rules').select('*')
      ]);

      return {
        success: true,
        data: {
          schools: schools.data || [],
          courses: courses.data || [],
          branches: branches.data || [],
          emails: emails.data || [],
          validationRules: validationRules.data || []
        }
      };

    } catch (error) {
      console.error('❌ Failed to get system configuration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Trigger bulk real-time updates
   */
  async triggerBulkRealtimeUpdate(eventType, data) {
    try {
      await realtimeService.sendNotification(eventType, {
        type: 'bulk_operation',
        affected: data?.length || 0,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('⚠️ Failed to trigger bulk real-time update:', error);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Admin dashboard cache cleared');
  }
}

// Create singleton instance
const adminDashboardService = new AdminDashboardService();

export default adminDashboardService;
