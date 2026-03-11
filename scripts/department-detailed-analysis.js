/**
 * DETAILED DEPARTMENT ANALYSIS
 * Shows department-wise student processing with all processors
 * 
 * Usage: node scripts/department-detailed-analysis.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🔍 DETAILED DEPARTMENT ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function getDetailedDepartmentAnalysis() {
    try {
        // Step 1: Get all department status records
        console.log('📋 Step 1: Fetching all department status records...');
        
        const { data: allDeptStatus, error: allError } = await supabase
            .from('no_dues_status')
            .select('*')
            .order('department_name, action_at', { ascending: true });

        if (allError) {
            console.error('❌ Error fetching all department status:', allError.message);
            return;
        }

        console.log(`   ✅ Found ${allDeptStatus.length} total department records\n`);

        // Step 2: Group by department and status
        console.log('📊 Step 2: Analyzing department-wise data...\n');

        const deptStats = {};
        
        allDeptStatus.forEach(record => {
            const dept = record.department_name || 'Unknown';
            const status = record.status || 'Unknown';
            const processor = record.action_by || 'Unknown';
            
            if (!deptStats[dept]) {
                deptStats[dept] = {
                    approved: 0,
                    pending: 0,
                    rejected: 0,
                    in_progress: 0,
                    processors: {},
                    students: []
                };
            }
            
            deptStats[dept][status]++;
            
            if (!deptStats[dept].processors[processor]) {
                deptStats[dept].processors[processor] = 0;
            }
            deptStats[dept].processors[processor]++;
        });

        // Step 3: Get department email mappings
        console.log('📧 Step 3: Fetching department email mappings...');
        
        const { data: departments, error: deptMappingError } = await supabase
            .from('departments')
            .select('name, email');

        const deptEmailMap = {};
        if (departments && !deptMappingError) {
            departments.forEach(dept => {
                deptEmailMap[dept.name] = dept.email;
            });
        }

        // Step 4: Display detailed results
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🏢 DETAILED DEPARTMENT ANALYSIS');
        console.log('═══════════════════════════════════════════════════════════════');

        const sortedDepts = Object.entries(deptStats)
            .sort(([,a], [,b]) => (b.approved + b.pending + b.rejected + b.in_progress) - (a.approved + a.pending + a.rejected + a.in_progress));

        let totalApproved = 0;
        let totalPending = 0;
        let totalRejected = 0;
        let totalInProgress = 0;

        sortedDepts.forEach(([dept, stats], index) => {
            const total = stats.approved + stats.pending + stats.rejected + stats.in_progress;
            const email = deptEmailMap[dept] || 'Not mapped';
            
            totalApproved += stats.approved;
            totalPending += stats.pending;
            totalRejected += stats.rejected;
            totalInProgress += stats.in_progress;
            
            console.log(`\n${index + 1}. 🏢 ${dept}`);
            console.log(`   📬 Email: ${email}`);
            console.log(`   ✅ Approved: ${stats.approved}`);
            console.log(`   ⏳ Pending: ${stats.pending}`);
            console.log(`   ❌ Rejected: ${stats.rejected}`);
            console.log(`   🔄 In Progress: ${stats.in_progress}`);
            console.log(`   📊 Total: ${total}`);
            
            console.log(`   👤 Processors (${Object.keys(stats.processors).length}):`);
            const sortedProcessors = Object.entries(stats.processors)
                .sort(([,a], [,b]) => b - a);
            
            sortedProcessors.forEach(([processor, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                console.log(`      • ${processor}: ${count} (${percentage}%)`);
            });
        });

        // Step 5: Overall summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📊 OVERALL SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`✅ Total Approved: ${totalApproved}`);
        console.log(`⏳ Total Pending: ${totalPending}`);
        console.log(`❌ Total Rejected: ${totalRejected}`);
        console.log(`🔄 Total In Progress: ${totalInProgress}`);
        console.log(`📊 Total Records: ${totalApproved + totalPending + totalRejected + totalInProgress}`);
        console.log(`🏢 Active Departments: ${Object.keys(deptStats).length}`);

        // Step 6: Get completed students by department
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🎓 COMPLETED STUDENTS BY DEPARTMENT');
        console.log('═══════════════════════════════════════════════════════════════');

        // Get forms that are completed and their department approvals
        const { data: completedForms, error: completedError } = await supabase
            .from('no_dues_forms')
            .select('id, registration_no, student_name, course, branch')
            .eq('status', 'completed');

        if (!completedError && completedForms) {
            console.log(`📊 Found ${completedForms.length} completed students\n`);
            
            // For each completed form, check which departments approved them
            for (const form of completedForms.slice(0, 10)) { // Show first 10 as example
                const { data: formDepts, error: formDeptsError } = await supabase
                    .from('no_dues_status')
                    .select('department_name, status, action_by')
                    .eq('form_id', form.id)
                    .eq('status', 'approved');
                
                if (!formDeptsError && formDepts) {
                    console.log(`🎓 ${form.registration_no} - ${form.student_name}`);
                    console.log(`   📚 ${form.course} - ${form.branch}`);
                    console.log(`   ✅ Cleared by ${formDepts.length} departments:`);
                    formDepts.forEach(dept => {
                        console.log(`      • ${dept.department_name} by ${dept.action_by}`);
                    });
                    console.log('');
                }
            }
            
            if (completedForms.length > 10) {
                console.log(`... and ${completedForms.length - 10} more completed students\n`);
            }
        }

        // Step 7: Save to CSV
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Department stats CSV
        const deptCSV = [['Department', 'Email', 'Approved', 'Pending', 'Rejected', 'In Progress', 'Total', 'Processor Count']];
        sortedDepts.forEach(([dept, stats]) => {
            const total = stats.approved + stats.pending + stats.rejected + stats.in_progress;
            const email = deptEmailMap[dept] || 'Not mapped';
            deptCSV.push([
                dept,
                email,
                stats.approved.toString(),
                stats.pending.toString(),
                stats.rejected.toString(),
                stats.in_progress.toString(),
                total.toString(),
                Object.keys(stats.processors).length.toString()
            ]);
        });
        
        const deptCSVPath = `backups/department_detailed_stats_${timestamp}.csv`;
        fs.writeFileSync(deptCSVPath, deptCSV.map(row => row.join(',')).join('\n'));

        console.log('💾 Files saved:');
        console.log(`   📊 Department Stats: ${deptCSVPath}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ DETAILED DEPARTMENT ANALYSIS COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

getDetailedDepartmentAnalysis();
