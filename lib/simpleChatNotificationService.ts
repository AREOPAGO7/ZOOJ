import { supabase } from './supabase';

export interface SimpleChatNotification {
  id: string;
  sender_id: string;
  couple_id: string;
  message_preview?: string;
  question_id?: string;
  created_at: string;
}

export const simpleChatNotificationService = {
  // Create a simple chat notification
  async createNotification(data: {
    sender_id: string;
    couple_id: string;
    message_preview?: string;
    question_id?: string;
  }): Promise<{ data: SimpleChatNotification | null; error: any }> {
    console.log('SimpleChatNotificationService: Creating notification with data:', data);
    
    const { data: notification, error } = await supabase
      .from('simple_chat_notifications')
      .insert([data])
      .select()
      .single();

    console.log('SimpleChatNotificationService: Insert result:', { notification, error });
    
    // After creating notification, clean up old ones to keep only 3 most recent
    if (notification && !error) {
      await this.cleanupOldNotifications(data.couple_id);
    }
    
    return { data: notification, error };
  },

  // Get notifications for a user (exclude notifications where user is sender)
  async getNotifications(userId: string, coupleId: string, limit: number = 3): Promise<{ data: SimpleChatNotification[] | null; error: any }> {
    console.log('SimpleChatNotificationService: Getting notifications for user:', userId, 'couple:', coupleId);
    
    const { data, error } = await supabase
      .from('simple_chat_notifications')
      .select('*')
      .eq('couple_id', coupleId) // Only notifications for this couple
      .neq('sender_id', userId) // Exclude notifications where current user is sender
      .order('created_at', { ascending: false })
      .limit(limit);

    console.log('SimpleChatNotificationService: Fetched notifications:', data?.length || 0);
    return { data, error };
  },

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('simple_chat_notifications')
      .delete()
      .eq('id', notificationId);

    return { data, error };
  },

  // Delete all notifications for a couple
  async deleteAllNotifications(coupleId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('simple_chat_notifications')
      .delete()
      .eq('couple_id', coupleId);

    return { data, error };
  },

  // Clean up old notifications, keeping only the 3 most recent for each couple
  async cleanupOldNotifications(coupleId: string): Promise<{ data: any; error: any }> {
    console.log('SimpleChatNotificationService: Cleaning up old notifications for couple:', coupleId);
    
    // Get all notifications for this couple, ordered by created_at desc
    const { data: allNotifications, error: fetchError } = await supabase
      .from('simple_chat_notifications')
      .select('id')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('SimpleChatNotificationService: Error fetching notifications for cleanup:', fetchError);
      return { data: null, error: fetchError };
    }

    // If we have more than 3 notifications, delete the old ones
    if (allNotifications && allNotifications.length > 3) {
      const notificationsToDelete = allNotifications.slice(3); // Keep first 3, delete the rest
      const idsToDelete = notificationsToDelete.map(n => n.id);

      console.log(`SimpleChatNotificationService: Deleting ${idsToDelete.length} old notifications`);

      const { data, error } = await supabase
        .from('simple_chat_notifications')
        .delete()
        .in('id', idsToDelete);

      if (error) {
        console.error('SimpleChatNotificationService: Error deleting old notifications:', error);
      } else {
        console.log('SimpleChatNotificationService: Successfully cleaned up old notifications');
      }

      return { data, error };
    }

    console.log('SimpleChatNotificationService: No cleanup needed, only', allNotifications?.length || 0, 'notifications');
    return { data: null, error: null };
  }
};
