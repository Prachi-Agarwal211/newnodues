const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  'https://yjjcndurtjprbtvaikzs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqamNuZHVydGpwcmJ0dmFpa3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTA0NjUyMywiZXhwIjoyMDg0NjIyNTIzfQ.dEl7p4rlMz38ftav91485N0V8AY8fSbCx7gHqWD_6MY',
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

class DepartmentHandlingTester {
  constructor() {
    this.testResults = [];
  }

  // Test case 1: Department matches form's department
  async testDirectDepartmentMatch() {
    console.log('🧪 Test 1: Direct department match');
    
    try {
      const testRegNo = `TEST${Date.now()}`;
      
      // Create test form with Computer Science department
      const { data: newForm, error: createError } = await supabaseAdmin
        .from('no_dues_forms')
        .insert({
          registration_no: testRegNo,
          student_name: 'Test Student - Computer Science',
          status: 'pending',
          school: 'Computer Science', // Changed from department_name to school
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      
      console.log(`✅ Created test form: ${testRegNo}`);
      
      // Simulate the real-time event payload structure
      const eventPayload = {
        new: newForm,
        old: null
      };

      // Now, let's test shouldDepartmentHandleApplication
      
      // This should be true
      const csDeptResult = this.shouldDepartmentHandleApplication(eventPayload, 'Computer Science');
      
      // This should be false
      const eeDeptResult = this.shouldDepartmentHandleApplication(eventPayload, 'Electrical Engineering');

      this.testResults.push({
        test: 'Direct department match',
        passed: csDeptResult && !eeDeptResult,
        details: {
          'Computer Science': csDeptResult,
          'Electrical Engineering': eeDeptResult
        }
      });

      // Clean up
      await this.cleanupTestData(testRegNo);
      
    } catch (error) {
      this.testResults.push({
        test: 'Direct department match',
        passed: false,
        error: error.message
      });
      console.error('❌ Error:', error);
    }
  }

  // Test case 2: Global departments should handle all applications
  async testGlobalDepartments() {
    console.log('\n🧪 Test 2: Global departments');
    
    try {
      const testRegNo = `TEST${Date.now()}`;
      
      // Create test form with any department
      const { data: newForm, error: createError } = await supabaseAdmin
        .from('no_dues_forms')
        .insert({
          registration_no: testRegNo,
          student_name: 'Test Student - Any Department',
          status: 'pending',
          school: 'Mechanical Engineering', // Changed from department_name to school
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      
      console.log(`✅ Created test form: ${testRegNo}`);
      
      const eventPayload = {
        new: newForm,
        old: null
      };

      const globalDepts = ['Library', 'Accounts', 'Registrar', 'Hostel', 'Proctor Office'];
      
      const results = {};
      let allPassed = true;
      
      for (const dept of globalDepts) {
        const result = this.shouldDepartmentHandleApplication(eventPayload, dept);
        results[dept] = result;
        if (!result) {
          allPassed = false;
        }
      }

      this.testResults.push({
        test: 'Global departments',
        passed: allPassed,
        details: results
      });

      // Clean up
      await this.cleanupTestData(testRegNo);
      
    } catch (error) {
      this.testResults.push({
        test: 'Global departments',
        passed: false,
        error: error.message
      });
      console.error('❌ Error:', error);
    }
  }

  // Test case 3: School name as fallback
  async testSchoolFallback() {
    console.log('\n🧪 Test 3: School name fallback');
    
    try {
      const testRegNo = `TEST${Date.now()}`;
      
      // Create test form with school instead of department
      const { data: newForm, error: createError } = await supabaseAdmin
        .from('no_dues_forms')
        .insert({
          registration_no: testRegNo,
          student_name: 'Test Student - School Fallback',
          status: 'pending',
          school: 'Management',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      
      console.log(`✅ Created test form: ${testRegNo}`);
      
      const eventPayload = {
        new: newForm,
        old: null
      };

      const managementResult = this.shouldDepartmentHandleApplication(eventPayload, 'Management');
      
      this.testResults.push({
        test: 'School name fallback',
        passed: managementResult,
        details: {
          Management: managementResult
        }
      });

      // Clean up
      await this.cleanupTestData(testRegNo);
      
    } catch (error) {
      this.testResults.push({
        test: 'School name fallback',
        passed: false,
        error: error.message
      });
      console.error('❌ Error:', error);
    }
  }

  // Test case 4: Edge cases
  async testEdgeCases() {
    console.log('\n🧪 Test 4: Edge cases');
    
    try {
      // Test with null/undefined inputs
      const nullInputResult = this.shouldDepartmentHandleApplication(null, null);
      
      // Test with invalid inputs
      const invalidInputResult = this.shouldDepartmentHandleApplication({}, 'Some Department');

      this.testResults.push({
        test: 'Edge cases',
        passed: !nullInputResult && !invalidInputResult,
        details: {
          'null inputs': nullInputResult,
          'invalid inputs': invalidInputResult
        }
      });
      
    } catch (error) {
      this.testResults.push({
        test: 'Edge cases',
        passed: false,
        error: error.message
      });
      console.error('❌ Error:', error);
    }
  }

  // The actual shouldDepartmentHandleApplication function (copied from our fixed version)
  shouldDepartmentHandleApplication(form, departmentName) {
    if (!form || !departmentName) {
      console.log('❌ shouldDepartmentHandleApplication missing required params:', {
        form: !!form,
        departmentName: !!departmentName
      });
      return false;
    }

    // The form data is nested under form.new when coming from PostgreSQL changes
    const formData = form.new || form;
    
    const formDepartment = formData.department_name || formData.school;
    console.log('🔍 shouldDepartmentHandleApplication:', {
      departmentName,
      formDepartment,
      formData
    });

    // ✅ FIXED: Direct department match
    if (formDepartment && formDepartment === departmentName) {
      console.log('✅ Form department matches - should handle');
      return true;
    }

    // ✅ FIXED: All departments should see new applications for awareness
    // This ensures every department dashboard gets notified of new submissions instantly
    console.log('✅ Department should be notified of new application - INSTANT UPDATE');
    return true;
  }

  async cleanupTestData(registrationNo) {
    try {
      // Delete status records first
      const { data: formIdData } = await supabaseAdmin
        .from('no_dues_forms')
        .select('id')
        .eq('registration_no', registrationNo)
        .single();

      if (formIdData) {
        await supabaseAdmin
          .from('no_dues_status')
          .delete()
          .eq('form_id', formIdData.id);
      }

      // Delete the form
      await supabaseAdmin
        .from('no_dues_forms')
        .delete()
        .eq('registration_no', registrationNo);

      console.log(`🧹 Cleaned up test data: ${registrationNo}`);
    } catch (error) {
      console.warn('⚠️ Could not clean up test data:', error);
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 DEPARTMENT HANDLING TEST RESULTS');
    console.log('='.repeat(60));

    let allPassed = true;
    let passedCount = 0;

    this.testResults.forEach(result => {
      console.log(`\n🔬 Test: ${result.test}`);
      
      if (result.passed) {
        console.log('   Status: ✅ PASS');
        passedCount++;
        
        if (result.details) {
          Object.entries(result.details).forEach(([key, value]) => {
            console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
          });
        }
      } else {
        console.log('   Status: ❌ FAIL');
        allPassed = false;
        
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        
        if (result.details) {
          Object.entries(result.details).forEach(([key, value]) => {
            console.log(`   - ${key}: ${value ? '✅' : '❌'}`);
          });
        }
      }
    });

    console.log('\n📊 SUMMARY');
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passedCount}`);
    console.log(`Failed: ${this.testResults.length - passedCount}`);
    console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    return allPassed;
  }

  async runAllTests() {
    console.log('🧪 Starting shouldDepartmentHandleApplication tests');
    console.log('==============================================');

    await this.testDirectDepartmentMatch();
    await this.testGlobalDepartments();
    await this.testSchoolFallback();
    await this.testEdgeCases();

    const allPassed = this.printResults();
    
    if (!allPassed) {
      process.exit(1);
    } else {
      console.log('\n🎉 All department handling tests passed!');
    }
  }
}

// Run the tests
if (require.main === module) {
  const tester = new DepartmentHandlingTester();
  
  tester.runAllTests().catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });
}
