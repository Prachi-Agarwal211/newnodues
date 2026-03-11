const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function searchVariations() {
  const variations = [
    '24mptn0001',
    '24MPTN0001', 
    '24mptn001',
    '24MPTN001',
    '24-mptn-0001',
    '24-MPTN-0001',
    '24mptn',
    '24MPTN'
  ];

  console.log('🔍 Searching for roll number variations...\n');

  for (const variation of variations) {
    const { data, error } = await supabase
      .from('no_dues_forms')
      .select('registration_no, student_name, status, created_at')
      .ilike('registration_no', `%${variation}%`)
      .limit(5);

    if (data && data.length > 0) {
      console.log(`✅ Found matches for "${variation}":`);
      data.forEach((record, i) => {
        console.log(`  ${i+1}. ${record.registration_no} - ${record.student_name} (${record.status})`);
      });
      console.log('');
    }
  }

  // Also search for any roll numbers starting with 24
  console.log('🔍 Searching for all roll numbers starting with "24"...');
  const { data: all24, error: err24 } = await supabase
    .from('no_dues_forms')
    .select('registration_no, student_name, status, course, branch')
    .ilike('registration_no', '24%')
    .limit(20);

  if (all24 && all24.length > 0) {
    console.log(`✅ Found ${all24.length} students with roll numbers starting with "24":`);
    all24.forEach((record, i) => {
      console.log(`  ${i+1}. ${record.registration_no} - ${record.student_name} (${record.course} - ${record.branch})`);
    });
  } else {
    console.log('❌ No students found with roll numbers starting with "24"');
  }
}

searchVariations().catch(console.error);
