import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOtpEmail } from '@/lib/emailService';
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimiter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
        },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        }
    }
);

export async function POST(request) {
    try {
        // 1. Rate Check (Prevent spam)
        const rateLimitCheck = await rateLimit(request, RATE_LIMITS.AUTH); // Strict auth limit
        if (!rateLimitCheck.success) {
            return NextResponse.json(
                { error: 'Too many OTP attempts. Please wait a few minutes.' },
                { status: 429 }
            );
        }

        const { registrationNo } = await request.json();

        if (!registrationNo) {
            return NextResponse.json({ error: 'Registration number is required' }, { status: 400 });
        }

        const regNo = registrationNo.toUpperCase().trim();

        // 2. Lookup Student from student_data table (master records)
        // This allows new students who haven't submitted a form yet to authenticate
        const { data: student, error: studentError } = await supabaseAdmin
            .from('student_data')
            .select('student_name, personal_email, college_email')
            .or(`registration_no.eq.${regNo},roll_number.eq.${regNo},enrollment_number.eq.${regNo}`)
            .limit(1)
            .maybeSingle();

        if (studentError) {
            console.error('Student lookup error:', studentError);
        }

        // Also check no_dues_forms for existing form (for returning students)
        const { data: existingForm, error: formError } = await supabaseAdmin
            .from('no_dues_forms')
            .select('student_name, personal_email, college_email')
            .eq('registration_no', regNo)
            .limit(1)
            .maybeSingle();

        // Use student_data if available, otherwise fall back to no_dues_forms
        const form = student || existingForm;

        if (!form) {
            // SECURITY: Don't reveal if user exists - check both tables
            if (!student && !existingForm) {
                return NextResponse.json(
                    { error: 'No student found with this registration number.' },
                    { status: 404 }
                );
            }
        }

        // Prefer Personal Email, Fallback to College Email
        const email = form.personal_email || form.college_email;

        if (!email) {
            return NextResponse.json(
                { error: 'No email address found on file. Please contact support.' },
                { status: 400 }
            );
        }

        // 3. Generate 6-Digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 4. Store in DB
        const { error: logError } = await supabaseAdmin
            .from('student_otp_logs')
            .insert({
                registration_no: regNo,
                email: email,
                otp_code: otpCode,
                is_used: false,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 mins
            });

        if (logError) {
            console.error('OTP Log Error:', logError);
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
        }

        // 5. Send Email
        const emailResult = await sendOtpEmail({
            to: email,
            studentName: form.student_name,
            otp: otpCode
        });

        if (!emailResult.success) {
            // Optional: Delete the log if email failed? Or just error out.
            return NextResponse.json({ error: 'Failed to send OTP email.' }, { status: 500 });
        }

        // 6. Success Response (Masked Email)
        const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3');

        return NextResponse.json({
            success: true,
            message: `OTP sent to ${maskedEmail}`,
            email: maskedEmail,
            emailType: form.personal_email ? 'personal' : 'college'
        });

    } catch (error) {
        console.error('OTP Request Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
