// Migration script to hash existing plain-text passwords
// Run this once: node hash-existing-passwords.js

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function hashExistingPasswords() {
  try {
    console.log('Fetching users...');
    
    // Get all users with their passwords
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, password');
    
    if (error) throw error;
    
    console.log(`Found ${users.length} users`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (user.password && user.password.match(/^\$2[aby]\$/)) {
        console.log(`  Skipping ${user.email} - already hashed`);
        skippedCount++;
        continue;
      }
      
      // Hash the plain-text password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Update the user
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: hashedPassword })
        .eq('id', user.id);
      
      if (updateError) {
        console.error(`  Failed to update ${user.email}:`, updateError.message);
      } else {
        console.log(`  Hashed password for ${user.email}`);
        updatedCount++;
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Updated: ${updatedCount} users`);
    console.log(`Skipped (already hashed): ${skippedCount} users`);
    console.log(`Total: ${users.length} users`);
    
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

hashExistingPasswords();
