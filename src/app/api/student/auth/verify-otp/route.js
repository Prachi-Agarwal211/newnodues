import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sign } from 'jsonwebtoken';
import { cookies } from 'next/headers';
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

// Secret for JWT (Using Supabase JWT Secret or generates a fallback if specific auth secret missing)
// Ideally use a specific AUTH_SECRET env var, but for now we can use SUPABASE_JWT_SECRET
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret-change-me';

export async function POST(request) {
    try {
        // 1. Rate Check
        const rateLimitCheck = await rateLimit(request, RATE_LIMITS.AUTH);
        if (!rateLimitCheck.success) {
            return NextResponse.json(
                { error: 'Too many attempts. Please try again later.' },
                { status: 429 }
            );
        }

        const { registrationNo, otp } = await request.json();

        if (!registrationNo || !otp) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const regNo = registrationNo.toUpperCase().trim();

        // 2. Fetch Latest Active OTP
        const { data: otpRecord, error: fetchError } = await supabaseAdmin
            .from('student_otp_logs')
            .select('*')
            .eq('registration_no', regNo)
            .eq('is_used', false)
            .gt('expires_at', new Date().toISOString()) // Must not be expired
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fetchError) console.error('OTP Check Error:', fetchError);

        // 3. Validation Logic
        if (!otpRecord) {
            return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
        }

        if (otpRecord.attempts >= 3) {
            return NextResponse.json({ error: 'Too many failed attempts. Request a new OTP.' }, { status: 400 });
        }

        if (otpRecord.otp_code !== otp.trim()) {
            // Increment attempts
            await supabaseAdmin
                .from('student_otp_logs')
                .update({ attempts: otpRecord.attempts + 1 })
                .eq('id', otpRecord.id);

            return NextResponse.json({ error: 'Incorrect OTP' }, { status: 400 });
        }

        // 4. Success - Mark as Used
        await supabaseAdmin
            .from('student_otp_logs')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

        // 5. Generate Session Token (JWT)
        const token = sign(
            {
                regNo: regNo,
                email: otpRecord.email,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            },
            JWT_SECRET
        );

        // 6. Set HTTP-Only Cookie
        const cookieStore = cookies();
        cookieStore.set('student_session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Changed from 'strict' to 'lax' for better session persistence
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        return NextResponse.json({ success: true, message: 'Authenticated successfully' });

    } catch (error) {
        console.error('Verify OTP Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
