import { supabase } from './supabase'

export interface DailyQuestionNotification {
  id: string
  couple_id: string | null
  daily_question_id: string
  question_id: string
  question_content: string
  scheduled_for: string
  is_read: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export const dailyQuestionNotificationService = {
  // Get all daily question notifications (global for all users, only show if less than 24h old)
  async getDailyQuestionNotifications(userId: string, limit: number = 50): Promise<{ data: DailyQuestionNotification[] | null; error: any }> {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { data, error } = await supabase
      .from('daily_question_notifications')
      .select('*')
      .eq('is_deleted', false)
      .gte('created_at', twentyFourHoursAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  // Get unread count for daily question notifications (global, only count if less than 24h old)
  async getUnreadCount(userId: string): Promise<{ data: number | null; error: any }> {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const { count, error } = await supabase
      .from('daily_question_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_deleted', false)
      .gte('created_at', twentyFourHoursAgo.toISOString())

    return { data: count, error }
  },

  // Mark a daily question notification as read
  async markAsRead(notificationId: string): Promise<{ data: DailyQuestionNotification | null; error: any }> {
    const { data, error } = await supabase
      .from('daily_question_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    return { data, error }
  },

  // Mark all daily question notifications as read for a user
  async markAllAsRead(userId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('daily_question_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    return { data, error }
  },

  // Daily question notifications are global and cannot be deleted by users
  // They automatically disappear after 24 hours

  // Create a daily question notification (for testing)
  async createNotification(notificationData: {
    couple_id: string | null
    daily_question_id: string
    question_id: string
    question_content: string
    scheduled_for: string
  }): Promise<{ data: DailyQuestionNotification | null; error: any }> {
    const { data, error } = await supabase
      .from('daily_question_notifications')
      .insert(notificationData)
      .select()
      .single()

    return { data, error }
  }
}
