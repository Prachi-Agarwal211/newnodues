/**
 * SEARCH FOR MPTN STUDENTS
 * Searches for any students with MPTN in course, branch, or roll number
 * 
 * Usage: node scripts/search-mptn-students.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🔍 SEARCHING FOR MPTN STUDENTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchMPTNStudents() {
    try {
        // Step 1: Search in course field
        console.log('📚 Step 1: Searching in course field...');
        
        const { data: courseData, error: courseError } = await supabase
            .from('no_dues_forms')
            .select('registration_no, student_name, course, branch, status, created_at')
            .ilike('course', '%MPTN%')
            .order('created_at', { ascending: false });

        if (courseError) {
            console.error('❌ Error searching courses:', courseError.message);
        } else if (courseData && courseData.length > 0) {
            console.log(`   ✅ Found ${courseData.length} students with MPTN in course:\n`);
            courseData.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.registration_no} - ${student.student_name}`);
                console.log(`      📚 Course: ${student.course}`);
                console.log(`      🔀 Branch: ${student.branch || 'Not specified'}`);
                console.log(`      📊 Status: ${student.status}`);
                console.log(`      📅 Created: ${student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No students found with MPTN in course\n');
        }

        // Step 2: Search in branch field
        console.log('🔀 Step 2: Searching in branch field...');
        
        const { data: branchData, error: branchError } = await supabase
            .from('no_dues_forms')
            .select('registration_no, student_name, course, branch, status, created_at')
            .ilike('branch', '%MPTN%')
            .order('created_at', { ascending: false });

        if (branchError) {
            console.error('❌ Error searching branches:', branchError.message);
        } else if (branchData && branchData.length > 0) {
            console.log(`   ✅ Found ${branchData.length} students with MPTN in branch:\n`);
            branchData.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.registration_no} - ${student.student_name}`);
                console.log(`      📚 Course: ${student.course}`);
                console.log(`      🔀 Branch: ${student.branch}`);
                console.log(`      📊 Status: ${student.status}`);
                console.log(`      📅 Created: ${student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No students found with MPTN in branch\n');
        }

        // Step 3: Search in registration numbers
        console.log('🎓 Step 3: Searching in registration numbers...');
        
        const { data: regData, error: regError } = await supabase
            .from('no_dues_forms')
            .select('registration_no, student_name, course, branch, status, created_at')
            .ilike('registration_no', '%MPTN%')
            .order('created_at', { ascending: false });

        if (regError) {
            console.error('❌ Error searching registration numbers:', regError.message);
        } else if (regData && regData.length > 0) {
            console.log(`   ✅ Found ${regData.length} students with MPTN in registration number:\n`);
            regData.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.registration_no} - ${student.student_name}`);
                console.log(`      📚 Course: ${student.course}`);
                console.log(`      🔀 Branch: ${student.branch || 'Not specified'}`);
                console.log(`      📊 Status: ${student.status}`);
                console.log(`      📅 Created: ${student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No students found with MPTN in registration number\n');
        }

        // Step 4: Search in student_data table
        console.log('📊 Step 4: Searching in student_data table...');
        
        const { data: studentData, error: studentError } = await supabase
            .from('student_data')
            .select('registration_no, roll_number, student_name, course, branch, created_at')
            .or('course.ilike.%MPTN%,branch.ilike.%MPTN%,registration_no.ilike.%MPTN%,roll_number.ilike.%MPTN%')
            .order('created_at', { ascending: false });

        if (studentError) {
            console.error('❌ Error searching student_data:', studentError.message);
        } else if (studentData && studentData.length > 0) {
            console.log(`   ✅ Found ${studentData.length} students in student_data with MPTN:\n`);
            studentData.forEach((student, index) => {
                console.log(`   ${index + 1}. ${student.registration_no} - ${student.student_name}`);
                console.log(`      🎫 Roll: ${student.roll_number || 'Not specified'}`);
                console.log(`      📚 Course: ${student.course}`);
                console.log(`      🔀 Branch: ${student.branch}`);
                console.log(`      📅 Created: ${student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No students found with MPTN in student_data\n');
        }

        // Step 5: Get all unique courses and branches to see what's available
        console.log('📋 Step 5: Getting all available courses and branches...');
        
        const { data: allCourses, error: coursesError } = await supabase
            .from('no_dues_forms')
            .select('course')
            .not('course', 'is', null);

        if (!coursesError && allCourses) {
            const uniqueCourses = [...new Set(allCourses.map(item => item.course))];
            console.log(`   📚 Total unique courses: ${uniqueCourses.length}`);
            
            const mptnRelated = uniqueCourses.filter(course => 
                course.toLowerCase().includes('mptn') || 
                course.toLowerCase().includes('medical') || 
                course.toLowerCase().includes('physiotherapy') ||
                course.toLowerCase().includes('therapy')
            );
            
            if (mptnRelated.length > 0) {
                console.log(`   🔍 MPTN-related courses found:`);
                mptnRelated.forEach(course => console.log(`      • ${course}`));
            } else {
                console.log(`   ❌ No MPTN-related courses found`);
                console.log(`   📚 Available courses (sample):`);
                uniqueCourses.slice(0, 10).forEach(course => console.log(`      • ${course}`));
                if (uniqueCourses.length > 10) {
                    console.log(`      ... and ${uniqueCourses.length - 10} more`);
                }
            }
        }

        // Step 6: Summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 SEARCH SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const totalFound = (courseData?.length || 0) + (branchData?.length || 0) + (regData?.length || 0) + (studentData?.length || 0);
        
        console.log(`🔍 Search Term: MPTN`);
        console.log(`📊 Total Matches Found: ${totalFound}`);
        console.log(`📚 In Courses: ${courseData?.length || 0}`);
        console.log(`🔀 In Branches: ${branchData?.length || 0}`);
        console.log(`🎓 In Registration Numbers: ${regData?.length || 0}`);
        console.log(`📊 In Student Data: ${studentData?.length || 0}`);
        
        if (totalFound === 0) {
            console.log(`\n❌ No students found with "MPTN" in any field.`);
            console.log(`💡 Possible reasons:`);
            console.log(`   • MPTN might not be the correct course/branch name`);
            console.log(`   • Students might be listed under a different name (e.g., "Physiotherapy", "BPT", "Medical Therapy")`);
            console.log(`   • No MPTN students have registered for no dues yet`);
            console.log(`   • Course might be listed with different abbreviation`);
        } else {
            console.log(`\n✅ Found MPTN-related students!`);
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ SEARCH COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

searchMPTNStudents();
