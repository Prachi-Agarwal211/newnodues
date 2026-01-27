/**
 * Quick Schema Check & Fix Script
 * 
 * This script checks and outputs the current Supabase table schemas
 * Usage: node scripts/check-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
    console.log('🔍 Checking Supabase table schemas...\n');

    // Check student_data table columns
    console.log('📋 student_data table:');
    const { data: studentData, error: studentError } = await supabase
        .from('student_data')
        .select('*')
        .limit(1);

    if (studentError) {
        console.log(`   ❌ Error: ${studentError.message}`);
    } else if (studentData && studentData.length > 0) {
        console.log('   Columns:', Object.keys(studentData[0]).join(', '));
    } else {
        // Try to get columns by inserting empty and seeing error
        const { error: insertError } = await supabase
            .from('student_data')
            .insert({})
            .select();
        console.log('   Table exists but is empty');
        if (insertError) {
            console.log(`   Schema hint: ${insertError.message}`);
        }
    }

    // Check no_dues_forms table  
    console.log('\n📋 no_dues_forms table:');
    const { data: formsData, error: formsError } = await supabase
        .from('no_dues_forms')
        .select('*')
        .limit(1);

    if (formsError) {
        console.log(`   ❌ Error: ${formsError.message}`);
    } else if (formsData && formsData.length > 0) {
        console.log('   Columns:', Object.keys(formsData[0]).join(', '));
    } else {
        console.log('   Table exists but is empty');
    }

    // Check config tables
    const configTables = ['config_schools', 'config_courses', 'config_branches'];

    for (const table of configTables) {
        console.log(`\n📋 ${table} table:`);
        const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact' })
            .limit(1);

        if (error) {
            console.log(`   ❌ Error: ${error.message}`);
        } else {
            console.log(`   Columns: ${data && data.length > 0 ? Object.keys(data[0]).join(', ') : 'N/A'}`);
            console.log(`   Row count: ${count || 0}`);
        }
    }

    console.log('\n✅ Schema check complete!');
}

checkSchema().catch(console.error);
