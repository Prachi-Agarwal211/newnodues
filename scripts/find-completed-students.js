/**
 * FIND COMPLETED STUDENTS SCRIPT
 * Lists all students who have completed their no dues process
 * 
 * Usage: node scripts/find-completed-students.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🎓 FINDING COMPLETED STUDENTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function findCompletedStudents() {
    try {
        // Step 1: Get all completed no dues forms
        console.log('📋 Step 1: Fetching completed no dues forms...');
        
        const { data: completedForms, error: formsError } = await supabase
            .from('no_dues_forms')
            .select(`
                id,
                registration_no,
                student_name,
                parent_name,
                school,
                course,
                branch,
                personal_email,
                college_email,
                contact_no,
                admission_year,
                passing_year,
                status,
                final_certificate_generated,
                certificate_url,
                certificate_generated_at,
                created_at,
                updated_at
            `)
            .eq('status', 'completed')
            .order('updated_at', { ascending: false });

        if (formsError) {
            console.error('❌ Error fetching completed forms:', formsError.message);
            return;
        }

        if (!completedForms || completedForms.length === 0) {
            console.log('ℹ️  No completed no dues forms found');
            return;
        }

        console.log(`   ✅ Found ${completedForms.length} completed forms\n`);

        // Step 2: Get department status for each completed form
        console.log('📊 Step 2: Fetching department clearances...');
        
        const completedStudents = [];
        
        for (const form of completedForms) {
            const { data: deptStatus, error: deptError } = await supabase
                .from('no_dues_status')
                .select('department_name, status, action_at, action_by')
                .eq('form_id', form.id);

            if (deptError) {
                console.log(`   ⚠️  Warning: Could not fetch dept status for ${form.registration_no}: ${deptError.message}`);
            }

            completedStudents.push({
                ...form,
                department_clearances: deptStatus || []
            });
        }

        // Step 3: Display results
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🎓 COMPLETED STUDENTS LIST');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📊 Total Completed Students: ${completedStudents.length}\n`);

        // Create CSV data
        const csvData = [];
        csvData.push(['S.No', 'Registration No', 'Student Name', 'Email', 'Course', 'Branch', 'Contact', 'Completed Date', 'Certificate Generated', 'Departments Cleared']);

        completedStudents.forEach((student, index) => {
            const completedDate = student.updated_at ? new Date(student.updated_at).toLocaleDateString() : 'Unknown';
            const certificateGenerated = student.final_certificate_generated ? 'Yes' : 'No';
            const departmentsCleared = student.department_clearances.length;
            
            csvData.push([
                (index + 1).toString(),
                student.registration_no || 'N/A',
                student.student_name || 'N/A',
                student.personal_email || student.college_email || 'N/A',
                student.course || 'N/A',
                student.branch || 'N/A',
                student.contact_no || 'N/A',
                completedDate,
                certificateGenerated,
                departmentsCleared.toString()
            ]);

            console.log(`${index + 1}. ${student.registration_no} - ${student.student_name}`);
            console.log(`   📧 Email: ${student.personal_email || student.college_email || 'N/A'}`);
            console.log(`   🎯 Course: ${student.course || 'N/A'} - ${student.branch || 'N/A'}`);
            console.log(`   📱 Contact: ${student.contact_no || 'N/A'}`);
            console.log(`   ✅ Completed: ${completedDate}`);
            console.log(`   📜 Certificate: ${certificateGenerated}`);
            console.log(`   🏢 Departments Cleared: ${departmentsCleared}`);
            
            if (student.department_clearances.length > 0) {
                console.log(`   📋 Department Status:`);
                student.department_clearances.forEach(dept => {
                    const statusIcon = dept.status === 'approved' ? '✅' : '⏳';
                    console.log(`      ${statusIcon} ${dept.department_name} - ${dept.status} (${new Date(dept.action_at).toLocaleDateString()})`);
                });
            }
            console.log('');
        });

        // Step 4: Save to CSV file
        const fs = require('fs');
        const csvContent = csvData.map(row => row.join(',')).join('\n');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const csvFileName = `completed_students_${timestamp}.csv`;
        const csvPath = `backups/${csvFileName}`;
        
        fs.writeFileSync(csvPath, csvContent);
        console.log(`💾 CSV file saved: ${csvPath}`);

        // Step 5: Summary statistics
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 SUMMARY STATISTICS');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const certificatesGenerated = completedStudents.filter(s => s.final_certificate_generated).length;
        const avgDepartmentsCleared = completedStudents.reduce((sum, s) => sum + s.department_clearances.length, 0) / completedStudents.length;
        
        console.log(`🎓 Total Completed Students: ${completedStudents.length}`);
        console.log(`📜 Certificates Generated: ${certificatesGenerated} (${((certificatesGenerated/completedStudents.length)*100).toFixed(1)}%)`);
        console.log(`🏢 Avg Departments Cleared: ${avgDepartmentsCleared.toFixed(1)}`);
        
        // Course distribution
        const courseStats = {};
        completedStudents.forEach(student => {
            const course = student.course || 'Unknown';
            courseStats[course] = (courseStats[course] || 0) + 1;
        });
        
        console.log('\n📚 Course Distribution:');
        Object.entries(courseStats).forEach(([course, count]) => {
            console.log(`   ${course}: ${count} students`);
        });
        
        // Branch distribution
        const branchStats = {};
        completedStudents.forEach(student => {
            const branch = student.branch || 'Unknown';
            branchStats[branch] = (branchStats[branch] || 0) + 1;
        });
        
        console.log('\n🔀 Branch Distribution:');
        Object.entries(branchStats).forEach(([branch, count]) => {
            console.log(`   ${branch}: ${count} students`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ COMPLETED STUDENTS ANALYSIS COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📁 CSV File: ${csvPath}`);
        console.log(`📊 Total Students: ${completedStudents.length}`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

findCompletedStudents();
