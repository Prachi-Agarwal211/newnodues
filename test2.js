import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = supabaseAdmin
      .from('no_dues_forms')
      .select(`
        id,
        student_name,
        status,
        no_dues_status!inner (
          id,
          department_name,
          status,
          profiles (
            full_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(0, 19);
      
  const { data, error } = await query;
  console.log('Error:', error);
  console.log('Data length:', data ? data.length : 0);
}
run();
