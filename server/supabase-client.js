import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') });

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.SUPABASE_URL || 'https://fipbfnjzaamjayzqvlvg.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
