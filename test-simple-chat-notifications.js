const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSimpleChatNotifications() {
  console.log('🧪 Testing Simple Chat Notification System...\n');

  try {
    // Test 1: Check if simple_chat_notifications table exists
    console.log('1. Checking simple_chat_notifications table...');
    const { data: notifications, error: notificationsError } = await supabase
      .from('simple_chat_notifications')
      .select('*')
      .limit(5);

    if (notificationsError) {
      console.error('❌ Error fetching simple chat notifications:', notificationsError);
      return;
    }

    console.log(`✅ Found ${notifications?.length || 0} simple chat notifications`);
    if (notifications && notifications.length > 0) {
      console.log('Sample notification:', {
        id: notifications[0].id,
        sender_id: notifications[0].sender_id,
        couple_id: notifications[0].couple_id,
        message_preview: notifications[0].message_preview,
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

    // Test 3: Test the new query logic
    if (couples && couples.length > 0) {
      const testCouple = couples[0];
      const testUserId = testCouple.user1_id; // Use first user as test
      
      console.log(`\n3. Testing new query logic for user: ${testUserId}, couple: ${testCouple.id}`);
      
      const { data: userNotifications, error: userError } = await supabase
        .from('simple_chat_notifications')
        .select('*')
        .eq('couple_id', testCouple.id) // Only notifications for this couple
        .neq('sender_id', testUserId) // Exclude notifications where current user is sender
        .order('created_at', { ascending: false })
        .limit(3); // Limit to 3 most recent notifications

      if (userError) {
        console.error('❌ Error fetching user notifications:', userError);
        return;
      }

      console.log(`✅ Found ${userNotifications?.length || 0} notifications for user ${testUserId}`);
      if (userNotifications && userNotifications.length > 0) {
        userNotifications.forEach((notif, index) => {
          console.log(`  ${index + 1}. From ${notif.sender_id}: "${notif.message_preview}"`);
        });
      }
    }

    // Test 4: Create a test notification
    if (couples && couples.length > 0) {
      const testCouple = couples[0];
      const testUserId = testCouple.user1_id;
      
      console.log(`\n4. Creating test notification for couple: ${testCouple.id}`);
      
      const { data: newNotification, error: createError } = await supabase
        .from('simple_chat_notifications')
        .insert([{
          sender_id: testUserId,
          couple_id: testCouple.id,
          message_preview: 'Test message from simple chat notification system',
          question_id: null
        }])
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating test notification:', createError);
        return;
      }

      console.log('✅ Test notification created:', {
        id: newNotification.id,
        sender_id: newNotification.sender_id,
        couple_id: newNotification.couple_id,
        message_preview: newNotification.message_preview
      });

      // Test 5: Verify the notification appears for the partner
      const partnerId = testCouple.user2_id;
      console.log(`\n5. Checking if notification appears for partner: ${partnerId}`);
      
      const { data: partnerNotifications, error: partnerError } = await supabase
        .from('simple_chat_notifications')
        .select('*')
        .eq('couple_id', testCouple.id)
        .neq('sender_id', partnerId) // Partner should see notifications where they are NOT the sender
        .order('created_at', { ascending: false })
        .limit(5);

      if (partnerError) {
        console.error('❌ Error fetching partner notifications:', partnerError);
        return;
      }

      console.log(`✅ Partner sees ${partnerNotifications?.length || 0} notifications`);
      const testNotification = partnerNotifications?.find(n => n.id === newNotification.id);
      if (testNotification) {
        console.log('✅ Test notification appears for partner!');
      } else {
        console.log('❌ Test notification does NOT appear for partner');
      }

      // Test cleanup functionality by creating more than 3 notifications
      console.log('\n6. Testing cleanup functionality...');
      
      // Create 5 test notifications
      const testNotifications = [];
      for (let i = 1; i <= 5; i++) {
        const { data: testNotif, error: createError } = await supabase
          .from('simple_chat_notifications')
          .insert([{
            sender_id: testUserId,
            couple_id: testCouple.id,
            message_preview: `Test message ${i}`,
            question_id: null
          }])
          .select()
          .single();

        if (createError) {
          console.error(`❌ Error creating test notification ${i}:`, createError);
        } else {
          testNotifications.push(testNotif);
          console.log(`✅ Created test notification ${i}`);
        }
      }

      // Check how many notifications exist now
      const { data: allNotifications, error: countError } = await supabase
        .from('simple_chat_notifications')
        .select('id')
        .eq('couple_id', testCouple.id)
        .order('created_at', { ascending: false });

      if (countError) {
        console.error('❌ Error counting notifications:', countError);
      } else {
        console.log(`📊 Total notifications for couple: ${allNotifications?.length || 0}`);
        if (allNotifications && allNotifications.length <= 3) {
          console.log('✅ Cleanup working correctly - only 3 or fewer notifications remain');
        } else {
          console.log('⚠️  Cleanup may not be working - more than 3 notifications exist');
        }
      }

      // Clean up all test notifications
      console.log('\n7. Cleaning up all test notifications...');
      const { error: deleteError } = await supabase
        .from('simple_chat_notifications')
        .delete()
        .eq('couple_id', testCouple.id);

      if (deleteError) {
        console.error('❌ Error deleting test notifications:', deleteError);
      } else {
        console.log('✅ All test notifications cleaned up');
      }
    }

    console.log('\n🎉 Simple chat notification system test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSimpleChatNotifications();
