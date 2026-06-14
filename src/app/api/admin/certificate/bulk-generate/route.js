import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
        // 1. Auth & Rate Method Check
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Verify Admin Role
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (!profile || profile.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { formIds } = await request.json();

        if (!formIds || !Array.isArray(formIds) || formIds.length === 0) {
            return NextResponse.json({ error: 'No form IDs provided' }, { status: 400 });
        }

        // 2. Bulk Processing
        // In a real scenario, we might offload this to a queue. 
        // For now, we'll process them in parallel batches of 5 to avoid timeouts.
        const BATCH_SIZE = 5;
        const results = {
            success: [],
            failed: []
        };

        for (let i = 0; i < formIds.length; i += BATCH_SIZE) {
            const batch = formIds.slice(i, i + BATCH_SIZE);

            const batchPromises = batch.map(async (formId) => {
                try {
                    // A. Update Form Status
                    const { error: updateError } = await supabaseAdmin
                        .from('no_dues_forms')
                        .update({
                            final_certificate_generated: true,
                            certificate_generated_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', formId)
                        .eq('status', 'completed');

                    if (updateError) throw updateError;

                    // B. Log Success
                    await supabaseAdmin.from('certificate_generation_logs').insert({
                        form_id: formId,
                        status: 'success',
                        attempted_by: user.id
                    });

                    return { id: formId, status: 'success' };

                } catch (err) {
                    console.error(`Failed to generate cert for ${formId}:`, err);

                    // C. Log Failure
                    await supabaseAdmin.from('certificate_generation_logs').insert({
                        form_id: formId,
                        status: 'failed',
                        error_message: err.message,
                        attempted_by: user.id
                    });

                    return { id: formId, status: 'failed', error: err.message };
                }
            });

            const batchResults = await Promise.all(batchPromises);

            batchResults.forEach(res => {
                if (res.status === 'success') results.success.push(res.id);
                else results.failed.push(res);
            });
        }

        return NextResponse.json({
            success: true,
            data: results,
            message: `Processed ${formIds.length} items. Success: ${results.success.length}, Failed: ${results.failed.length}`
        });

    } catch (error) {
        console.error('Bulk Gen API Error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
