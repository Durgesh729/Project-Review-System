require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://lqdatjtoofnchlqlkzmy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY is required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProject() {
    const { data, error } = await supabase
        .from('projects')
        .select('id, title, project_name, assigned_at, created_at, assigned_semester, visible_sessions')
        .ilike('title', '%VisageAI%');

    if (error) {
        console.error('Error fetching project:', error);
        return;
    }

    console.log('Project Data:', JSON.stringify(data, null, 2));
}

checkProject();
