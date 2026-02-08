const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function verifyDeletion() {
    const { data: forms, error } = await supabase
        .from('no_dues_forms')
        .select('*')
        .eq('registration_no', '22BCOM1367');

    if (error) {
        console.error('❌ Error:', error);
    } else if (forms.length === 0) {
        console.log('✅ Form with registration number 22BCOM1367 has been successfully deleted');
    } else {
        console.log('❌ Form still exists');
        console.log(forms);
    }
}

verifyDeletion().catch(console.error);
