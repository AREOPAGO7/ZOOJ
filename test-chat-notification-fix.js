const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testChatNotificationSystem() {
  console.log('🧪 Testing Chat Notification System...\n');

  try {
    // Test 1: Check if chat_notifications table exists and has data
    console.log('1. Checking chat_notifications table...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('chat_notifications')
      .select('*')
      .limit(5);

    if (notificationsError) {
      console.error('❌ Error fetching chat notifications:', notificationsError);
      return;
    }

    console.log(`✅ Found ${notifications?.length || 0} chat notifications`);
    if (notifications && notifications.length > 0) {
      console.log('Sample notification:', {
        id: notifications[0].id,
        sender_id: notifications[0].sender_id,
        receiver_id: notifications[0].receiver_id,
        message_preview: notifications[0].message_preview,
        is_read: notifications[0].is_read,
        created_at: notifications[0].created_at
      });
    }

    // Test 2: Check couples table
    console.log('\n2. Checking couples table...');
    const { data: couples, error: couplesError } = await supabase
      .from('couples')
      .select('id, user1_id, user2_id')
      .limit(3);

    if (couplesError) {
      console.error('❌ Error fetching couples:', couplesError);
      return;
    }

    console.log(`✅ Found ${couples?.length || 0} couples`);
    if (couples && couples.length > 0) {
      console.log('Sample couple:', couples[0]);
    }

    // Test 3: Test the simplified query logic
    if (couples && couples.length > 0) {
      const testCouple = couples[0];
      const testUserId = testCouple.user1_id; // Use first user as test
      
      console.log(`\n3. Testing simplified query for user: ${testUserId}`);
      
      const { data: userNotifications, error: userError } = await supabase
        .from('chat_notifications')
        .select('*')
        .eq('receiver_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (userError) {
        console.error('❌ Error fetching user notifications:', userError);
        return;
      }

      console.log(`✅ Found ${userNotifications?.length || 0} notifications for user ${testUserId}`);
      if (userNotifications && userNotifications.length > 0) {
        userNotifications.forEach((notif, index) => {
          console.log(`  ${index + 1}. From ${notif.sender_id} to ${notif.receiver_id}: "${notif.message_preview}"`);
        });
      }
    }

    // Test 4: Check unread count
    if (couples && couples.length > 0) {
      const testCouple = couples[0];
      const testUserId = testCouple.user1_id;
      
      console.log(`\n4. Testing unread count for user: ${testUserId}`);
      
      const { count, error: countError } = await supabase
        .from('chat_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', testUserId)
        .eq('is_read', false);

      if (countError) {
        console.error('❌ Error getting unread count:', countError);
        return;
      }

      console.log(`✅ Unread notifications count: ${count || 0}`);
    }

    console.log('\n🎉 Chat notification system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testChatNotificationSystem();
