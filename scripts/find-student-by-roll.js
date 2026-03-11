/**
 * FIND STUDENT BY ROLL NUMBER
 * Searches for a specific student by their registration/roll number
 * 
 * Usage: node scripts/find-student-by-roll.js [roll_number]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

// Get roll number from command line argument or use default
const rollNumber = process.argv[2] || '24mptn0001';

console.log('🔍 STUDENT SEARCH BY ROLL NUMBER');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log(`🎓 Searching for Roll Number: ${rollNumber}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function findStudentByRoll() {
    try {
        // Step 1: Search in no_dues_forms table
        console.log('📋 Step 1: Searching in no_dues_forms...');
        
        const { data: formData, error: formError } = await supabase
            .from('no_dues_forms')
            .select('*')
            .eq('registration_no', rollNumber);

        if (formError && formError.code !== 'PGRST116') {
            console.error('❌ Error searching forms:', formError.message);
            return;
        }

        if (formData && formData.length > 0) {
            console.log(`   ✅ Found ${formData.length} record(s) in no_dues_forms\n`);
            
            formData.forEach((record, index) => {
                console.log(`📋 Record ${index + 1} from no_dues_forms:`);
                console.log(`   🎓 Roll Number: ${record.registration_no}`);
                console.log(`   👤 Student Name: ${record.student_name}`);
                console.log(`   👨‍👩‍👧‍👦 Parent Name: ${record.parent_name || 'Not provided'}`);
                console.log(`   🏫 School: ${record.school || 'Not assigned'}`);
                console.log(`   📚 Course: ${record.course || 'Not assigned'}`);
                console.log(`   🔀 Branch: ${record.branch || 'Not assigned'}`);
                console.log(`   📧 Personal Email: ${record.personal_email || 'Not provided'}`);
                console.log(`   📧 College Email: ${record.college_email || 'Not provided'}`);
                console.log(`   📱 Contact: ${record.contact_no || 'Not provided'}`);
                console.log(`   📅 Admission Year: ${record.admission_year || 'Not provided'}`);
                console.log(`   📅 Passing Year: ${record.passing_year || 'Not provided'}`);
                console.log(`   📊 Status: ${record.status || 'Unknown'}`);
                console.log(`   📜 Certificate Generated: ${record.final_certificate_generated ? 'Yes' : 'No'}`);
                console.log(`   📅 Created: ${record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown'}`);
                console.log(`   📅 Updated: ${record.updated_at ? new Date(record.updated_at).toLocaleString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No records found in no_dues_forms\n');
        }

        // Step 2: Search in student_data table
        console.log('📊 Step 2: Searching in student_data...');
        
        const { data: studentData, error: studentError } = await supabase
            .from('student_data')
            .select('*')
            .eq('registration_no', rollNumber);

        if (studentError && studentError.code !== 'PGRST116') {
            console.error('❌ Error searching student_data:', studentError.message);
            return;
        }

        if (studentData && studentData.length > 0) {
            console.log(`   ✅ Found ${studentData.length} record(s) in student_data\n`);
            
            studentData.forEach((record, index) => {
                console.log(`📊 Record ${index + 1} from student_data:`);
                console.log(`   🎓 Roll Number: ${record.registration_no}`);
                console.log(`   🎫 Roll Number: ${record.roll_number || 'Not assigned'}`);
                console.log(`   🆔 Enrollment Number: ${record.enrollment_number || 'Not assigned'}`);
                console.log(`   👤 Student Name: ${record.student_name}`);
                console.log(`   👨‍👩‍👧‍👦 Parent Name: ${record.parent_name || 'Not provided'}`);
                console.log(`   🏫 School: ${record.school || 'Not assigned'}`);
                console.log(`   📚 Course: ${record.course || 'Not assigned'}`);
                console.log(`   🔀 Branch: ${record.branch || 'Not assigned'}`);
                console.log(`   📧 Personal Email: ${record.personal_email || 'Not provided'}`);
                console.log(`   📧 College Email: ${record.college_email || 'Not provided'}`);
                console.log(`   📱 Contact: ${record.contact_no || 'Not provided'}`);
                console.log(`   📅 Admission Year: ${record.admission_year || 'Not provided'}`);
                console.log(`   📅 Passing Year: ${record.passing_year || 'Not provided'}`);
                console.log(`   📊 Batch: ${record.batch || 'Not assigned'}`);
                console.log(`   📚 Section: ${record.section || 'Not assigned'}`);
                console.log(`   📚 Semester: ${record.semester || 'Not assigned'}`);
                console.log(`   📈 CGPA: ${record.cgpa || 'Not provided'}`);
                console.log(`   🎂 Date of Birth: ${record.date_of_birth || 'Not provided'}`);
                console.log(`   👫 Gender: ${record.gender || 'Not provided'}`);
                console.log(`   🏷️ Category: ${record.category || 'Not provided'}`);
                console.log(`   🩸 Blood Group: ${record.blood_group || 'Not provided'}`);
                console.log(`   🏠 Address: ${record.address || 'Not provided'}`);
                console.log(`   🏙️ City: ${record.city || 'Not provided'}`);
                console.log(`   📍 State: ${record.state || 'Not provided'}`);
                console.log(`   📮 Pin Code: ${record.pin_code || 'Not provided'}`);
                console.log(`   🆘 Emergency Contact: ${record.emergency_contact_name || 'Not provided'}`);
                console.log(`   📞 Emergency Phone: ${record.emergency_contact_no || 'Not provided'}`);
                console.log(`   📅 Created: ${record.created_at ? new Date(record.created_at).toLocaleString() : 'Unknown'}`);
                console.log(`   📅 Updated: ${record.updated_at ? new Date(record.updated_at).toLocaleString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No records found in student_data\n');
        }

        // Step 3: Search with partial match (case insensitive)
        console.log('🔍 Step 3: Searching with partial match...');
        
        const { data: partialData, error: partialError } = await supabase
            .from('no_dues_forms')
            .select('*')
            .ilike('registration_no', `%${rollNumber}%`);

        if (partialError && partialError.code !== 'PGRST116') {
            console.error('❌ Error with partial search:', partialError.message);
            return;
        }

        if (partialData && partialData.length > 0) {
            console.log(`   ✅ Found ${partialData.length} record(s) with partial match\n`);
            
            partialData.forEach((record, index) => {
                console.log(`🔍 Partial Match ${index + 1}:`);
                console.log(`   🎓 Roll Number: ${record.registration_no}`);
                console.log(`   👤 Student Name: ${record.student_name}`);
                console.log(`   📊 Status: ${record.status || 'Unknown'}`);
                console.log(`   📅 Created: ${record.created_at ? new Date(record.created_at).toLocaleDateString() : 'Unknown'}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No records found with partial match\n');
        }

        // Step 4: Check department status if student found
        if (formData && formData.length > 0) {
            console.log('🏢 Step 4: Checking department clearances...');
            
            for (const form of formData) {
                console.log(`\n📋 Department Status for ${form.registration_no}:`);
                
                const { data: deptStatus, error: deptError } = await supabase
                    .from('no_dues_status')
                    .select('*')
                    .eq('form_id', form.id)
                    .order('department_name', { ascending: true });

                if (deptError) {
                    console.log(`   ❌ Error fetching department status: ${deptError.message}`);
                } else if (deptStatus && deptStatus.length > 0) {
                    deptStatus.forEach((dept, index) => {
                        const statusIcon = dept.status === 'approved' ? '✅' : 
                                        dept.status === 'pending' ? '⏳' : 
                                        dept.status === 'rejected' ? '❌' : 
                                        dept.status === 'in_progress' ? '🔄' : '❓';
                        
                        console.log(`   ${index + 1}. ${statusIcon} ${dept.department_name}`);
                        console.log(`      Status: ${dept.status}`);
                        console.log(`      Action By: ${dept.action_by || 'Unknown'}`);
                        console.log(`      Action At: ${dept.action_at ? new Date(dept.action_at).toLocaleString() : 'Unknown'}`);
                        console.log(`      Remarks: ${dept.remarks || 'None'}`);
                        console.log('');
                    });
                } else {
                    console.log('   ℹ️  No department status records found');
                }
            }
        }

        // Step 5: Summary
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📊 SEARCH SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const totalFound = (formData?.length || 0) + (studentData?.length || 0);
        
        console.log(`🎓 Roll Number: ${rollNumber}`);
        console.log(`📊 Total Records Found: ${totalFound}`);
        console.log(`📋 Forms Records: ${formData?.length || 0}`);
        console.log(`📊 Student Data Records: ${studentData?.length || 0}`);
        console.log(`🔍 Partial Matches: ${partialData?.length || 0}`);
        
        if (totalFound === 0) {
            console.log(`\n❌ Student with roll number "${rollNumber}" not found in the system.`);
            console.log(`💡 Suggestions:`);
            console.log(`   • Check if the roll number is correct`);
            console.log(`   • Try searching with different variations (uppercase/lowercase)`);
            console.log(`   • The student might not have registered yet`);
        } else {
            console.log(`\n✅ Student information found!`);
        }

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ SEARCH COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

findStudentByRoll();
