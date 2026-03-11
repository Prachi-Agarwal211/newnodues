/**
 * CHECK PROFILES TABLE SCHEMA
 * Understanding how passwords are stored
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfilesSchema() {
    try {
        console.log('🔍 Checking profiles table schema...\n');

        // Get columns in profiles table
        const { data: columns, error: columnsError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_schema', 'public')
            .eq('table_name', 'profiles')
            .order('column_name');

        if (columnsError) {
            console.error('❌ Error getting columns:', columnsError.message);
            return;
        }

        console.log('📋 Profiles table columns:');
        columns?.forEach(col => {
            console.log(`   • ${col.column_name} (${col.data_type})`);
        });

        // Get sample data to understand structure
        console.log('\n📊 Sample profile data (first 3):');
        const { data: sampleProfiles, error: sampleError } = await supabase
            .from('profiles')
            .select('*')
            .limit(3);

        if (sampleError) {
            console.error('❌ Error getting sample data:', sampleError.message);
        } else {
            sampleProfiles?.forEach((profile, i) => {
                console.log(`\n   Profile ${i + 1}:`);
                Object.entries(profile).forEach(([key, value]) => {
                    if (key === 'password') {
                        console.log(`      ${key}: [HIDDEN - ${value?.length || 0} chars]`);
                    } else {
                        console.log(`      ${key}: ${value}`);
                    }
                });
            });
        }

        // Check if there's an auth.users table (Supabase Auth)
        console.log('\n🔐 Checking Supabase Auth users...');
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

        if (authError) {
            console.log(`   ℹ️  Auth check failed: ${authError.message}`);
            console.log('   This might be expected if using custom auth');
        } else {
            console.log(`   ✅ Found ${authUsers.users.length} users in Supabase Auth`);
            authUsers.users.slice(0, 3).forEach((user, i) => {
                console.log(`      ${i + 1}. ${user.email} - ID: ${user.id} - Created: ${new Date(user.created_at).toLocaleDateString()}`);
            });
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

checkProfilesSchema();
