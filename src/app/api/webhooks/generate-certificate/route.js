import { NextResponse } from 'next/server';
import { triggerCertificateGeneration } from '@/lib/certificateTrigger';

// Webhook Receiver for Supabase Database Events
export async function POST(request) {
    try {
        // Parse the webhook payload
        const payload = await request.json();

        // Security: In production, verify the webhook secret
        const authHeader = request.headers.get('Authorization');
        const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
        
        if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Supabase sends payload as { type, table, record, old_record }
        if (payload.table !== 'no_dues_forms') {
            return NextResponse.json({ message: 'Ignored: Not a form update' });
        }

        const newRecord = payload.record;
        const oldRecord = payload.old_record;

        // Check if the form JUST changed to completed
        const justCompleted = newRecord.status === 'completed' && (!oldRecord || oldRecord.status !== 'completed');
        
        // OR if it's an insert and immediately completed
        const isNewCompleted = payload.type === 'INSERT' && newRecord.status === 'completed';

        if (justCompleted || isNewCompleted) {
            console.log(`[Webhook] Processing completed form: ${newRecord.id}`);
            
            // Trigger certificate generation
            // Note: We don't await this directly to prevent the webhook from timing out.
            // In a standard serverless environment (like Vercel), background execution might need 
            // specific configurations (like Vercel Background Functions via unstable_after) 
            // or we just await it and hope it completes within the function timeout (typically 10s-60s).
            // Since we're optimizing for load, this is a much better pattern than parallel client requests.
            
            // To ensure execution in a serverless environment, we'll await it but with a timeout wrapper
            // or just await it if the timeout is sufficient.
            const result = await triggerCertificateGeneration(newRecord.id);
            
            if (!result.success && !result.alreadyGenerated) {
                console.error('[Webhook] Certificate generation failed:', result.error);
                return NextResponse.json({ error: result.error }, { status: 500 });
            }

            return NextResponse.json({ message: 'Certificate generated successfully', data: result });
        }

        return NextResponse.json({ message: 'Ignored: Form not completed' });
        
    } catch (error) {
        console.error('[Webhook Error]:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
