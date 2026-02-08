/**
 * Script to remove a specific no dues form by registration number
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const TARGET_REGISTRATION_NO = '22BCOM1367';

async function removeForm() {
    console.log(`🔍 Searching for form with registration number: ${TARGET_REGISTRATION_NO}`);

    // First, find the form by registration number
    const { data: forms, error: findError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', TARGET_REGISTRATION_NO);

    if (findError) {
        console.error('❌ Error finding form:', findError);
        return;
    }

    if (!forms || forms.length === 0) {
        console.log('ℹ️  No form found with registration number:', TARGET_REGISTRATION_NO);
        return;
    }

    console.log(`📋 Found ${forms.length} form(s) matching the registration number`);
    forms.forEach(form => {
        console.log(`   - Form ID: ${form.id}`);
        console.log(`   - Student Name: ${form.student_name}`);
        console.log(`   - Status: ${form.status}`);
        console.log(`   - Created At: ${form.created_at}`);
        console.log();
    });

    // Also check for associated status records in no_dues_status table
    console.log('🔍 Checking for associated status records...');
    const { data: statusRecords, error: statusError } = await supabase
        .from('no_dues_status')
        .select('*')
        .in('form_id', forms.map(f => f.id));

    if (statusError) {
        console.error('❌ Error checking status records:', statusError);
    } else if (statusRecords && statusRecords.length > 0) {
        console.log(`📋 Found ${statusRecords.length} associated status record(s)`);
        statusRecords.forEach(status => {
            console.log(`   - Department: ${status.department_name}`);
            console.log(`   - Status: ${status.status}`);
        });
    }

    console.log('\n⚠️  WARNING: This will permanently delete the form(s) and all associated status records');
    
    // Ask for confirmation
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('✅ Are you sure you want to proceed? (y/N): ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            console.log('\n🚀 Starting removal process...');

            try {
                // Delete status records first (foreign key constraint)
                if (statusRecords && statusRecords.length > 0) {
                    console.log(`🗑️  Deleting ${statusRecords.length} associated status records...`);
                    const { error: deleteStatusError } = await supabase
                        .from('no_dues_status')
                        .delete()
                        .in('form_id', forms.map(f => f.id));
                    
                    if (deleteStatusError) {
                        throw deleteStatusError;
                    }
                    console.log('✅ Status records deleted successfully');
                }

                // Delete the forms
                console.log(`🗑️  Deleting ${forms.length} form(s)...`);
                const { error: deleteFormError } = await supabase
                    .from('no_dues_forms')
                    .delete()
                    .in('id', forms.map(f => f.id));
                
                if (deleteFormError) {
                    throw deleteFormError;
                }

                console.log('✅ Form(s) deleted successfully');
                console.log(`🎉 Form with registration number ${TARGET_REGISTRATION_NO} has been removed from the system`);
            } catch (error) {
                console.error('❌ Error during removal:', error);
            }
        } else {
            console.log('❌ Operation cancelled');
        }

        readline.close();
    });
}

removeForm().catch(console.error);
