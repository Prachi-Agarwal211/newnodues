/**
 * Find student 21bcon598 and check certificate status
 */

// Load environment variables
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

async function findStudent21bcon598() {
  console.log('🔍 Searching for student 21bcon598...\n');

  try {
    // 1. Search in student_data table
    console.log('📋 Checking student_data table...');
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('student_data')
      .select('*')
      .eq('registration_no', '21bcon598')
      .single();

    if (studentError && studentError.code !== 'PGRST116') {
      console.error('❌ Error fetching student data:', studentError);
    }

    if (studentData) {
      console.log('✅ Found student in student_data:');
      console.log(`   Name: ${studentData.student_name}`);
      console.log(`   Registration: ${studentData.registration_no}`);
      console.log(`   Course: ${studentData.course} - ${studentData.branch}`);
      console.log(`   Email: ${studentData.personal_email || studentData.college_email || 'N/A'}`);
      console.log(`   Created: ${studentData.created_at}\n`);
    }

    // 2. Search in no_dues_forms table
    console.log('📄 Checking no_dues_forms table...');
    const { data: formData, error: formError } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
        *,
        no_dues_status (
          department_name,
          status,
          action_at,
          action_by
        )
      `)
      .eq('registration_no', '21bcon598')
      .single();

    if (formError && formError.code !== 'PGRST116') {
      console.error('❌ Error fetching form data:', formError);
    }

    if (formData) {
      console.log('✅ Found form in no_dues_forms:');
      console.log(`   Form ID: ${formData.id}`);
      console.log(`   Name: ${formData.student_name}`);
      console.log(`   Status: ${formData.status}`);
      console.log(`   Certificate Generated: ${formData.final_certificate_generated}`);
      console.log(`   Certificate URL: ${formData.certificate_url || 'N/A'}`);
      console.log(`   Certificate Generated At: ${formData.certificate_generated_at || 'N/A'}`);
      console.log(`   Created: ${formData.created_at}`);
      console.log(`   Updated: ${formData.updated_at}\n`);

      // Check department statuses
      if (formData.no_dues_status && formData.no_dues_status.length > 0) {
        console.log('🏢 Department Statuses:');
        formData.no_dues_status.forEach(status => {
          console.log(`   ${status.department_name}: ${status.status} (${status.action_at || 'Pending'})`);
        });
        console.log('');
      }

      // Certificate details
      if (formData.final_certificate_generated && formData.certificate_url) {
        console.log('🎓 CERTIFICATE DETAILS:');
        console.log('===================');
        console.log(`✅ Certificate Generated: YES`);
        console.log(`📎 Certificate URL: ${formData.certificate_url}`);
        console.log(`🕐 Generated At: ${formData.certificate_generated_at}`);
        
        if (formData.blockchain_hash) {
          console.log(`🔗 Blockchain Hash: ${formData.blockchain_hash}`);
          console.log(`🔗 Blockchain TX: ${formData.blockchain_tx || 'N/A'}`);
          console.log(`✅ Blockchain Verified: ${formData.blockchain_verified || 'No'}`);
        }
      } else {
        console.log('❌ CERTIFICATE STATUS:');
        console.log('===================');
        console.log(`❌ Certificate Generated: ${formData.final_certificate_generated === false ? 'FAILED' : 'NOT GENERATED'}`);
        console.log(`📎 Certificate URL: Not Available`);
        
        if (formData.status === 'completed') {
          console.log('⚠️  WARNING: Student is completed but no certificate generated!');
        } else {
          console.log(`ℹ️  Form Status: ${formData.status} (certificate generation only for completed forms)`);
        }
      }
    } else {
      console.log('❌ No form found for registration number 21bcon598');
    }

    // 3. Search for similar registration numbers (in case of typos)
    console.log('\n🔍 Searching for similar registration numbers...');
    const { data: similarStudents, error: similarError } = await supabaseAdmin
      .from('student_data')
      .select('registration_no, student_name, course, branch')
      .ilike('registration_no', '%21bcon598%')
      .limit(5);

    if (!similarError && similarStudents.length > 0) {
      console.log('📝 Found similar registration numbers:');
      similarStudents.forEach(student => {
        console.log(`   ${student.registration_no} - ${student.student_name} (${student.course} - ${student.branch})`);
      });
    }

    // 4. Check if there are any certificates with this registration number in the URL
    console.log('\n🔍 Checking certificate URLs for this registration number...');
    const { data: certificateSearch, error: certError } = await supabaseAdmin
      .from('no_dues_forms')
      .select('registration_no, student_name, certificate_url, final_certificate_generated')
      .ilike('certificate_url', '%21bcon598%')
      .limit(10);

    if (!certError && certificateSearch.length > 0) {
      console.log('📎 Found certificates mentioning this registration number:');
      certificateSearch.forEach(cert => {
        console.log(`   ${cert.registration_no} - ${cert.student_name}`);
        console.log(`   Certificate: ${cert.final_certificate_generated ? 'Generated' : 'Not Generated'}`);
        console.log(`   URL: ${cert.certificate_url}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error searching for student:', error);
  }
}

// Run the search
if (require.main === module) {
  findStudent21bcon598()
    .then(() => {
      console.log('\n✅ Search completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Search failed:', error);
      process.exit(1);
    });
}

module.exports = { findStudent21bcon598 };
