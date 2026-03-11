/**
 * DEPARTMENT PERMISSIONS ANALYSIS
 * Shows what each department account can access and their permissions
 * 
 * Usage: node scripts/department-permissions-analysis.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing database credentials in .env.local');
    process.exit(1);
}

console.log('🔐 DEPARTMENT PERMISSIONS ANALYSIS');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`🔗 Database: ${supabaseUrl}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDepartmentPermissions() {
    try {
        // Step 1: Get all profiles with their roles and departments
        console.log('👥 Step 1: Fetching all user profiles...');
        
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .order('role', { ascending: true });

        if (profilesError) {
            console.error('❌ Error fetching profiles:', profilesError.message);
            return;
        }

        console.log(`   ✅ Found ${profiles.length} user profiles\n`);

        // Step 2: Get all departments
        console.log('🏢 Step 2: Fetching department definitions...');
        
        const { data: departments, error: deptError } = await supabase
            .from('departments')
            .select('*')
            .order('name', { ascending: true });

        if (deptError) {
            console.error('❌ Error fetching departments:', deptError.message);
            return;
        }

        console.log(`   ✅ Found ${departments.length} departments\n`);

        // Step 3: Analyze permissions by role
        console.log('📊 Step 3: Analyzing permissions by role...\n');

        // Group users by role and department
        const roleAnalysis = {};
        const departmentAnalysis = {};

        profiles.forEach(profile => {
            const role = profile.role || 'unknown';
            const dept = profile.department_name || 'unassigned';
            const email = profile.email || 'no-email';
            
            // Group by role
            if (!roleAnalysis[role]) {
                roleAnalysis[role] = {
                    users: [],
                    departments: new Set(),
                    total_users: 0
                };
            }
            roleAnalysis[role].users.push({
                email: email,
                full_name: profile.full_name || 'No Name',
                department: dept,
                is_active: profile.is_active,
                assigned_department_ids: profile.assigned_department_ids || []
            });
            roleAnalysis[role].departments.add(dept);
            roleAnalysis[role].total_users++;

            // Group by department
            if (!departmentAnalysis[dept]) {
                departmentAnalysis[dept] = {
                    users: [],
                    roles: new Set(),
                    department_info: null
                };
            }
            departmentAnalysis[dept].users.push({
                email: email,
                full_name: profile.full_name || 'No Name',
                role: role,
                is_active: profile.is_active,
                assigned_department_ids: profile.assigned_department_ids || []
            });
            departmentAnalysis[dept].roles.add(role);
        });

        // Add department info
        departments.forEach(dept => {
            if (departmentAnalysis[dept.name]) {
                departmentAnalysis[dept.name].department_info = dept;
            }
        });

        // Step 4: Display role-based analysis
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('👥 ROLE-BASED PERMISSIONS ANALYSIS');
        console.log('═══════════════════════════════════════════════════════════════');

        const rolePermissions = {
            'admin': {
                description: 'Full system access - can manage everything',
                permissions: [
                    '✅ View all student applications',
                    '✅ Approve/Reject all departments',
                    '✅ Manage user accounts',
                    '✅ Generate certificates',
                    '✅ View system analytics',
                    '✅ Manage departments',
                    '✅ System configuration'
                ]
            },
            'department': {
                description: 'Department-specific access - can manage own department',
                permissions: [
                    '✅ View assigned student applications',
                    '✅ Approve/Reject own department only',
                    '✅ View department analytics',
                    '✅ Add remarks/comments',
                    '✅ View student details'
                ]
            },
            'student': {
                description: 'Student access - can manage own applications',
                permissions: [
                    '✅ Submit no dues application',
                    '✅ View own application status',
                    '✅ Upload documents',
                    '✅ Communicate with departments',
                    '✅ Download certificate (if approved)'
                ]
            },
            'unknown': {
                description: 'Undefined role - limited access',
                permissions: [
                    '⚠️  Limited access - role not defined'
                ]
            }
        };

        Object.entries(roleAnalysis).forEach(([role, data]) => {
            console.log(`\n🎭 Role: ${role.toUpperCase()}`);
            console.log(`📊 Total Users: ${data.total_users}`);
            console.log(`🏢 Departments: ${data.departments.size}`);
            console.log(`📝 Description: ${rolePermissions[role]?.description || 'Unknown role'}`);
            console.log(`🔐 Permissions:`);
            
            const permissions = rolePermissions[role]?.permissions || ['⚠️  No permissions defined'];
            permissions.forEach(permission => {
                console.log(`   ${permission}`);
            });
            
            console.log(`👤 Users (${data.users.length}):`);
            data.users.forEach((user, index) => {
                const status = user.is_active ? '🟢' : '🔴';
                console.log(`   ${index + 1}. ${status} ${user.email} - ${user.full_name} (${user.department})`);
            });
        });

        // Step 5: Display department-based analysis
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('🏢 DEPARTMENT-BASED ACCESS ANALYSIS');
        console.log('═══════════════════════════════════════════════════════════════');

        Object.entries(departmentAnalysis).forEach(([dept, data]) => {
            console.log(`\n🏢 Department: ${dept}`);
            
            if (data.department_info) {
                console.log(`📬 Email: ${data.department_info.email}`);
                console.log(`📋 Description: ${data.department_info.description || 'No description'}`);
            } else {
                console.log(`⚠️  No department configuration found`);
            }
            
            console.log(`👥 Users: ${data.users.length}`);
            console.log(`🎭 Roles: ${Array.from(data.roles).join(', ')}`);
            
            console.log(`👤 User Accounts:`);
            data.users.forEach((user, index) => {
                const status = user.is_active ? '🟢' : '🔴';
                const assignedDepts = user.assigned_department_ids.length > 0 ? 
                    ` (Assigned: ${user.assigned_department_ids.length} depts)` : '';
                console.log(`   ${index + 1}. ${status} ${user.email}`);
                console.log(`      📝 Name: ${user.full_name}`);
                console.log(`      🎭 Role: ${user.role}${assignedDepts}`);
            });
            
            // What this department can see/do
            console.log(`🔐 Department Access:`);
            const hasAdmin = data.roles.has('admin');
            const hasDepartment = data.roles.has('department');
            
            if (hasAdmin) {
                console.log(`   ✅ Full system access (admin users present)`);
            } else if (hasDepartment) {
                console.log(`   ✅ Department-specific access only`);
                console.log(`   ✅ Can view students assigned to this department`);
                console.log(`   ✅ Can approve/reject for this department only`);
            } else {
                console.log(`   ⚠️  Limited access - no department users`);
            }
        });

        // Step 6: Email access summary
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('📧 EMAIL ACCESS SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════');

        console.log('\n🔐 ADMIN ACCOUNTS (Full Access):');
        profiles.filter(p => p.role === 'admin').forEach((profile, index) => {
            console.log(`${index + 1}. 📧 ${profile.email}`);
            console.log(`   👤 ${profile.full_name || 'No Name'}`);
            console.log(`   🟢 Status: ${profile.is_active ? 'Active' : 'Inactive'}`);
            console.log(`   🏢 Department: ${profile.department_name || 'System Admin'}`);
        });

        console.log('\n🏢 DEPARTMENT ACCOUNTS (Department Access):');
        profiles.filter(p => p.role === 'department').forEach((profile, index) => {
            console.log(`${index + 1}. 📧 ${profile.email}`);
            console.log(`   👤 ${profile.full_name || 'No Name'}`);
            console.log(`   🟢 Status: ${profile.is_active ? 'Active' : 'Inactive'}`);
            console.log(`   🏢 Department: ${profile.department_name || 'Not Assigned'}`);
            console.log(`   📋 Assigned Departments: ${profile.assigned_department_ids?.length || 0}`);
            
            // What they can access
            if (profile.assigned_department_ids && profile.assigned_department_ids.length > 0) {
                console.log(`   🔐 Can manage: ${profile.assigned_department_ids.length} departments`);
            } else if (profile.department_name) {
                console.log(`   🔐 Can manage: ${profile.department_name} department`);
            } else {
                console.log(`   ⚠️  No department access assigned`);
            }
        });

        // Step 7: What each email should see
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('👁️ WHAT EACH EMAIL SHOULD SEE');
        console.log('═══════════════════════════════════════════════════════════════');

        profiles.forEach(profile => {
            console.log(`\n📧 ${profile.email}`);
            console.log(`👤 ${profile.full_name || 'No Name'} (${profile.role})`);
            console.log(`🟢 Status: ${profile.is_active ? 'Active' : 'Inactive'}`);
            
            if (profile.role === 'admin') {
                console.log(`🔐 SHOULD SEE:`);
                console.log(`   ✅ All student applications (241 total)`);
                console.log(`   ✅ All department statuses`);
                console.log(`   ✅ System analytics and reports`);
                console.log(`   ✅ User management`);
                console.log(`   ✅ Certificate generation`);
                console.log(`   ✅ All communication logs`);
            } else if (profile.role === 'department') {
                console.log(`🔐 SHOULD SEE:`);
                if (profile.assigned_department_ids && profile.assigned_department_ids.length > 0) {
                    console.log(`   ✅ Students assigned to ${profile.assigned_department_ids.length} departments`);
                } else if (profile.department_name) {
                    console.log(`   ✅ Students assigned to ${profile.department_name} department`);
                } else {
                    console.log(`   ⚠️  No department assigned - limited access`);
                }
                console.log(`   ✅ Department-specific approvals`);
                console.log(`   ✅ Department analytics`);
                console.log(`   ✅ Student communications for their department`);
            } else {
                console.log(`⚠️  LIMITED/UNKNOWN ACCESS:`);
                console.log(`   ⚠️  Role not properly defined`);
            }
        });

        // Step 8: Save analysis to file
        const fs = require('fs');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        const analysisData = {
            timestamp: new Date().toISOString(),
            summary: {
                total_profiles: profiles.length,
                total_departments: departments.length,
                active_users: profiles.filter(p => p.is_active).length,
                admin_users: profiles.filter(p => p.role === 'admin').length,
                department_users: profiles.filter(p => p.role === 'department').length
            },
            role_analysis: roleAnalysis,
            department_analysis: Object.fromEntries(
                Object.entries(departmentAnalysis).map(([key, value]) => [
                    key, 
                    {
                        ...value,
                        roles: Array.from(value.roles)
                    }
                ])
            ),
            profiles: profiles,
            departments: departments
        };

        const analysisPath = `backups/permissions_analysis_${timestamp}.json`;
        fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));

        console.log('\n💾 Analysis saved:');
        console.log(`   📊 Full Analysis: ${analysisPath}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ DEPARTMENT PERMISSIONS ANALYSIS COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

analyzeDepartmentPermissions();
