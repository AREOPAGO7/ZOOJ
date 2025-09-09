// Debug script for chat notifications
const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'https://uvdwymweuwfrzdqmhsjh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2ZHd5bXdldXdmcnpkcW1oc2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwOTMxNDQsImV4cCI6MjA3MjY2OTE0NH0.9upekTjCGOSNUH0QyoCHE_TH4k34IznM_f4iSs2Rgb8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugChatNotifications() {
  console.log('🔍 Debugging Chat Notifications...\n');

  try {
    // 1. Test database connection
    console.log('1. Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('chat_notifications')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection failed:', testError);
      return;
    }
    console.log('✅ Database connection successful');

    // 2. Check table structure
    console.log('\n2. Checking table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('chat_notifications')
      .select('*')
      .limit(0);
    
    if (tableError) {
      console.error('❌ Table structure error:', tableError);
    } else {
      console.log('✅ Table structure is accessible');
    }

    // 3. Test inserting a notification
    console.log('\n3. Testing notification insertion...');
    
    // Generate proper UUIDs for testing
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const testNotification = {
      thread_id: generateUUID(),
      message_id: generateUUID(),
      sender_id: generateUUID(),
      receiver_id: generateUUID(),
      question_id: generateUUID(),
      question_content: 'Test question content',
      sender_name: 'Test Sender',
      message_preview: 'Test message preview'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('chat_notifications')
      .insert([testNotification])
      .select();

    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
    } else {
      console.log('✅ Insert test successful:', insertData);
    }

    // 4. Check if notification was created
    console.log('\n4. Checking created notification...');
    const { data: notifications, error: selectError } = await supabase
      .from('chat_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (selectError) {
      console.error('❌ Select test failed:', selectError);
    } else {
      console.log('✅ Select test successful:');
      console.log('📊 Notifications in database:', notifications);
      
      // Check for specific user IDs
      const user692703b8 = notifications.filter(n => n.receiver_id === '692703b8-8fd7-4f6c-8149-cf79ab63468a');
      const user50e62033 = notifications.filter(n => n.receiver_id === '50e62033-8c49-442e-8448-f88d9fb22613');
      
      console.log('🔍 Notifications for user 692703b8...:', user692703b8.length);
      console.log('🔍 Notifications for user 50e62033...:', user50e62033.length);
    }

    // 5. Clean up test data
    console.log('\n5. Cleaning up test data...');
    const { error: deleteError } = await supabase
      .from('chat_notifications')
      .delete()
      .eq('question_content', 'Test question content');

    if (deleteError) {
      console.error('❌ Cleanup failed:', deleteError);
    } else {
      console.log('✅ Cleanup successful');
    }

    console.log('\n🎯 Debug completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the debug
debugChatNotifications();
