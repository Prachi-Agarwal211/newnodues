const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function quickCheck() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('Error:', error.message);
    } else if (data && data.length > 0) {
      console.log('Profile columns:', Object.keys(data[0]));
      console.log('\nSample data (sensitive fields hidden):');
      const profile = data[0];
      Object.keys(profile).forEach(key => {
        let value = profile[key];
        if (key.toLowerCase().includes('password') || key.toLowerCase().includes('hash') || key.toLowerCase().includes('secret')) {
          value = '[HIDDEN]';
        }
        console.log(`  ${key}: ${value}`);
      });
    } else {
      console.log('No profiles found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

quickCheck();
