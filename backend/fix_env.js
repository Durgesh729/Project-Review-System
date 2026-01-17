const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');

try {
    if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, 'utf8');

        // Replace React/Vite prefixes with standard backend ones
        let newContent = content
            .replace(/REACT_APP_SUPABASE_/g, 'SUPABASE_')
            .replace(/VITE_SUPABASE_/g, 'SUPABASE_');

        if (content !== newContent) {
            fs.writeFileSync(envPath, newContent);
            console.log('✅ Fixed .env variables: Removed frontend prefixes.');
        } else {
            console.log('ℹ️ .env variables appear correct (no prefixes found).');
        }
    } else {
        console.error('❌ .env file not found.');
    }
} catch (err) {
    console.error('Error fixing .env:', err);
}
