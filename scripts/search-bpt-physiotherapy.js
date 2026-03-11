const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function searchPhysiotherapy() {
  console.log('🔍 Searching for Physiotherapy/BPT students...\n');
  
  // Search for BPT or Physiotherapy in courses
  const { data: bptData, error: bptError } = await supabase
    .from('no_dues_forms')
    .select('registration_no, student_name, course, branch, status, created_at')
    .or('course.ilike.%BPT%,course.ilike.%Physiotherapy%,course.ilike.%Physical Therapy%,branch.ilike.%BPT%,branch.ilike.%Physiotherapy%')
    .order('created_at', { ascending: false });

  if (bptError) {
    console.error('❌ Error:', bptError.message);
  } else if (bptData && bptData.length > 0) {
    console.log(`✅ Found ${bptData.length} Physiotherapy/BPT students:\n`);
    bptData.forEach((student, i) => {
      console.log(`${i+1}. ${student.registration_no} - ${student.student_name}`);
      console.log(`   📚 Course: ${student.course}`);
      console.log(`   🔀 Branch: ${student.branch || 'Not specified'}`);
      console.log(`   📊 Status: ${student.status}`);
      console.log(`   📅 Created: ${new Date(student.created_at).toLocaleDateString()}`);
      console.log('');
    });
  } else {
    console.log('❌ No Physiotherapy/BPT students found\n');
    
    // Let's check what BPT-related departments exist
    console.log('🔍 Checking for BPT department...');
    const { data: bptDept, error: deptError } = await supabase
      .from('departments')
      .select('*')
      .ilike('name', '%BPT%');
    
    if (bptDept && bptDept.length > 0) {
      console.log('✅ Found BPT department:');
      bptDept.forEach(dept => {
        console.log(`   🏢 ${dept.name}`);
        console.log(`   📬 ${dept.email}`);
      });
    } else {
      console.log('❌ No BPT department found');
    }
    
    // Check all departments to see what medical-related ones exist
    console.log('\n🔍 Checking all departments for medical-related...');
    const { data: allDepts, error: allDeptsError } = await supabase
      .from('departments')
      .select('name, email, description')
      .order('name', { ascending: true });
    
    if (allDepts && allDepts.length > 0) {
      const medicalRelated = allDepts.filter(dept => 
        dept.name.toLowerCase().includes('medical') ||
        dept.name.toLowerCase().includes('physio') ||
        dept.name.toLowerCase().includes('therapy') ||
        dept.name.toLowerCase().includes('bpt') ||
        dept.name.toLowerCase().includes('health')
      );
      
      if (medicalRelated.length > 0) {
        console.log('✅ Medical-related departments found:');
        medicalRelated.forEach(dept => {
          console.log(`   🏢 ${dept.name}`);
          console.log(`   📬 ${dept.email}`);
          console.log(`   📝 ${dept.description || 'No description'}`);
        });
      } else {
        console.log('❌ No medical-related departments found');
        console.log('\n📋 All available departments:');
        allDepts.forEach((dept, i) => {
          console.log(`   ${i+1}. ${dept.name} - ${dept.email}`);
        });
      }
    }
  }
}

searchPhysiotherapy().catch(console.error);
