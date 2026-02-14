import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { APP_URLS } from '@/lib/urlHelper';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
);

/**
 * Handle bulk department reminders (no formId, just department-level)
 */
async function handleBulkReminder(userId, departmentName, departmentStats, customMessage) {
    try {
        // Get pending counts per department
        const { data: pendingCounts, error: countError } = await supabaseAdmin
            .from('no_dues_status')
            .select('department_name')
            .eq('status', 'pending');

        if (countError) {
            throw new Error('Failed to fetch pending counts');
        }

        // Group by department
        const pendingByDept = {};
        pendingCounts?.forEach(row => {
            pendingByDept[row.department_name] = (pendingByDept[row.department_name] || 0) + 1;
        });

        // Determine which departments to notify
        let departmentsToNotify = [];

        if (departmentName === 'all') {
            // Get all departments with pending
            departmentsToNotify = Object.entries(pendingByDept)
                .filter(([_, count]) => count > 0)
                .map(([name, count]) => ({ name, count }));
        } else {
            // Single department
            const count = pendingByDept[departmentName] || 0;
            if (count > 0) {
                departmentsToNotify = [{ name: departmentName, count }];
            }
        }

        if (departmentsToNotify.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No pending applications to remind about',
                sentCount: 0
            });
        }

        // Import email service dynamically
        const { sendDepartmentReminder } = await import('@/lib/emailService');

        let sentCount = 0;
        const errors = [];

        for (const dept of departmentsToNotify) {
            const { data: staffMembers } = await supabaseAdmin
                .from('profiles')
                .select('email, full_name')
                .eq('role', 'department')
                .eq('department_name', dept.name)
                .not('email', 'is', null);

            if (!staffMembers || staffMembers.length === 0) {
                errors.push(`No staff found for ${dept.name}`);
                continue;
            }

            const staffEmails = staffMembers.map(s => s.email);

            try {
                const result = await sendDepartmentReminder({
                    staffEmails,
                    departmentName: dept.name.replace(/_/g, ' '),
                    pendingCount: dept.count,
                    customMessage: customMessage || `You have ${dept.count} pending No Dues application${dept.count > 1 ? 's' : ''} awaiting your review.`,
                    dashboardUrl: APP_URLS.staffLogin()
                });

                if (result.success) {
                    sentCount++;
                    console.log(`✅ Bulk reminder sent to ${dept.name}: ${staffEmails.join(', ')}`);
                } else {
                    errors.push(`Failed to send to ${dept.name}: ${result.error}`);
                }
            } catch (emailError) {
                console.error(`Email error for ${dept.name}:`, emailError);
                errors.push(`Email error for ${dept.name}`);
            }
        }

        return NextResponse.json({
            success: true,
            message: `Reminders sent to ${sentCount} of ${departmentsToNotify.length} departments`,
            sentCount,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Bulk reminder error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to send bulk reminders'
        }, { status: 500 });
    }
}

/**
 * POST /api/admin/send-reminder
 * Send a gentle reminder to department staff about pending applications
 */
export async function POST(request) {
    try {
        // Auth check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Verify admin role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const body = await request.json();
        const { formId, departmentName, customMessage, departmentStats } = body;

        // Handle bulk department reminders (departmentName: 'all' or specific department without formId)
        if (departmentName && !formId) {
            return await handleBulkReminder(user.id, departmentName, departmentStats, customMessage);
        }

        if (!formId || !departmentName) {
            return NextResponse.json({ error: 'Missing formId or departmentName' }, { status: 400 });
        }

        // Get form data
        const { data: formData, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('student_name, registration_no, created_at')
            .eq('id', formId)
            .single();

        if (formError || !formData) {
            return NextResponse.json({ error: 'Form not found' }, { status: 404 });
        }

        // Calculate days pending
        const createdAt = new Date(formData.created_at);
        const now = new Date();
        const daysPending = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

        // Get department and staff emails
        const { data: department } = await supabaseAdmin
            .from('departments')
            .select('id, name')
            .eq('name', departmentName)
            .single();

        if (!department) {
            return NextResponse.json({ error: 'Department not found' }, { status: 404 });
        }

        const { data: staffProfiles } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .contains('assigned_department_ids', [department.id])
            .eq('role', 'department');

        const staffEmails = staffProfiles?.map(p => p.email).filter(Boolean) || [];

        if (staffEmails.length === 0) {
            return NextResponse.json({ error: 'No staff members found for this department' }, { status: 400 });
        }

        // Send reminder email
        const { sendDepartmentReminder } = await import('@/lib/emailService');
        const emailResult = await sendDepartmentReminder({
            staffEmails,
            studentName: formData.student_name,
            registrationNo: formData.registration_no,
            departmentName,
            daysPending,
            customMessage: customMessage || null,
            dashboardUrl: 'https://newnodues.vercel.app/staff/dashboard'
        });

        // Log the reminder
        await supabaseAdmin.from('reminder_logs').insert({
            form_id: formId,
            department_name: departmentName,
            staff_emails: staffEmails,
            custom_message: customMessage || null,
            sent_by: user.id
        });

        return NextResponse.json({
            success: true,
            message: `Reminder sent to ${staffEmails.length} staff member(s)`,
            emailResult,
            staffNotified: staffEmails
        });

    } catch (error) {
        console.error('Error sending reminder:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

/**
 * GET /api/admin/send-reminder
 * Get reminder history for a form or all reminders
 */
export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const formId = searchParams.get('formId');

        let query = supabaseAdmin
            .from('reminder_logs')
            .select('*')
            .order('sent_at', { ascending: false })
            .limit(100);

        if (formId) {
            query = query.eq('form_id', formId);
        }

        const { data: reminders, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            success: true,
            reminders: reminders || [],
            count: reminders?.length || 0
        });

    } catch (error) {
        console.error('Error fetching reminders:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
