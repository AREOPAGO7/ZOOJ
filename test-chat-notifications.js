// Test script to debug chat notifications
const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testChatNotifications() {
  console.log('🔍 Testing Chat Notifications System...\n');

  try {
    // 1. Check if chat_viewers table exists and is accessible
    console.log('1. Checking chat_viewers table...');
    const { data: viewers, error: viewersError } = await supabase
      .from('chat_viewers')
      .select('*')
      .limit(5);

    if (viewersError) {
      console.error('❌ Error accessing chat_viewers table:', viewersError);
      return;
    }
    console.log('✅ chat_viewers table accessible');
    console.log('📊 Current viewers:', viewers);

    // 2. Check if notifications table exists and is accessible
    console.log('\n2. Checking notifications table...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .limit(5);

    if (notificationsError) {
      console.error('❌ Error accessing notifications table:', notificationsError);
      return;
    }
    console.log('✅ notifications table accessible');
    console.log('📊 Recent notifications:', notifications);

    // 3. Check chat_threads table
    console.log('\n3. Checking chat_threads table...');
    const { data: threads, error: threadsError } = await supabase
      .from('chat_threads')
      .select('*')
      .limit(5);

    if (threadsError) {
      console.error('❌ Error accessing chat_threads table:', threadsError);
      return;
    }
    console.log('✅ chat_threads table accessible');
    console.log('📊 Recent threads:', threads);

    // 4. Check chat_messages table
    console.log('\n4. Checking chat_messages table...');
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .limit(5);

    if (messagesError) {
      console.error('❌ Error accessing chat_messages table:', messagesError);
      return;
    }
    console.log('✅ chat_messages table accessible');
    console.log('📊 Recent messages:', messages);

    // 5. Test creating a test notification
    console.log('\n5. Testing notification creation...');
    const testNotification = {
      user_id: '00000000-0000-0000-0000-000000000000', // Replace with actual user ID
      title: 'Test Chat Notification',
      message: 'This is a test notification for chat messages',
      type: 'couple_update',
      priority: 'normal'
    };

    const { data: newNotification, error: createError } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating test notification:', createError);
    } else {
      console.log('✅ Test notification created successfully:', newNotification);
    }

    console.log('\n🎯 Chat notification system test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testChatNotifications();
