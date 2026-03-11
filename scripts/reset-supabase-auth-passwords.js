/**
 * SUPABASE AUTH PASSWORD RESET SCRIPT
 * Resets ALL Supabase Auth user passwords to "JECRC@2026"
 * 
 * ⚠️  WARNING: This will affect ALL authenticated users in the system
 * 
 * Usage: node scripts/reset-supabase-auth-passwords.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

const NEW_PASSWORD = 'JECRC@2026';

console.log('🔐 SUPABASE AUTH PASSWORD RESET SCRIPT');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`⚠️  This will reset ALL Supabase Auth passwords to: ${NEW_PASSWORD}`);
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetAllAuthPasswords() {
    try {
        // Step 1: Get all users from Supabase Auth
        console.log('📋 Step 1: Fetching all Supabase Auth users...');
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

        if (listError) {
            console.error('❌ Error listing users:', listError.message);
            return;
        }

        if (!users || users.length === 0) {
            console.log('ℹ️  No users found in Supabase Auth');
            return;
        }

        console.log(`   ✅ Found ${users.length} users in Supabase Auth`);
        
        // Create backup
        const fs = require('fs');
        const backupData = {
            timestamp: new Date().toISOString(),
            total_users: users.length,
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                role: user.user_metadata?.role || 'unknown',
                created_at: user.created_at,
                last_sign_in_at: user.last_sign_in_at
            }))
        };

        const backupFileName = `backups/auth_users_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
        console.log(`   💾 Backup saved to: ${backupFileName}`);

        // Display users before reset
        console.log('\n👥 Users that will be affected:');
        users.forEach((user, i) => {
            const role = user.user_metadata?.role || 'user';
            const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never';
            console.log(`   ${i + 1}. ${user.email} (${role}) - Last login: ${lastSignIn}`);
        });

        // Step 2: Reset passwords for all users
        console.log(`\n🔄 Step 2: Resetting all ${users.length} passwords to "${NEW_PASSWORD}"...`);
        
        let successCount = 0;
        let errorCount = 0;
        const results = [];

        for (const user of users) {
            try {
                const { error: updateError } = await supabase.auth.admin.updateUserById(
                    user.id,
                    { password: NEW_PASSWORD }
                );

                if (updateError) {
                    console.log(`   ❌ Failed to update ${user.email}: ${updateError.message}`);
                    errorCount++;
                    results.push({ email: user.email, success: false, error: updateError.message });
                } else {
                    console.log(`   ✅ Updated password for: ${user.email}`);
                    successCount++;
                    results.push({ email: user.email, success: true });
                }
            } catch (err) {
                console.log(`   ❌ Error updating ${user.email}: ${err.message}`);
                errorCount++;
                results.push({ email: user.email, success: false, error: err.message });
            }
        }

        // Step 3: Save results
        const resultsFileName = `backups/password_reset_results_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const resultsData = {
            timestamp: new Date().toISOString(),
            new_password: NEW_PASSWORD,
            total_users: users.length,
            successful_resets: successCount,
            failed_resets: errorCount,
            results: results
        };
        fs.writeFileSync(resultsFileName, JSON.stringify(resultsData, null, 2));

        // Step 4: Summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ PASSWORD RESET COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📊 Total users processed: ${users.length}`);
        console.log(`✅ Successful resets: ${successCount}`);
        console.log(`❌ Failed resets: ${errorCount}`);
        console.log(`🔑 New password for all users: ${NEW_PASSWORD}`);
        console.log(`💾 Backup file: ${backupFileName}`);
        console.log(`📄 Results file: ${resultsFileName}`);
        console.log('\n📧 IMPORTANT: Notify all users that their password has been changed');
        console.log(`   New login credentials:`);
        console.log(`   Email: [their email]`);
        console.log(`   Password: ${NEW_PASSWORD}`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

// Safety confirmation
console.log('🚨 This action will reset passwords for ALL authenticated users');
console.log('Type "RESET_ALL_AUTH_PASSWORDS" to confirm: ');

process.stdin.setEncoding('utf8');
process.stdin.on('data', (data) => {
    if (data.trim() === 'RESET_ALL_AUTH_PASSWORDS') {
        console.log('✅ Confirmation received. Proceeding...\n');
        resetAllAuthPasswords();
    } else {
        console.log('❌ Confirmation failed. Operation cancelled.');
        process.exit(0);
    }
});
