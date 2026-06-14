import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: { persistSession: false },
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
        }
    }
);

export async function GET(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Use actual columns: final_certificate_generated, certificate_url
        const [
            { count: totalForms },
            { count: generatedCount },
            { count: eligiblePendingCount }
        ] = await Promise.all([
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true })
                .eq('final_certificate_generated', true)
                .not('certificate_url', 'is', null),
            supabaseAdmin.from('no_dues_forms').select('*', { count: 'exact', head: true })
                .eq('status', 'completed')
                .eq('final_certificate_generated', false)
        ]);

        const { data: recentFailures } = await supabaseAdmin
            .from('no_dues_forms')
            .select('id, registration_no, student_name, updated_at')
            .eq('final_certificate_generated', false)
            .eq('status', 'completed')
            .order('updated_at', { ascending: false })
            .limit(5);

        return NextResponse.json({
            success: true,
            stats: {
                total: totalForms || 0,
                generated: generatedCount || 0,
                eligiblePending: eligiblePendingCount || 0,
                successRate: generatedCount ? Math.round((generatedCount / (generatedCount + eligiblePendingCount)) * 100) : 0
            },
            recentFailures: (recentFailures || []).map(f => ({ ...f, certificate_error: 'Not yet generated' }))
        });

    } catch (error) {
        console.error('Certificate Stats API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
