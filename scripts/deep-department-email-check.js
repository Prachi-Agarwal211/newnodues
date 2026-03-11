/**
 * DEEP DEPARTMENT EMAIL CHECK
 * Identifies actual department email assignments and helps remove incorrect ones
 * 
 * Usage: node scripts/deep-department-email-check.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🔍 DEEP DEPARTMENT EMAIL CHECK');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepDepartmentEmailCheck() {
    try {
        // Step 1: Get departments table (official department emails)
        console.log('📋 Step 1: Getting official department emails from departments table...');
        
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true });

        if (deptError) {
            console.error('❌ Error fetching departments:', deptError.message);
            return;
        }

        console.log(`   ✅ Found ${departments.length} official departments\n`);

        // Step 2: Get all profiles with department role
        console.log('👥 Step 2: Getting all department user profiles...');
        
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'department')
            .order('department_name', { ascending: true });

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError.message);
            return;
        }

        console.log(`   ✅ Found ${profiles.length} department user profiles\n`);

        // Step 3: Cross-reference and identify mismatches
        console.log('🔍 Step 3: Cross-referencing department assignments...\n');

        const officialDeptEmails = {};
        departments.forEach(dept => {
            officialDeptEmails[dept.name] = {
                official_email: dept.email,
                hod_email: dept.hod_email,
                description: dept.description
            };
        });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🏢 OFFICIAL DEPARTMENT EMAILS (from departments table)');
        console.log('═══════════════════════════════════════════════════════════════');

        Object.entries(officialDeptEmails).forEach(([deptName, info]) => {
            console.log(`🏢 ${deptName}`);
            console.log(`   📬 Official Email: ${info.official_email || 'Not set'}`);
            console.log(`   👨‍💼 HOD Email: ${info.hod_email || 'Not set'}`);
            console.log(`   📝 Description: ${info.description || 'No description'}`);
            console.log('');
        });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👥 CURRENT DEPARTMENT USER PROFILES');
        console.log('═══════════════════════════════════════════════════════════════');

        const mismatches = [];
        const correctAssignments = [];
        const suspiciousAccounts = [];

        profiles.forEach(profile => {
            const deptName = profile.department_name;
            const userEmail = profile.email;
            const userName = profile.full_name || 'No Name';
            const officialInfo = officialDeptEmails[deptName];
            
            console.log(`👤 ${userName}`);
            console.log(`   📧 Email: ${userEmail}`);
            console.log(`   🏢 Department: ${deptName}`);
            console.log(`   🟢 Status: ${profile.is_active ? 'Active' : 'Inactive'}`);
            console.log(`   📋 Assigned Depts: ${profile.assigned_department_ids?.length || 0}`);
            
            if (officialInfo) {
                console.log(`   📬 Official Dept Email: ${officialInfo.official_email || 'Not set'}`);
                console.log(`   👨‍💼 Official HOD Email: ${officialInfo.hod_email || 'Not set'}`);
                
                // Check if user email matches official emails
                const matchesOfficial = userEmail === officialInfo.official_email;
                const matchesHOD = userEmail === officialInfo.hod_email;
                
                if (matchesOfficial || matchesHOD) {
                    console.log(`   ✅ CORRECT: Matches official department email`);
                    correctAssignments.push({
                        user_email: userEmail,
                        user_name: userName,
                        department: deptName,
                        official_email: officialInfo.official_email,
                        hod_email: officialInfo.hod_email,
                        match_type: matchesOfficial ? 'official' : 'hod'
                    });
                } else {
                    console.log(`   ❌ MISMATCH: Does not match official department emails`);
                    mismatches.push({
                        user_email: userEmail,
                        user_name: userName,
                        department: deptName,
                        official_email: officialInfo.official_email,
                        hod_email: officialInfo.hod_email,
                        user_email: userEmail
                    });
                }
            } else {
                console.log(`   ⚠️  DEPARTMENT NOT FOUND in official departments table`);
                suspiciousAccounts.push({
                    user_email: userEmail,
                    user_name: userName,
                    department: deptName,
                    issue: 'Department not found in official table'
                });
            }
            
            // Check for suspicious email patterns
            if (userEmail.includes('senior') || userEmail.includes('manager') || userEmail.includes('head')) {
                console.log(`   ⚠️  SUSPICIOUS: Email contains senior/manager/head keywords`);
                if (!suspiciousAccounts.find(acc => acc.user_email === userEmail)) {
                    suspiciousAccounts.push({
                        user_email: userEmail,
                        user_name: userName,
                        department: deptName,
                        issue: 'Suspicious email pattern (senior/manager/head)'
                    });
                }
            }
            
            console.log('');
        });

        // Step 4: Summary and recommendations
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📊 ANALYSIS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        
        console.log(`✅ Correct Assignments: ${correctAssignments.length}`);
        console.log(`❌ Email Mismatches: ${mismatches.length}`);
        console.log(`⚠️  Suspicious Accounts: ${suspiciousAccounts.length}`);
        console.log(`📊 Total Department Users: ${profiles.length}`);

        if (mismatches.length > 0) {
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('❌ EMAIL MISMATCHES (Recommended for Removal)');
            console.log('═══════════════════════════════════════════════════════════════');
            
            mismatches.forEach((mismatch, index) => {
                console.log(`${index + 1}. 📧 ${mismatch.user_email}`);
                console.log(`   👤 ${mismatch.user_name}`);
                console.log(`   🏢 ${mismatch.department}`);
                console.log(`   📬 Should be: ${mismatch.official_email || mismatch.hod_email || 'Not defined'}`);
                console.log(`   🔧 Action: REMOVE or UPDATE email`);
                console.log('');
            });
        }

        if (suspiciousAccounts.length > 0) {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('⚠️  SUSPICIOUS ACCOUNTS (Review Required)');
            console.log('═══════════════════════════════════════════════════════════════');
            
            suspiciousAccounts.forEach((account, index) => {
                console.log(`${index + 1}. 📧 ${account.user_email}`);
                console.log(`   👤 ${account.user_name}`);
                console.log(`   🏢 ${account.department}`);
                console.log(`   ⚠️  Issue: ${account.issue}`);
                console.log(`   🔧 Action: REVIEW and possibly REMOVE`);
                console.log('');
            });
        }

        if (correctAssignments.length > 0) {
            console.log('═══════════════════════════════════════════════════════════════');
            console.log('✅ CORRECT ASSIGNMENTS (Keep These)');
            console.log('═══════════════════════════════════════════════════════════════');
            
            correctAssignments.forEach((assignment, index) => {
                console.log(`${index + 1}. 📧 ${assignment.user_email}`);
                console.log(`   👤 ${assignment.user_name}`);
                console.log(`   🏢 ${assignment.department}`);
                console.log(`   ✅ Status: CORRECT - Matches official ${assignment.match_type} email`);
                console.log('');
            });
        }

        // Step 5: Generate removal/update script
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🔧 RECOMMENDED ACTIONS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        if (mismatches.length > 0 || suspiciousAccounts.length > 0) {
            console.log('\n🗑️  ACCOUNTS TO REMOVE:');
            const toRemove = [...mismatches, ...suspiciousAccounts];
            toRemove.forEach((item, index) => {
                console.log(`${index + 1}. ${item.user_email} (${item.user_name}) - ${item.department}`);
            });
            
            console.log('\n📝 SQL TO REMOVE INCORRECT ACCOUNTS:');
            console.log('-- Copy and execute in Supabase SQL Editor:');
            toRemove.forEach(item => {
                console.log(`DELETE FROM profiles WHERE email = '${item.user_email}';`);
            });
            
            console.log('\n📝 ALTERNATIVE: DEACTIVATE INSTEAD OF DELETE:');
            console.log('-- Safer option - just deactivate accounts:');
            toRemove.forEach(item => {
                console.log(`UPDATE profiles SET is_active = false WHERE email = '${item.user_email}';`);
            });
        } else {
            console.log('✅ All department accounts appear to be correctly assigned!');
        }

        // Step 6: Save analysis
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const analysisData = {
            timestamp: new Date().toISOString(),
            summary: {
                total_departments: departments.length,
                total_department_users: profiles.length,
                correct_assignments: correctAssignments.length,
                mismatches: mismatches.length,
                suspicious_accounts: suspiciousAccounts.length
            },
            official_departments: officialDeptEmails,
            correct_assignments: correctAssignments,
            mismatches: mismatches,
            suspicious_accounts: suspiciousAccounts,
            profiles: profiles
        };

        const analysisPath = `backups/deep_department_email_analysis_${timestamp}.json`;
        fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));

        console.log('\n💾 Analysis saved:');
        console.log(`   📊 Full Analysis: ${analysisPath}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ DEEP DEPARTMENT EMAIL CHECK COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

deepDepartmentEmailCheck();
