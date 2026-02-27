/**
 * Check certificate status for student 21BCON598 (VIDIT TRIVEDI)
 */

require('dotenv').config({ path: '.env.local' });
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

async function check21BCON598Certificate() {
  console.log('🔍 Checking certificate status for VIDIT TRIVEDI (21BCON598)...\n');

  try {
    // 1. Get complete student information
    console.log('📋 Student Information:');
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('student_data')
      .select('*')
      .eq('registration_no', '21BCON598')
      .single();

    if (studentError) {
      console.error('❌ Error fetching student data:', studentError);
      return;
    }

    console.log(`✅ Name: ${studentData.student_name}`);
    console.log(`📝 Registration: ${studentData.registration_no}`);
    console.log(`🎓 Course: ${studentData.course} - ${studentData.branch}`);
    console.log(`📧 Email: ${studentData.personal_email || studentData.college_email || 'N/A'}`);
    console.log(`📱 Phone: ${studentData.contact_no || 'N/A'}`);
    console.log(`🏫 Admission Year: ${studentData.admission_year || 'N/A'}`);
    console.log(`🎓 Passing Year: ${studentData.passing_year || 'N/A'}\n`);

    // 2. Check no dues form status
    console.log('📄 No Dues Form Status:');
    const { data: formData, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by,
          remarks
        )
      `)
      .eq('registration_no', '21BCON598')
      .single();

    if (formError && formError.code !== 'PGRST116') {
      console.error('❌ Error fetching form data:', formError);
      return;
    }

    if (!formData) {
      console.log('❌ No no-dues form found for this student');
      console.log('ℹ️  Student needs to submit a no-dues application first');
      return;
    }

    console.log(`📋 Form ID: ${formData.id}`);
    console.log(`📊 Form Status: ${formData.status.toUpperCase()}`);
    console.log(`📅 Submitted: ${formData.created_at}`);
    console.log(`🔄 Last Updated: ${formData.updated_at}\n`);

    // 3. Check department clearances
    if (formData.no_dues_status && formData.no_dues_status.length > 0) {
      console.log('🏢 Department Clearances:');
      console.log('========================');
      
      const departments = ['Library', 'Hostel', 'Accounts', 'Department', 'Sports', 'Transport'];
      departments.forEach(dept => {
        const status = formData.no_dues_status.find(s => s.department_name.toLowerCase().includes(dept.toLowerCase()));
        if (status) {
          const icon = status.status === 'approved' ? '✅' : status.status === 'rejected' ? '❌' : '⏳';
          console.log(`${icon} ${status.department_name}: ${status.status.toUpperCase()}`);
          if (status.action_at) {
            console.log(`   📅 ${status.action_at}`);
          }
          if (status.action_by) {
            console.log(`   👤 By: ${status.action_by}`);
          }
          if (status.remarks) {
            console.log(`   📝 Remarks: ${status.remarks}`);
          }
        } else {
          console.log(`⏳ ${dept}: PENDING`);
        }
        console.log('');
      });
    }

    // 4. CERTIFICATE STATUS CHECK
    console.log('🎓 CERTIFICATE STATUS:');
    console.log('====================');
    
    if (formData.final_certificate_generated) {
      console.log('✅ CERTIFICATE GENERATED: YES');
      console.log(`📎 Certificate URL: ${formData.certificate_url || 'N/A'}`);
      console.log(`🕐 Generated At: ${formData.certificate_generated_at || 'N/A'}`);
      
      if (formData.blockchain_hash) {
        console.log('🔗 BLOCKCHAIN VERIFICATION:');
        console.log(`   Hash: ${formData.blockchain_hash}`);
        console.log(`   Transaction: ${formData.blockchain_tx || 'N/A'}`);
        console.log(`   Verified: ${formData.blockchain_verified ? '✅ YES' : '❌ NO'}`);
      }
      
      // Try to access the certificate URL if available
      if (formData.certificate_url) {
        console.log(`\n🌐 Certificate can be accessed at: ${formData.certificate_url}`);
      }
    } else {
      console.log('❌ CERTIFICATE NOT GENERATED');
      
      if (formData.status === 'completed') {
        console.log('⚠️  WARNING: Form is completed but certificate not generated!');
        console.log('ℹ️  This might be a system issue - certificate generation should be triggered');
      } else {
        console.log(`ℹ️  Form Status: ${formData.status}`);
        console.log('ℹ️  Certificate is only generated after form completion and all department approvals');
      }
    }

    // 5. Check if there are any issues preventing certificate generation
    console.log('\n🔍 CERTIFICATE ELIGIBILITY CHECK:');
    console.log('==================================');
    
    const allApproved = formData.no_dues_status && 
      formData.no_dues_status.every(status => status.status === 'approved');
    
    console.log(`✅ All Departments Approved: ${allApproved ? 'YES' : 'NO'}`);
    console.log(`✅ Form Status Completed: ${formData.status === 'completed' ? 'YES' : 'NO'}`);
    console.log(`✅ Certificate Generated: ${formData.final_certificate_generated ? 'YES' : 'NO'}`);
    
    if (allApproved && formData.status === 'completed' && !formData.final_certificate_generated) {
      console.log('\n🚨 ACTION REQUIRED:');
      console.log('==================');
      console.log('Student is eligible for certificate but it has not been generated!');
      console.log('This appears to be a system issue that needs attention.');
    }

  } catch (error) {
    console.error('❌ Error checking certificate status:', error);
  }
}

// Run the check
if (require.main === module) {
  check21BCON598Certificate()
    .then(() => {
      console.log('\n✅ Certificate status check completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Certificate status check failed:', error);
      process.exit(1);
    });
}

module.exports = { check21BCON598Certificate };
