import { supabase } from './supabase';

export interface ChatNotification {
  id: string;
  thread_id: string;
  message_id: string;
  sender_id: string;
  receiver_id: string;
  question_id: string;
  question_content?: string;
  sender_name?: string;
  message_preview?: string;
  is_read: boolean;
  is_delivered: boolean;
  created_at: string;
  expires_at: string;
}

export const chatNotificationService = {
  // Create a chat notification
  async createChatNotification(data: {
    thread_id: string;
    message_id: string;
    sender_id: string;
    receiver_id: string;
    question_id: string;
    question_content?: string;
    sender_name?: string;
    message_preview?: string;
  }): Promise<{ data: ChatNotification | null; error: any }> {
    console.log('ChatNotificationService: Creating chat notification with data:', data);
    
    const { data: notification, error } = await supabase
      .from('chat_notifications')
      .insert([{
        thread_id: data.thread_id,
        message_id: data.message_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        question_id: data.question_id,
        question_content: data.question_content,
        sender_name: data.sender_name,
        message_preview: data.message_preview,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }])
      .select()
      .single();

    console.log('ChatNotificationService: Insert result:', { notification, error });
    return { data: notification, error };
  },

  // Get chat notifications for a user (by couple relationship)
  async getChatNotifications(userId: string, limit: number = 50): Promise<{ data: ChatNotification[] | null; error: any }> {
    console.log('ChatNotificationService: Getting chat notifications for user:', userId);
    
    // Simply fetch notifications where the current user is the receiver
    const { data, error } = await supabase
      .from('chat_notifications')
      .select('*')
      .eq('receiver_id', userId) // Only get notifications where current user is the receiver
      .order('created_at', { ascending: false })
      .limit(limit);

    console.log('ChatNotificationService: Fetched chat notifications:', data?.length || 0);
    return { data, error };
  },

  // Mark chat notification as read
  async markAsRead(notificationId: string): Promise<{ data: ChatNotification | null; error: any }> {
    const { data, error } = await supabase
      .from('chat_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    return { data, error };
  },

  // Mark chat notification as delivered
  async markAsDelivered(notificationId: string): Promise<{ data: ChatNotification | null; error: any }> {
    const { data, error } = await supabase
      .from('chat_notifications')
      .update({ is_delivered: true })
      .eq('id', notificationId)
      .select()
      .single();

    return { data, error };
  },

  // Get unread count for chat notifications (by couple relationship)
  async getUnreadCount(userId: string): Promise<{ data: number | null; error: any }> {
    console.log('ChatNotificationService: Getting unread count for user:', userId);
    
    // Simply count unread notifications where the current user is the receiver
    const { count, error } = await supabase
      .from('chat_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId) // Only count notifications where current user is the receiver
      .eq('is_read', false);

    console.log('ChatNotificationService: Unread count:', count);
    return { data: count, error };
  },

  // Delete old notifications (cleanup)
  async cleanupOldNotifications(): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('chat_notifications')
      .delete()
      .lt('expires_at', new Date().toISOString());

    return { data, error };
  },

  // Mark all chat notifications as read for a user
  async markAllAsRead(userId: string): Promise<{ data: any; error: any }> {
    console.log('ChatNotificationService: Marking all as read for user:', userId);
    
    // Simply mark all unread notifications as read where the current user is the receiver
    const { data, error } = await supabase
      .from('chat_notifications')
      .update({ is_read: true })
      .eq('receiver_id', userId) // Only mark notifications where current user is the receiver
      .eq('is_read', false);

    console.log('ChatNotificationService: Marked all as read result:', { data, error });
    return { data, error };
  },

  // Check if notification already exists for a message
  async notificationExists(messageId: string, receiverId: string): Promise<{ data: boolean; error: any }> {
    const { data, error } = await supabase
      .from('chat_notifications')
      .select('id')
      .eq('message_id', messageId)
      .eq('receiver_id', receiverId)
      .limit(1);

    if (error) {
      return { data: false, error };
    }

    return { data: (data && data.length > 0), error: null };
  }
};
