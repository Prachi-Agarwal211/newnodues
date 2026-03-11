/**
 * REMOVE PENDING REQUEST
 * Safely removes the pending request for student 22BCOM1367
 * 
 * Usage: node scripts/remove-pending-request.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🗑️  REMOVING PENDING REQUEST');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function removePendingRequest() {
    try {
        const rollNumber = '22BCOM1367';
        const studentName = 'ANURAG SINGH';

        console.log(`🎯 Target Request: ${rollNumber} - ${studentName}`);
        console.log('⚠️  WARNING: This action will permanently delete all related data!\n');

        // Step 1: Find the pending form
        console.log('📍 Step 1: Finding the pending form...');
        
        const { data: pendingForm, error: formError } = await supabase
            .from('no_dues_forms')
            .select('*')
            .eq('registration_no', rollNumber)
            .eq('status', 'pending')
            .single();

        if (formError) {
            console.error('❌ Error finding form:', formError.message);
            return;
        }

        if (!pendingForm) {
            console.log('   ❌ No pending form found for this student');
            return;
        }

        console.log(`   ✅ Found pending form with ID: ${pendingForm.id}`);
        console.log(`   📅 Created: ${new Date(pendingForm.created_at).toLocaleString()}`);

        // Step 2: Create backup before deletion
        console.log('\n💾 Step 2: Creating backup before deletion...');
        
        // Get all related data for backup
        const { data: departmentStatus, error: deptError } = await supabase
            .from('no_dues_status')
            .select('*')
            .eq('form_id', pendingForm.id);

        const { data: messages, error: msgError } = await supabase
            .from('no_dues_messages')
            .select('*')
            .eq('form_id', pendingForm.id);

        const { data: studentData, error: studentError } = await supabase
            .from('student_data')
            .select('*')
            .eq('registration_no', rollNumber);

        const backupData = {
            form: pendingForm,
            departmentStatus: departmentStatus || [],
            messages: messages || [],
            studentData: studentData || [],
            deletedAt: new Date().toISOString(),
            deletedBy: 'admin_script'
        };

        const backupFilename = `backups/deleted_request_${rollNumber}_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        require('fs').writeFileSync(backupFilename, JSON.stringify(backupData, null, 2));
        console.log(`   ✅ Backup saved to: ${backupFilename}`);

        // Step 3: Show what will be deleted
        console.log('\n📋 Step 3: Data to be deleted:');
        console.log(`   📄 Form: 1 record (no_dues_forms)`);
        console.log(`   🏢 Department Status: ${departmentStatus?.length || 0} records (no_dues_status)`);
        console.log(`   💬 Messages: ${messages?.length || 0} records (no_dues_messages)`);
        console.log(`   📊 Student Data: ${studentData?.length || 0} records (student_data)`);
        console.log(`   📊 Total records to delete: ${1 + (departmentStatus?.length || 0) + (messages?.length || 0) + (studentData?.length || 0)}`);

        // Step 4: Perform deletion
        console.log('\n🗑️  Step 4: Performing deletion...');
        
        let deletedCount = 0;
        let errors = [];

        // Delete from no_dues_status (department clearances)
        if (departmentStatus && departmentStatus.length > 0) {
            console.log('   🏢 Deleting department status records...');
            const { error: deptDeleteError } = await supabase
                .from('no_dues_status')
                .delete()
                .eq('form_id', pendingForm.id);

            if (deptDeleteError) {
                errors.push(`Department status deletion: ${deptDeleteError.message}`);
            } else {
                deletedCount += departmentStatus.length;
                console.log(`      ✅ Deleted ${departmentStatus.length} department status records`);
            }
        }

        // Delete from no_dues_messages
        if (messages && messages.length > 0) {
            console.log('   💬 Deleting message records...');
            const { error: msgDeleteError } = await supabase
                .from('no_dues_messages')
                .delete()
                .eq('form_id', pendingForm.id);

            if (msgDeleteError) {
                errors.push(`Messages deletion: ${msgDeleteError.message}`);
            } else {
                deletedCount += messages.length;
                console.log(`      ✅ Deleted ${messages.length} message records`);
            }
        }

        // Delete from student_data
        if (studentData && studentData.length > 0) {
            console.log('   📊 Deleting student data records...');
            const { error: studentDeleteError } = await supabase
                .from('student_data')
                .delete()
                .eq('registration_no', rollNumber);

            if (studentDeleteError) {
                errors.push(`Student data deletion: ${studentDeleteError.message}`);
            } else {
                deletedCount += studentData.length;
                console.log(`      ✅ Deleted ${studentData.length} student data records`);
            }
        }

        // Delete the main form (this should be last)
        console.log('   📄 Deleting main form record...');
        const { error: formDeleteError } = await supabase
            .from('no_dues_forms')
            .delete()
            .eq('id', pendingForm.id);

        if (formDeleteError) {
            errors.push(`Form deletion: ${formDeleteError.message}`);
        } else {
            deletedCount += 1;
            console.log('      ✅ Deleted main form record');
        }

        // Step 5: Verify deletion
        console.log('\n🔍 Step 5: Verifying deletion...');
        
        const { data: remainingForm, error: verifyError } = await supabase
            .from('no_dues_forms')
            .select('id')
            .eq('registration_no', rollNumber);

        if (verifyError) {
            console.log('   ⚠️  Error verifying deletion:', verifyError.message);
        } else if (remainingForm && remainingForm.length > 0) {
            console.log(`   ⚠️  Warning: ${remainingForm.length} form(s) still exist for this student`);
        } else {
            console.log('   ✅ Verification successful: No forms found for this student');
        }

        // Step 6: Summary
        console.log('\n📊 DELETION SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`🎯 Student: ${rollNumber} - ${studentName}`);
        console.log(`🗑️  Records Deleted: ${deletedCount}`);
        console.log(`💾 Backup File: ${backupFilename}`);
        
        if (errors.length > 0) {
            console.log('\n❌ Errors encountered:');
            errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        } else {
            console.log('\n✅ SUCCESS: All records deleted successfully!');
            console.log('✅ The pending request has been completely removed from the system');
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🗑️  REQUEST REMOVAL COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

removePendingRequest();
