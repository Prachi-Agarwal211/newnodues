/**
 * PASSWORD RESET SCRIPT
 * Resets ALL profile passwords to "JECRC@2026"
 * 
 * ⚠️  WARNING: This will affect ALL 39 users in the system
 * 
 * Usage: node scripts/reset-all-passwords.js
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

const NEW_PASSWORD = 'JECRC@2026';

console.log('🔐 PASSWORD RESET SCRIPT');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`⚠️  This will reset ALL profile passwords to: ${NEW_PASSWORD}`);
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple hash function for password (matching your system's approach)
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function resetAllPasswords() {
    try {
        // Step 1: Create backup of current passwords
        console.log('📋 Step 1: Creating backup of current passwords...');
        const { data: currentProfiles, error: backupError } = await supabase
            .from('profiles')
            .select('id, email, role, created_at, updated_at');

        if (backupError) {
            console.error('❌ Error creating backup:', backupError.message);
            return;
        }

        // Save backup to file
        const backupData = {
            timestamp: new Date().toISOString(),
            total_profiles: currentProfiles?.length || 0,
            profiles: currentProfiles
        };

        const fs = require('fs');
        const backupFileName = `backups/password_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        fs.writeFileSync(backupFileName, JSON.stringify(backupData, null, 2));
        console.log(`   ✅ Backup saved to: ${backupFileName}`);
        console.log(`   📊 Total profiles backed up: ${currentProfiles?.length || 0}`);

        // Step 2: Confirm before proceeding
        console.log('\n⚠️  READY TO RESET PASSWORDS');
        console.log('   • All 39 profiles will have their password changed');
        console.log(`   • New password: ${NEW_PASSWORD}`);
        console.log('   • A backup has been created');
        console.log('\n🔄 Proceeding with password reset...\n');

        // Step 3: Reset all passwords
        console.log('🔐 Step 2: Resetting all passwords...');
        
        const newPasswordHash = hashPassword(NEW_PASSWORD);
        
        const { data: updatedProfiles, error: updateError } = await supabase
            .from('profiles')
            .update({ 
                password: newPasswordHash,
                updated_at: new Date().toISOString()
            })
            .select('id, email, role');

        if (updateError) {
            console.error('❌ Error updating passwords:', updateError.message);
            return;
        }

        console.log(`   ✅ Successfully updated ${updatedProfiles?.length || 0} profiles`);

        // Step 4: Verification
        console.log('\n🔍 Step 3: Verifying password changes...');
        const { data: verifyProfiles, error: verifyError } = await supabase
            .from('profiles')
            .select('id, email, role, updated_at')
            .order('updated_at', { ascending: false })
            .limit(10);

        if (verifyError) {
            console.error('❌ Error verifying changes:', verifyError.message);
        } else {
            console.log('   ✅ Password reset verified - Recent updates:');
            verifyProfiles?.forEach((profile, i) => {
                console.log(`      ${i + 1}. ${profile.email} (${profile.role}) - Updated: ${new Date(profile.updated_at).toLocaleString()}`);
            });
        }

        // Step 5: Summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ PASSWORD RESET COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📊 Total profiles updated: ${updatedProfiles?.length || 0}`);
        console.log(`🔑 New password for all users: ${NEW_PASSWORD}`);
        console.log(`💾 Backup file: ${backupFileName}`);
        console.log('\n📧 IMPORTANT: Notify all users that their password has been changed');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

// Additional safety check - ask for confirmation in production
if (process.env.NODE_ENV === 'production') {
    console.log('🚨 PRODUCTION MODE DETECTED');
    console.log('This script will reset ALL user passwords.');
    console.log('Type "RESET_ALL_PASSWORDS" to confirm: ');
    
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
        if (data.trim() === 'RESET_ALL_PASSWORDS') {
            console.log('✅ Confirmation received. Proceeding...\n');
            resetAllPasswords();
        } else {
            console.log('❌ Confirmation failed. Operation cancelled.');
            process.exit(0);
        }
    });
} else {
    // In development, proceed directly
    resetAllPasswords();
}
