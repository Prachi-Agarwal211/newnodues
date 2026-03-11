/**
 * SAFE ACCOUNT CHECKING SCRIPT
 * This script ONLY reads data - it makes NO changes to the database
 * 
 * Usage: node scripts/check-accounts.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🔍 Connecting to database for READ-ONLY account check...\n');
console.log(`   URL: ${supabaseUrl}`);
console.log('   ⚠️  This script is READ-ONLY - no data will be modified\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAccounts() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👥 ACCOUNTS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');

        // Check profiles table (main user accounts)
        console.log('\n📋 Checking profiles table...');
        const { data: profiles, error: profilesError, count: profilesCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact' })
            .limit(10); // Limit to avoid too much data

        if (profilesError) {
            console.log(`   ❌ Error accessing profiles: ${profilesError.message}`);
        } else {
            console.log(`   ✅ Profiles found: ${profilesCount || 0}`);
            if (profiles && profiles.length > 0) {
                console.log('   📊 Sample profiles:');
                profiles.forEach((profile, i) => {
                    console.log(`      ${i + 1}. ${profile.email || 'No email'} - Role: ${profile.role || 'No role'} - Created: ${profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}`);
                });
            }
        }

        // Check no_dues_forms table (student applications)
        console.log('\n📋 Checking no_dues_forms table...');
        const { data: forms, error: formsError, count: formsCount } = await supabase
            .from('no_dues_forms')
            .select('registration_no, student_name, status, created_at', { count: 'exact' })
            .limit(10);

        if (formsError) {
            console.log(`   ❌ Error accessing forms: ${formsError.message}`);
        } else {
            console.log(`   ✅ Student forms found: ${formsCount || 0}`);
            if (forms && forms.length > 0) {
                console.log('   📊 Sample forms:');
                forms.forEach((form, i) => {
                    console.log(`      ${i + 1}. ${form.registration_no} - ${form.student_name} - Status: ${form.status} - Created: ${form.created_at ? new Date(form.created_at).toLocaleDateString() : 'Unknown'}`);
                });
            }
        }

        // Check departments table
        console.log('\n📋 Checking departments table...');
        const { data: departments, error: departmentsError, count: departmentsCount } = await supabase
            .from('departments')
            .select('*', { count: 'exact' });

        if (departmentsError) {
            console.log(`   ❌ Error accessing departments: ${departmentsError.message}`);
        } else {
            console.log(`   ✅ Departments found: ${departmentsCount || 0}`);
            if (departments && departments.length > 0) {
                console.log('   📊 Departments:');
                departments.forEach((dept, i) => {
                    console.log(`      ${i + 1}. ${dept.name} - Email: ${dept.email || 'No email'}`);
                });
            }
        }

        // Check status distribution
        console.log('\n📊 Status distribution in no_dues_forms:');
        const { data: statusData, error: statusError } = await supabase
            .from('no_dues_forms')
            .select('status')
            .then(({ data, error }) => {
                if (error) return { data: null, error };
                const statusCounts = {};
                data?.forEach(form => {
                    statusCounts[form.status] = (statusCounts[form.status] || 0) + 1;
                });
                return { data: statusCounts, error: null };
            });

        if (statusError) {
            console.log(`   ❌ Error getting status distribution: ${statusError.message}`);
        } else if (statusData) {
            Object.entries(statusData).forEach(([status, count]) => {
                console.log(`      ${status}: ${count}`);
            });
        }

        // Check recent activity
        console.log('\n📅 Recent activity (last 7 days):');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: recentForms, error: recentError } = await supabase
            .from('no_dues_forms')
            .select('registration_no, student_name, status, created_at')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentError) {
            console.log(`   ❌ Error checking recent activity: ${recentError.message}`);
        } else {
            console.log(`   ✅ Recent forms: ${recentForms?.length || 0}`);
            recentForms?.forEach((form, i) => {
                console.log(`      ${i + 1}. ${form.registration_no} - ${form.student_name} - ${form.status} - ${new Date(form.created_at).toLocaleDateString()}`);
            });
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ ACCOUNT CHECK COMPLETE - NO DATA WAS MODIFIED');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkAccounts();
