import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

/**
 * Verify student session from cookie
 */
export async function verifyStudentSession() {
    const cookieStore = cookies();
    const token = cookieStore.get('student_session')?.value;

    if (!token) {
        return { valid: false, error: 'Session required' };
    }

    try {
        const decoded = verify(token, JWT_SECRET);
        return { valid: true, decoded };
    } catch (err) {
        return { valid: false, error: 'Invalid session' };
    }
}

/**
 * Verify that a student can access a specific form
 */
export async function verifyStudentCanAccessForm(formId, registrationNo) {
    const sessionResult = await verifyStudentSession();
    
    if (!sessionResult.valid) {
        return sessionResult;
    }

    // Verify the session registration number matches
    if (sessionResult.decoded.regNo !== registrationNo.toUpperCase().trim()) {
        return { valid: false, error: 'Unauthorized access to form' };
    }

    // Verify form exists and belongs to the student
    const { data: form, error } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, registration_no')
        .eq('id', formId)
        .eq('registration_no', registrationNo.toUpperCase().trim())
        .single();

    if (error || !form) {
        return { valid: false, error: 'Form not found or unauthorized' };
    }

    return { valid: true, form };
}

/**
 * Verify that a student can reapply to a specific department
 */
export async function verifyStudentCanReapplyToDepartment(formId, departmentName) {
    const { valid, form, error } = await verifyStudentCanAccessForm(formId, '');

    
    if (!valid) {
        return { valid, error };
    }

    // Get department status to verify it's rejected
    const { data: deptStatus, error: statusError } = await supabaseAdmin
        .from('no_dues_status')
        .select('status, rejection_count')
        .eq('form_id', formId)
        .eq('department_name', departmentName)
        .single();

    if (statusError || !deptStatus) {
        return { valid: false, error: 'Department status not found' };
    }

    if (deptStatus.status !== 'rejected') {
        return { valid: false, error: 'Department has not rejected this form' };
    }

    // Check reapplication limits
    const MAX_REAPPLIES = 5;
    if ((deptStatus.rejection_count || 0) >= MAX_REAPPLIES) {
        return { valid: false, error: `Maximum reapplication limit (${MAX_REAPPLIES}) reached` };
    }

    return { valid: true, deptStatus };
}

/**
 * Verify department staff session and authorization
 */
export async function verifyDepartmentStaff(departmentName, userId) {
    // Verify staff is assigned to this department
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id, assigned_department_ids, department_name')
        .eq('id', userId)
        .single();

    if (profileError || !profile) {
        return { valid: false, error: 'User profile not found' };
    }

    // Check if user is assigned to this department either directly or via assigned_department_ids
    const { data: dept } = await supabaseAdmin
        .from('departments')
        .select('id, name')
        .eq('name', departmentName)
        .single();

    if (!dept) {
        return { valid: false, error: 'Department not found' };
    }

    const isAssignedToDept = profile.assigned_department_ids?.includes(dept.id) || profile.department_name === departmentName;

    if (!isAssignedToDept) {
        return { valid: false, error: 'Not authorized for this department' };
    }

    return { valid: true, profile };
}