require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
    try {
        console.log('Testing SELECT * from contacts...');
        const { data, error } = await supabase.from('contacts').select('*').limit(1);

        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Supabase SELECT Successful:', data);
        }
    } catch (err) {
        console.error('Exception:', err);
    }
})();
