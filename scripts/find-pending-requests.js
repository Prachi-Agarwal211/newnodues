/**
 * FIND PENDING REQUESTS
 * Searches for all pending no dues requests in the system
 * 
 * Usage: node scripts/find-pending-requests.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🔍 FINDING PENDING REQUESTS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPendingRequests() {
    try {
        // Step 1: Get all forms with pending status
        console.log('📋 Step 1: Finding all pending forms...');
        
        const { data: pendingForms, error: formsError } = await supabase
            .from('no_dues_forms')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (formsError) {
            console.error('❌ Error fetching pending forms:', formsError.message);
            return;
        }

        if (!pendingForms || pendingForms.length === 0) {
            console.log('   ✅ No pending forms found in the system\n');
            return;
        }

        console.log(`   ✅ Found ${pendingForms.length} pending forms\n`);

        // Step 2: Get department status for each pending form
        console.log('🏢 Step 2: Getting department clearance status...');
        
        const { data: departmentStatus, error: deptError } = await supabase
            .from('no_dues_status')
            .select('*')
            .in('form_id', pendingForms.map(form => form.id))
            .order('department_name', { ascending: true });

        if (deptError) {
            console.error('❌ Error fetching department status:', deptError.message);
            return;
        }

        // Step 3: Organize data by form
        const pendingRequests = pendingForms.map(form => {
            const deptStatus = departmentStatus.filter(status => status.form_id === form.id);
            
            return {
                ...form,
                departmentStatus: deptStatus,
                pendingDepartments: deptStatus.filter(status => status.status === 'pending').length,
                approvedDepartments: deptStatus.filter(status => status.status === 'approved').length,
                rejectedDepartments: deptStatus.filter(status => status.status === 'rejected').length,
                inProgressDepartments: deptStatus.filter(status => status.status === 'in_progress').length
            };
        });

        // Step 4: Display results
        console.log('📊 PENDING REQUESTS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        
        let totalPendingDept = 0;
        let totalApprovedDept = 0;
        let totalRejectedDept = 0;
        let totalInProgressDept = 0;

        pendingRequests.forEach((request, index) => {
            console.log(`\n📋 Request ${index + 1}:`);
            console.log(`   🎓 Roll Number: ${request.registration_no}`);
            console.log(`   👤 Student Name: ${request.student_name}`);
            console.log(`   📚 Course: ${request.course || 'Not specified'}`);
            console.log(`   🔀 Branch: ${request.branch || 'Not specified'}`);
            console.log(`   📧 Email: ${request.personal_email || 'Not provided'}`);
            console.log(`   📅 Applied: ${request.created_at ? new Date(request.created_at).toLocaleDateString() : 'Unknown'}`);
            console.log(`   📅 Last Updated: ${request.updated_at ? new Date(request.updated_at).toLocaleDateString() : 'Unknown'}`);
            
            if (request.departmentStatus.length > 0) {
                console.log(`   🏢 Department Status (${request.departmentStatus.length} departments):`);
                
                request.departmentStatus.forEach((dept, deptIndex) => {
                    const statusIcon = dept.status === 'approved' ? '✅' : 
                                    dept.status === 'pending' ? '⏳' : 
                                    dept.status === 'rejected' ? '❌' : 
                                    dept.status === 'in_progress' ? '🔄' : '❓';
                    
                    console.log(`      ${deptIndex + 1}. ${statusIcon} ${dept.department_name}`);
                    console.log(`         Status: ${dept.status}`);
                    if (dept.action_at) {
                        console.log(`         Action At: ${new Date(dept.action_at).toLocaleDateString()}`);
                    }
                    if (dept.action_by) {
                        console.log(`         Action By: ${dept.action_by}`);
                    }
                    if (dept.remarks) {
                        console.log(`         Remarks: ${dept.remarks}`);
                    }
                });
                
                console.log(`   📊 Summary: ${request.approvedDepartments} approved, ${request.pendingDepartments} pending, ${request.rejectedDepartments} rejected, ${request.inProgressDepartments} in progress`);
                
                totalPendingDept += request.pendingDepartments;
                totalApprovedDept += request.approvedDepartments;
                totalRejectedDept += request.rejectedDepartments;
                totalInProgressDept += request.inProgressDepartments;
            } else {
                console.log(`   ⚠️  No department status records found`);
            }
        });

        // Step 5: Department-wise breakdown
        console.log('\n🏢 DEPARTMENT-WISE PENDING BREAKDOWN');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const departmentBreakdown = {};
        
        departmentStatus.forEach(status => {
            if (!departmentBreakdown[status.department_name]) {
                departmentBreakdown[status.department_name] = {
                    pending: 0,
                    approved: 0,
                    rejected: 0,
                    in_progress: 0,
                    total: 0
                };
            }
            departmentBreakdown[status.department_name][status.status]++;
            departmentBreakdown[status.department_name].total++;
        });

        Object.entries(departmentBreakdown)
            .sort(([a], [b]) => b.localeCompare(a))
            .forEach(([deptName, stats]) => {
                if (stats.pending > 0) {
                    console.log(`\n🏢 ${deptName}:`);
                    console.log(`   ⏳ Pending: ${stats.pending}`);
                    console.log(`   ✅ Approved: ${stats.approved}`);
                    console.log(`   🔄 In Progress: ${stats.in_progress}`);
                    console.log(`   ❌ Rejected: ${stats.rejected}`);
                    console.log(`   📊 Total: ${stats.total}`);
                }
            });

        // Step 6: Overall summary
        console.log('\n📊 OVERALL SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`📋 Total Pending Applications: ${pendingRequests.length}`);
        console.log(`⏳ Total Pending Department Clearances: ${totalPendingDept}`);
        console.log(`✅ Total Approved Department Clearances: ${totalApprovedDept}`);
        console.log(`🔄 Total In Progress Department Clearances: ${totalInProgressDept}`);
        console.log(`❌ Total Rejected Department Clearances: ${totalRejectedDept}`);
        
        // Step 7: Save to file
        const filename = `backups/pending_requests_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        require('fs').writeFileSync(filename, JSON.stringify(pendingRequests, null, 2));
        console.log(`\n💾 Detailed data saved to: ${filename}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ PENDING REQUESTS ANALYSIS COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

findPendingRequests();
