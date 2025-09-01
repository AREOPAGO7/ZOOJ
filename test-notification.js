// Test script for notification system
// Run this in the browser console or as a Node.js script

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testNotificationSystem() {
  console.log('Testing notification system...');
  
  try {
    // Test 1: Check if tables exist
    console.log('\n1. Checking if tables exist...');
    
    const { data: notificationsTable, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    console.log('Notifications table:', notificationsTable ? 'EXISTS' : 'MISSING');
    if (notificationsError) console.log('Error:', notificationsError);
    
    const { data: quizInvitesTable, error: quizInvitesError } = await supabase
      .from('quiz_invites')
      .select('*')
      .limit(1);
    
    console.log('Quiz invites table:', quizInvitesTable ? 'EXISTS' : 'MISSING');
    if (quizInvitesError) console.log('Error:', quizInvitesError);
    
    const { data: notificationSettingsTable, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1);
    
    console.log('Notification settings table:', notificationSettingsTable ? 'EXISTS' : 'MISSING');
    if (settingsError) console.log('Error:', settingsError);
    
    // Test 2: Check if we can insert a test notification
    console.log('\n2. Testing notification insertion...');
    
    const testNotification = {
      user_id: 'test-user-id',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'general',
      data: {},
      priority: 'normal'
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('notifications')
      .insert([testNotification])
      .select();
    
    if (insertError) {
      console.log('Insert error:', insertError);
    } else {
      console.log('Insert successful:', insertResult);
      
      // Clean up test data
      await supabase
        .from('notifications')
        .delete()
        .eq('id', insertResult[0].id);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testNotificationSystem();
