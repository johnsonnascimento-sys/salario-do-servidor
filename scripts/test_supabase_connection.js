
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env.local');

console.log('Reading .env.local from:', envPath);

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envVars[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
    });

    const supabaseUrl = envVars.VITE_SUPABASE_URL;
    const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not found in .env.local');
        process.exit(1);
    }

    console.log('Initializing Supabase client with URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Testing connection...');
    // Try to list tables or just select from a known table 'courts' as per schema.sql
    const { count, error } = await supabase
        .from('courts')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Connection failed:', error.message);
        // If table doesn't exist, it might return a specific error (404 or relation does not exist)
        if (error.code === 'PGRST204' || error.message.includes('relation "public.courts" does not exist')) {
            console.log('Connection successful, but table "courts" does not exist yet. This is expected if migration hasn\'t run.');
        } else {
            process.exit(1);
        }
    } else {
        console.log('Connection successful! Courts table exists.');
        console.log('Row count:', count);
    }

} catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
}
