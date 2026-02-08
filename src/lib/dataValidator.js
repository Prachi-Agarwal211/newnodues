/**
 * Data Validation Layer
 * 
 * Provides centralized validation for form status transitions and data consistency
 * Prevents invalid state changes and ensures data integrity
 */

import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

class DataValidator {
  constructor() {
    // Define valid status transitions
    this.validTransitions = {
      'pending': ['in_progress', 'rejected'],
      'in_progress': ['completed', 'rejected'],
      'rejected': ['reapplied'],
      'reapplied': ['in_progress', 'rejected'],
      'completed': [], // Terminal state
      'approved': ['completed'] // For manual entries
    };

    // Define required fields for different operations
    this.requiredFields = {
      formSubmission: [
        'registration_no',
        'student_name',
        'school_id',
        'course_id',
        'branch_id',
        'personal_email',
        'college_email',
        'contact_no'
      ],
      departmentAction: [
        'form_id',
        'department_name',
        'status'
      ],
      reapplication: [
        'form_id',
        'reason'
      ]
    };
  }

  /**
   * Validate form status transition
   */
  async validateFormStatusTransition(formId, newStatus, context = {}) {
    try {
      // Get current form status
      const { data: currentForm, error: fetchError } = await supabase
        .from('no_dues_forms')
        .select('status, rejection_context')
        .eq('id', formId)
        .single();

      if (fetchError || !currentForm) {
        throw new Error(`Form not found: ${fetchError?.message || 'Unknown error'}`);
      }

      const currentStatus = currentForm.status;
      const validNextStates = this.validTransitions[currentStatus] || [];

      // Check if transition is valid
      if (!validNextStates.includes(newStatus)) {
        throw new Error(
          `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
          `Valid transitions from ${currentStatus}: ${validNextStates.join(', ')}`
        );
      }

      // Additional validation for specific transitions
      if (newStatus === 'completed') {
        await this.validateCompletionRequirements(formId);
      }

      if (newStatus === 'reapplied') {
        await this.validateReapplicationRequirements(currentForm);
      }

      console.log(`✅ Status transition validated: ${currentStatus} → ${newStatus}`);
      return { valid: true, currentStatus, newStatus };

    } catch (error) {
      console.error('❌ Status transition validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate requirements for form completion
   */
  async validateCompletionRequirements(formId) {
    const { data: statuses, error: statusError } = await supabase
      .from('no_dues_status')
      .select('department_name, status')
      .eq('form_id', formId);

    if (statusError) {
      throw new Error(`Failed to fetch department statuses: ${statusError.message}`);
    }

    const allApproved = statuses?.every(s => s.status === 'approved');
    if (!allApproved) {
      const pendingDepts = statuses?.filter(s => s.status !== 'approved').map(s => s.department_name);
      throw new Error(
        `Cannot complete form. Pending departments: ${pendingDepts.join(', ')}`
      );
    }

    console.log('✅ Form completion requirements validated');
  }

  /**
   * Validate requirements for reapplication
   */
  async validateReapplicationRequirements(form) {
    if (form.status !== 'rejected' && form.status !== 'completed') {
      throw new Error(
        `Reapplication only allowed for rejected or completed forms. Current status: ${form.status}`
      );
    }

    // Check reapplication count limits
    const maxReapplications = 5;
    if (form.reapplication_count >= maxReapplications) {
      throw new Error(
        `Maximum reapplication limit (${maxReapplications}) reached. Current: ${form.reapplication_count}`
      );
    }

    // Check cooldown period (7 days)
    if (form.last_reapplied_at) {
      const cooldownEnd = new Date(form.last_reapplied_at);
      cooldownEnd.setDate(cooldownEnd.getDate() + 7);
      
      if (new Date() < cooldownEnd) {
        const daysRemaining = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60 * 24));
        throw new Error(
          `Please wait ${daysRemaining} days before reapplying. Last reapplication: ${form.last_reapplied_at}`
        );
      }
    }

    console.log('✅ Reapplication requirements validated');
  }

  /**
   * Validate required fields for different operations
   */
  validateRequiredFields(operation, data) {
    const required = this.requiredFields[operation];
    if (!required) {
      throw new Error(`Unknown operation type: ${operation}`);
    }

    const missing = required.filter(field => {
      const value = data[field];
      return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
      throw new Error(
        `Missing required fields for ${operation}: ${missing.join(', ')}`
      );
    }

    console.log(`✅ Required fields validated for ${operation}`);
    return { valid: true };
  }

  /**
   * Validate department authorization
   */
  async validateDepartmentAuthorization(userId, departmentName, formId) {
    try {
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, department_name, assigned_department_ids')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        throw new Error('User profile not found');
      }

      // Check if user has department role
      if (profile.role !== 'department' && profile.role !== 'admin') {
        throw new Error('Unauthorized: User is not a department staff member');
      }

      // Check if user is assigned to this department
      const isAssigned = profile.department_name === departmentName || 
        profile.assigned_department_ids?.includes(departmentName);

      if (!isAssigned) {
        throw new Error(`Unauthorized: User not assigned to department ${departmentName}`);
      }

      // Check if department needs to act on this form
      const { data: formStatus, error: statusError } = await supabase
        .from('no_dues_status')
        .select('status')
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .single();

      if (statusError) {
        throw new Error(`Failed to check department status: ${statusError.message}`);
      }

      if (!formStatus || formStatus.status === 'approved') {
        throw new Error(`Department ${departmentName} has already acted on this form`);
      }

      console.log(`✅ Department authorization validated for ${departmentName}`);
      return { valid: true, profile };

    } catch (error) {
      console.error('❌ Department authorization validation failed:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate email format and domain
   */
  validateEmail(email, collegeDomain = null) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailPattern.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    if (collegeDomain && !email.toLowerCase().endsWith(collegeDomain.toLowerCase())) {
      throw new Error(`Email must end with ${collegeDomain}`);
    }

    return { valid: true };
  }

  /**
   * Validate registration number format
   */
  validateRegistrationNumber(regNo) {
    if (!regNo || typeof regNo !== 'string') {
      throw new Error('Registration number is required and must be a string');
    }

    const cleanRegNo = regNo.trim().toUpperCase();
    const regNoPattern = /^[A-Z0-9]{6,15}$/;

    if (!regNoPattern.test(cleanRegNo)) {
      throw new Error(
        'Invalid registration number format. Use alphanumeric characters (6-15 characters)'
      );
    }

    return { valid: true, registrationNo: cleanRegNo };
  }

  /**
   * Sanitize and validate text input
   */
  sanitizeTextInput(text, maxLength = 1000) {
    if (typeof text !== 'string') {
      throw new Error('Text input must be a string');
    }

    const cleanText = text.trim();
    
    if (cleanText.length === 0) {
      throw new Error('Text input cannot be empty');
    }

    if (cleanText.length > maxLength) {
      throw new Error(`Text input exceeds maximum length of ${maxLength} characters`);
    }

    // Remove potentially harmful characters
    const sanitized = cleanText.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    return sanitized;
  }

  /**
   * Validate file upload
   */
  validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'], maxSizeMB = 5) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new Error(`File size exceeds maximum of ${maxSizeMB}MB`);
    }

    return { valid: true };
  }
}

// Create singleton instance
const dataValidator = new DataValidator();

export default dataValidator;

// Export specific validation functions for convenience
export const validateStatusTransition = dataValidator.validateFormStatusTransition.bind(dataValidator);
export const validateDepartmentAuth = dataValidator.validateDepartmentAuthorization.bind(dataValidator);
export const validateRequiredFields = dataValidator.validateRequiredFields.bind(dataValidator);
export const validateEmail = dataValidator.validateEmail.bind(dataValidator);
export const validateRegNo = dataValidator.validateRegistrationNumber.bind(dataValidator);
export const sanitizeText = dataValidator.sanitizeTextInput.bind(dataValidator);
