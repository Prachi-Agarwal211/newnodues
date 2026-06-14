import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabaseAdmin
    .from('no_dues_forms')
    .select(`
        id,
        student_name,
        no_dues_status!inner (
          id,
          department_name,
          status,
          profiles (
            full_name
          )
        )
      `)
    .limit(1);

  if (error) {
    console.error('ERROR with profiles:', error);
    
    // Fallback without profiles
    const { data: d2, error: e2 } = await supabaseAdmin
      .from('no_dues_forms')
      .select(`
          id,
          no_dues_status!inner (
            id,
            department_name
          )
        `)
      .limit(1);
    
    console.log('Without profiles:', e2 ? e2 : 'Success!');
  } else {
    console.log('SUCCESS with profiles!', data);
  }
}

test();
