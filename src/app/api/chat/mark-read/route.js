export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyDepartmentStaff } from '@/lib/authUtils';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        },
    }
);

// POST: Mark messages as read
export async function POST(request) {
    try {
        const body = await request.json();
        const { formId, departmentName, readerType } = body;

        if (!formId || !departmentName || !readerType) {
            return NextResponse.json({
                error: 'formId, departmentName, and readerType are required'
            }, { status: 400 });
        }

        // For department readers, require authentication
        if (readerType === 'department') {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const token = authHeader.replace('Bearer ', '');
            const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

            if (authError || !user) {
                return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
            }

            // Use auth utility to verify department staff authorization
            const { valid, error: verifyError } = await verifyDepartmentStaff(departmentName, user.id);

            if (!valid) {
                return NextResponse.json({ error: verifyError || 'Not authorized for this department' }, { status: 403 });
            }

            // Mark student messages as read (department is reading)
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('no_dues_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('form_id', formId)
                .eq('department_name', departmentName)
                .eq('sender_type', 'student')
                .eq('is_read', false)
                .select();

            if (updateError) {
                console.error('Error marking messages as read:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { marked_read: updated?.length || 0 }
            });
        } else if (readerType === 'student') {
            // For students, verify they own the form via session cookie
            const cookieStore = await import('next/headers').then(m => m.cookies());
            const sessionCookie = cookieStore.get('student_session')?.value;
            
            if (!sessionCookie) {
                return NextResponse.json({ error: 'Student session required' }, { status: 401 });
            }

            const { verify } = await import('jsonwebtoken');
            const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';
            
            try {
                const decoded = verify(sessionCookie, JWT_SECRET);
                
                // Verify that the student owns this form
                const { data: form, error: formError } = await supabaseAdmin
                    .from('no_dues_forms')
                    .select('id, registration_no')
                    .eq('id', formId)
                    .single();
                    
                if (formError || !form || decoded.regNo !== form.registration_no) {
                    return NextResponse.json({ error: 'Not authorized to access this form' }, { status: 403 });
                }
            } catch (err) {
                return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
            }

            // Mark department messages as read (student is reading)
            const { data: updated, error: updateError } = await supabaseAdmin
                .from('no_dues_messages')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .eq('form_id', formId)
                .eq('department_name', departmentName)
                .eq('sender_type', 'department')
                .eq('is_read', false)
                .select();

            if (updateError) {
                console.error('Error marking messages as read:', updateError);
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                data: { marked_read: updated?.length || 0 }
            });
        }

        return NextResponse.json({ error: 'Invalid readerType' }, { status: 400 });

    } catch (error) {
        console.error('Mark Read API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
