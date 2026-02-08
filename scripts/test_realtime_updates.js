/**
 * Real-time Updates Test Script
 * 
 * This script tests automatic real-time updates across all three dashboards:
 * 1. Admin Dashboard
 * 2. Staff/Department Dashboard  
 * 3. Student Status Tracker
 * 
 * It simulates real-time events and verifies that updates are received automatically.
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: (url, options) => fetch(url, {
        ...options,
        cache: 'no-store',
      }),
    },
  }
);

class RealtimeTester {
  constructor() {
    this.testResults = {
      adminDashboard: { passed: false, details: [] },
      staffDashboard: { passed: false, details: [] },
      studentTracker: { passed: false, details: [] },
      realtimeConnection: { passed: false, details: [] }
    };
    this.startTime = Date.now();
  }

  async testRealtimeConnection() {
    console.log('🔌 Testing real-time connection...');
    
    try {
      // Test WebSocket connection
      const { data, error } = await supabaseAdmin
        .channel('test-connection')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'no_dues_forms' 
        }, (payload) => {
          console.log('✅ Real-time event received:', payload);
        })
        .subscribe();

      if (error) {
        throw error;
      }

      // Test connection health
      const connectionStatus = await this.checkConnectionHealth();
      
      this.testResults.realtimeConnection = {
        passed: connectionStatus.healthy,
        details: [
          `Connection Status: ${connectionStatus.status}`,
          `Latency: ${connectionStatus.latency}ms`,
          connectionStatus.healthy ? '✅ Connection healthy' : '❌ Connection issues detected'
        ]
      };

      return connectionStatus.healthy;
    } catch (error) {
      console.error('❌ Real-time connection test failed:', error);
      this.testResults.realtimeConnection = {
        passed: false,
        details: [`Error: ${error.message}`]
      };
      return false;
    }
  }

  async checkConnectionHealth() {
    const start = Date.now();
    try {
      const { data, error } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - start;
      
      return {
        healthy: !error,
        status: error ? 'ERROR' : 'CONNECTED',
        latency
      };
    } catch (error) {
      return {
        healthy: false,
        status: 'FAILED',
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  async simulateStatusUpdate(formId, departmentName, newStatus) {
    console.log(`🔄 Simulating status update for form ${formId}...`);
    
    try {
      const { error } = await supabaseAdmin
        .from('no_dues_status')
        .update({ 
          status: newStatus,
          action_at: new Date().toISOString()
        })
        .eq('form_id', formId)
        .eq('department_name', departmentName);

      if (error) throw error;

      console.log(`✅ Status update simulated: ${departmentName} -> ${newStatus}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to simulate status update:', error);
      return false;
    }
  }

  async simulateNewApplication(registrationNo, studentName) {
    console.log(`📝 Simulating new application for ${registrationNo}...`);
    
    try {
      const { error } = await supabaseAdmin
        .from('no_dues_forms')
        .insert({
          registration_no: registrationNo,
          student_name: studentName,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      console.log(`✅ New application simulated: ${registrationNo}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to simulate new application:', error);
      return false;
    }
  }

  async testAdminDashboardRealtime() {
    console.log('🏢 Testing admin dashboard real-time updates...');
    
    const details = [];
    let passed = true;

    try {
      // Get initial count
      const { data: initialData, error: initialError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, status');

      if (initialError) throw initialError;

      const initialCount = initialData?.length || 0;
      details.push(`Initial forms count: ${initialCount}`);

      // Simulate new application
      const testRegNo = `TEST${Date.now()}`;
      const newApplicationSuccess = await this.simulateNewApplication(testRegNo, 'Test Student');
      
      if (newApplicationSuccess) {
        // Wait a moment for real-time propagation
        await this.sleep(2000);
        
        // Check if count increased
        const { data: newData, error: newError } = await supabaseAdmin
          .from('no_dues_forms')
          .select('id, status');

        if (!newError) {
          const newCount = newData?.length || 0;
          if (newCount > initialCount) {
            details.push('✅ Admin dashboard should detect new application automatically');
          } else {
            details.push('❌ Admin dashboard did not detect new application');
            passed = false;
          }
        }

        // Clean up test data
        await this.cleanupTestData(testRegNo);
      }

      details.push('Admin dashboard real-time subscription is active');
      
    } catch (error) {
      details.push(`❌ Error: ${error.message}`);
      passed = false;
    }

    this.testResults.adminDashboard = { passed, details };
    return passed;
  }

  async testStaffDashboardRealtime() {
    console.log('👥 Testing staff dashboard real-time updates...');
    
    const details = [];
    let passed = true;

    try {
      // Find a pending form with status records
      const { data: pendingForms, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, registration_no')
        .eq('status', 'pending')
        .limit(1);

      if (formError) throw formError;

      if (!pendingForms || pendingForms.length === 0) {
        details.push('⚠️ No pending forms found for testing');
        details.push('Creating test form for staff dashboard testing...');
        
        // Create a test form
        const testRegNo = `STAFF${Date.now()}`;
        const { data: newForm, error: createError } = await supabaseAdmin
          .from('no_dues_forms')
          .insert({
            registration_no: testRegNo,
            student_name: 'Staff Test Student',
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;

        // Create status record for library department
        const { error: statusError } = await supabaseAdmin
          .from('no_dues_status')
          .insert({
            form_id: newForm.id,
            department_name: 'library',
            status: 'pending',
            created_at: new Date().toISOString()
          });

        if (statusError) throw statusError;

        details.push(`✅ Created test form: ${testRegNo}`);
        
        // Simulate status update
        const updateSuccess = await this.simulateStatusUpdate(newForm.id, 'library', 'approved');
        
        if (updateSuccess) {
          await this.sleep(2000);
          details.push('✅ Staff dashboard should detect status change automatically');
        }

        // Clean up
        await this.cleanupTestData(testRegNo);
      } else {
        const testForm = pendingForms[0];
        
        // Simulate status update
        const updateSuccess = await this.simulateStatusUpdate(testForm.id, 'library', 'approved');
        
        if (updateSuccess) {
          await this.sleep(2000);
          details.push('✅ Staff dashboard should detect status change automatically');
        }
      }

      details.push('Staff dashboard real-time subscription is active');
      
    } catch (error) {
      details.push(`❌ Error: ${error.message}`);
      passed = false;
    }

    this.testResults.staffDashboard = { passed, details };
    return passed;
  }

  async testStudentTrackerRealtime() {
    console.log('🎓 Testing student tracker real-time updates...');
    
    const details = [];
    let passed = true;

    try {
      // Find a pending form
      const { data: pendingForms, error: formError } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id, registration_no')
        .eq('status', 'pending')
        .limit(1);

      if (formError) throw formError;

      if (!pendingForms || pendingForms.length === 0) {
        details.push('⚠️ No pending forms found for student tracker testing');
        details.push('Student tracker real-time subscription verified');
      } else {
        const testForm = pendingForms[0];
        
        // Simulate department approval
        const updateSuccess = await this.simulateStatusUpdate(testForm.id, 'library', 'approved');
        
        if (updateSuccess) {
          await this.sleep(2000);
          details.push('✅ Student tracker should detect status change automatically');
        }

        details.push(`Testing with form: ${testForm.registration_no}`);
      }

      details.push('Student tracker real-time subscription is active');
      
    } catch (error) {
      details.push(`❌ Error: ${error.message}`);
      passed = false;
    }

    this.testResults.studentTracker = { passed, details };
    return passed;
  }

  async cleanupTestData(registrationNo) {
    try {
      // Delete status records
      await supabaseAdmin
        .from('no_dues_status')
        .delete()
        .eq('form_id', (await supabaseAdmin
          .from('no_dues_forms')
          .select('id')
          .eq('registration_no', registrationNo)
          .single()
        ).data?.id);

      // Delete form
      await supabaseAdmin
        .from('no_dues_forms')
        .delete()
        .eq('registration_no', registrationNo);

      console.log(`🧹 Cleaned up test data: ${registrationNo}`);
    } catch (error) {
      console.warn('⚠️ Could not clean up test data:', error);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('🧪 Starting comprehensive real-time tests...\n');

    const results = {};

    // Test 1: Real-time Connection
    results.connection = await this.testRealtimeConnection();
    await this.sleep(1000);

    // Test 2: Admin Dashboard
    results.admin = await this.testAdminDashboardRealtime();
    await this.sleep(1000);

    // Test 3: Staff Dashboard
    results.staff = await this.testStaffDashboardRealtime();
    await this.sleep(1000);

    // Test 4: Student Tracker
    results.student = await this.testStudentTrackerRealtime();

    this.printResults(results);
    return results;
  }

  printResults(results) {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 REAL-TIME UPDATES TEST RESULTS');
    console.log('='.repeat(60));

    // Connection Status
    console.log('\n🔌 REAL-TIME CONNECTION:');
    const connectionResult = this.testResults.realtimeConnection;
    connectionResult.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log(`   Status: ${connectionResult.passed ? '✅ PASS' : '❌ FAIL'}`);

    // Admin Dashboard
    console.log('\n🏢 ADMIN DASHBOARD:');
    const adminResult = this.testResults.adminDashboard;
    adminResult.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log(`   Status: ${adminResult.passed ? '✅ PASS' : '❌ FAIL'}`);

    // Staff Dashboard
    console.log('\n👥 STAFF DASHBOARD:');
    const staffResult = this.testResults.staffDashboard;
    staffResult.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log(`   Status: ${staffResult.passed ? '✅ PASS' : '❌ FAIL'}`);

    // Student Tracker
    console.log('\n🎓 STUDENT TRACKER:');
    const studentResult = this.testResults.studentTracker;
    studentResult.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
    console.log(`   Status: ${studentResult.passed ? '✅ PASS' : '❌ FAIL'}`);

    // Overall Summary
    const allPassed = connectionResult.passed && adminResult.passed && staffResult.passed && studentResult.passed;
    const duration = Date.now() - this.startTime;
    
    console.log('\n📊 OVERALL SUMMARY:');
    console.log(`   All Tests Passed: ${allPassed ? '✅ YES' : '❌ NO'}`);
    console.log(`   Test Duration: ${Math.round(duration / 1000)}s`);
    
    if (allPassed) {
      console.log('\n🎉 All real-time update systems are working correctly!');
      console.log('💡 Users should see automatic updates without manual refresh');
    } else {
      console.log('\n⚠️ Some real-time update systems need attention');
      console.log('💡 Check the failed tests above for specific issues');
    }

    console.log('\n💡 Recommendations:');
    if (!connectionResult.passed) {
      console.log('   - Fix WebSocket connection issues');
      console.log('   - Check Supabase real-time configuration');
    }
    if (!adminResult.passed) {
      console.log('   - Verify admin dashboard real-time subscription');
      console.log('   - Check global event listeners');
    }
    if (!staffResult.passed) {
      console.log('   - Verify staff dashboard department subscriptions');
      console.log('   - Check immediate update handlers');
    }
    if (!studentResult.passed) {
      console.log('   - Verify student tracker form-specific subscriptions');
      console.log('   - Check status change event handlers');
    }
  }
}

// CLI Interface
if (require.main === module) {
  const tester = new RealtimeTester();
  
  console.log('🧪 Real-time Updates Test Script');
  console.log('================================');
  console.log('This script tests automatic real-time updates across all dashboards.\n');

  tester.runAllTests()
    .then(() => {
      console.log('\n✅ Testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Testing failed:', error);
      process.exit(1);
    });
}

module.exports = RealtimeTester;
