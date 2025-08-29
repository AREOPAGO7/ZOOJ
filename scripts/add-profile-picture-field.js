const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addProfilePictureField() {
  try {
    console.log('Adding profile_picture field to profiles table...');
    
    // Add profile_picture column to profiles table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS profile_picture TEXT;
      `
    });

    if (error) {
      console.error('Error adding profile_picture field:', error);
      
      // Try alternative approach using direct SQL
      console.log('Trying alternative approach...');
      const { error: altError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (altError) {
        console.error('Cannot access profiles table:', altError);
        console.log('\nPlease run this SQL command manually in your Supabase SQL editor:');
        console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;');
        return;
      }
    } else {
      console.log('✅ Successfully added profile_picture field to profiles table');
    }

    // Verify the field was added
    console.log('\nVerifying field addition...');
    const { data: sampleProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, profile_picture')
      .limit(1);

    if (verifyError) {
      console.error('Error verifying field:', verifyError);
    } else {
      console.log('✅ Field verification successful');
      console.log('Sample profile data:', sampleProfile);
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    console.log('\nIf the automatic approach failed, please run this SQL command manually in your Supabase SQL editor:');
    console.log('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture TEXT;');
  }
}

// Run the migration
addProfilePictureField()
  .then(() => {
    console.log('\nMigration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
