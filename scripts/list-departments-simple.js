const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function listAllDepartments() {
  console.log('📋 All Departments in System:\n');
  
  const { data: departments, error } = await supabase
    .from('departments')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('❌ Error:', error.message);
  } else if (departments) {
    departments.forEach((dept, i) => {
      console.log(`${i+1}. ${dept.name}`);
      console.log(`   📬 ${dept.email}`);
      if (dept.hod_email) {
        console.log(`   👨‍💼 HOD Email: ${dept.hod_email}`);
      }
      console.log(`   🔑 ID: ${dept.id}`);
      console.log('');
    });
  }
}

listAllDepartments().catch(console.error);
