/**
 * DEPARTMENT STUDENT COUNT - SIMPLE VERSION
 * Shows how many students each department account has processed
 * 
 * Usage: node scripts/department-student-count-simple.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🏢 DEPARTMENT STUDENT COUNT ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDepartmentStudentCounts() {
    try {
        // Step 1: Get all department status records
        console.log('📋 Step 1: Fetching department approval records...');
        
        const { data: deptStatus, error: deptError } = await supabase
            .from('no_dues_status')
            .select('*')
            .eq('status', 'approved')
            .order('action_at', { ascending: false });

        if (deptError) {
            console.error('❌ Error fetching department status:', deptError.message);
            return;
        }

        console.log(`   ✅ Found ${deptStatus.length} department approvals\n`);

        // Step 2: Get student details for each form
        console.log('📊 Step 2: Fetching student details...');
        
        const formIds = [...new Set(deptStatus.map(record => record.form_id))];
        
        const { data: studentForms, error: formsError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, student_name, status')
            .in('id', formIds);

        if (formsError) {
            console.error('❌ Error fetching student forms:', formsError.message);
            return;
        }

        // Create form to student mapping
        const formToStudent = {};
        studentForms.forEach(form => {
            formToStudent[form.id] = {
                registration_no: form.registration_no,
                student_name: form.student_name,
                form_status: form.status
            };
        });

        // Step 3: Get department email mappings
        console.log('📧 Step 3: Fetching department email mappings...');
        
        const { data: departments, error: deptMappingError } = await supabase
            .from('departments')
            .select('name, email');

        if (deptMappingError) {
            console.log(`   ⚠️  Warning: Could not fetch department mappings: ${deptMappingError.message}`);
        }

        // Create department email mapping
        const deptEmailMap = {};
        if (departments) {
            departments.forEach(dept => {
                deptEmailMap[dept.name] = dept.email;
            });
        }

        // Step 4: Group by action_by (who processed)
        console.log('📊 Step 4: Analyzing processing data...\n');

        const processorStats = {};
        
        deptStatus.forEach(record => {
            const processor = record.action_by || 'Unknown';
            const department = record.department_name || 'Unknown';
            const student = formToStudent[record.form_id] || {};
            const studentName = student.student_name || 'Unknown';
            const regNo = student.registration_no || 'Unknown';
            const processedDate = record.action_at ? new Date(record.action_at).toLocaleDateString() : 'Unknown';
            
            if (!processorStats[processor]) {
                processorStats[processor] = {
                    department: department,
                    email: deptEmailMap[department] || 'Not mapped',
                    students_processed: 0,
                    students: [],
                    first_processed: processedDate,
                    last_processed: processedDate
                };
            }
            
            processorStats[processor].students_processed++;
            processorStats[processor].students.push({
                registration_no: regNo,
                name: studentName,
                processed_date: processedDate
            });
            
            // Update date ranges
            if (processedDate !== 'Unknown') {
                const current = new Date(processedDate);
                const first = new Date(processorStats[processor].first_processed);
                const last = new Date(processorStats[processor].last_processed);
                
                if (current < first) {
                    processorStats[processor].first_processed = processedDate;
                }
                if (current > last) {
                    processorStats[processor].last_processed = processedDate;
                }
            }
        });

        // Step 5: Display results
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👥 DEPARTMENT WISE STUDENT PROCESSING REPORT');
        console.log('═══════════════════════════════════════════════════════════════');

        // Sort by student count (highest first)
        const sortedProcessors = Object.entries(processorStats)
            .sort(([,a], [,b]) => b.students_processed - a.students_processed);

        let totalStudentsProcessed = 0;

        sortedProcessors.forEach(([processor, stats], index) => {
            totalStudentsProcessed += stats.students_processed;
            
            console.log(`\n${index + 1}. 📧 ${processor}`);
            console.log(`   🏢 Department: ${stats.department}`);
            console.log(`   📬 Email: ${stats.email}`);
            console.log(`   👥 Students Processed: ${stats.students_processed}`);
            console.log(`   📅 First Processed: ${stats.first_processed}`);
            console.log(`   📅 Last Processed: ${stats.last_processed}`);
            
            // Show last 5 students processed
            if (stats.students.length > 0) {
                console.log(`   📋 Recent Students (last 5):`);
                stats.students.slice(-5).forEach((student, i) => {
                    console.log(`      ${i + 1}. ${student.registration_no} - ${student.name} (${student.processed_date})`);
                });
                
                if (stats.students.length > 5) {
                    console.log(`      ... and ${stats.students.length - 5} more`);
                }
            }
        });

        // Step 6: Department summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🏢 DEPARTMENT SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');

        const deptSummary = {};
        Object.values(processorStats).forEach(stats => {
            if (!deptSummary[stats.department]) {
                deptSummary[stats.department] = {
                    email: stats.email,
                    total_students: 0,
                    processors: []
                };
            }
            deptSummary[stats.department].total_students += stats.students_processed;
            deptSummary[stats.department].processors.push(stats.students_processed);
        });

        Object.entries(deptSummary)
            .sort(([,a], [,b]) => b.total_students - a.total_students)
            .forEach(([dept, summary], index) => {
                console.log(`${index + 1}. ${dept}`);
                console.log(`   📬 Email: ${summary.email}`);
                console.log(`   👥 Total Students: ${summary.total_students}`);
                console.log(`   👤 Processors: ${summary.processors.length} (${summary.processors.join(', ')})`);
            });

        // Step 7: Overall summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 OVERALL SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`👥 Total Processors: ${Object.keys(processorStats).length}`);
        console.log(`🏢 Total Departments: ${Object.keys(deptSummary).length}`);
        console.log(`📋 Total Approvals Processed: ${totalStudentsProcessed}`);
        console.log(`📊 Avg Students per Processor: ${(totalStudentsProcessed / Object.keys(processorStats).length).toFixed(1)}`);
        console.log(`📊 Avg Students per Department: ${(totalStudentsProcessed / Object.keys(deptSummary).length).toFixed(1)}`);

        // Step 8: Save to CSV
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Processor CSV
        const processorCSV = [['Processor', 'Department', 'Email', 'Students Processed', 'First Processed', 'Last Processed']];
        sortedProcessors.forEach(([processor, stats]) => {
            processorCSV.push([
                processor,
                stats.department,
                stats.email,
                stats.students_processed.toString(),
                stats.first_processed,
                stats.last_processed
            ]);
        });
        
        const processorCSVPath = `backups/department_processor_stats_${timestamp}.csv`;
        fs.writeFileSync(processorCSVPath, processorCSV.map(row => row.join(',')).join('\n'));

        console.log('\n💾 Files saved:');
        console.log(`   📊 Processor Stats: ${processorCSVPath}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ DEPARTMENT STUDENT COUNT ANALYSIS COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

getDepartmentStudentCounts();
