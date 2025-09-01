import { supabase } from './supabase'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update'
  data: Record<string, any>
  is_read: boolean
  is_deleted: boolean
  created_at: string
  expires_at?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export interface NotificationSettings {
  id: string
  user_id: string
  events_enabled: boolean
  daily_questions_enabled: boolean
  quiz_invites_enabled: boolean
  couple_updates_enabled: boolean
  general_notifications_enabled: boolean
  push_enabled: boolean
  email_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  created_at: string
  updated_at: string
}

export interface QuizInvite {
  id: string
  sender_id: string
  receiver_id: string
  quiz_id?: string
  message?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  created_at: string
}

export const notificationService = {
  // Get all notifications for a user
  async getNotifications(userId: string, limit: number = 50): Promise<{ data: Notification[] | null; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  // Get unread notifications count
  async getUnreadCount(userId: string): Promise<{ data: number | null; error: any }> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('is_deleted', false)

    return { data: count, error }
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<{ data: Notification | null; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()

    return { data, error }
  },

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    return { data, error }
  },

  // Delete notification (soft delete)
  async deleteNotification(notificationId: string): Promise<{ data: Notification | null; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_deleted: true })
      .eq('id', notificationId)
      .select()
      .single()

    return { data, error }
  },

  // Delete all notifications for a user
  async deleteAllNotifications(userId: string): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_deleted: true })
      .eq('user_id', userId)
      .eq('is_deleted', false)

    return { data, error }
  },

  // Create a new notification
  async createNotification(notificationData: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'is_deleted'>): Promise<{ data: Notification | null; error: any }> {
    console.log('NotificationService: Creating notification...');
    console.log('Notification data:', notificationData);
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single()

    console.log('Notification insert result:', { data, error });
    return { data, error }
  },

  // Create event notification
  async createEventNotification(userId: string, eventTitle: string, eventDate: string, eventId?: string): Promise<{ data: Notification | null; error: any }> {
    return this.createNotification({
      user_id: userId,
      title: 'Nouvel événement',
      message: `Vous avez un nouvel événement: ${eventTitle} le ${eventDate}`,
      type: 'event',
      data: { eventId, eventTitle, eventDate },
      priority: 'normal'
    })
  },

  // Create daily question notification
  async createDailyQuestionNotification(userId: string, questionText: string): Promise<{ data: Notification | null; error: any }> {
    return this.createNotification({
      user_id: userId,
      title: 'Nouvelle question quotidienne',
      message: `Votre question du jour: ${questionText}`,
      type: 'daily_question',
      data: { questionText },
      priority: 'normal'
    })
  },

  // Create quiz invite notification
  async createQuizInviteNotification(receiverId: string, senderName: string, quizTitle?: string, message?: string): Promise<{ data: Notification | null; error: any }> {
    return this.createNotification({
      user_id: receiverId,
      title: 'Invitation au quiz',
      message: `${senderName} vous invite à participer à un quiz${quizTitle ? `: ${quizTitle}` : ''}`,
      type: 'quiz_invite',
      data: { senderName, quizTitle, message },
      priority: 'high'
    })
  },

  // Create couple update notification
  async createCoupleUpdateNotification(userId: string, updateType: string, message: string): Promise<{ data: Notification | null; error: any }> {
    return this.createNotification({
      user_id: userId,
      title: 'Mise à jour du couple',
      message,
      type: 'couple_update',
      data: { updateType },
      priority: 'normal'
    })
  },

  // Create general notification
  async createGeneralNotification(userId: string, title: string, message: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'): Promise<{ data: Notification | null; error: any }> {
    return this.createNotification({
      user_id: userId,
      title,
      message,
      type: 'general',
      data: {},
      priority
    })
  },

  // Get notification settings for a user
  async getNotificationSettings(userId: string): Promise<{ data: NotificationSettings | null; error: any }> {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    return { data, error }
  },

  // Update notification settings
  async updateNotificationSettings(userId: string, updates: Partial<NotificationSettings>): Promise<{ data: NotificationSettings | null; error: any }> {
    const { data, error } = await supabase
      .from('notification_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single()

    return { data, error }
  },

  // Create quiz invite
  async createQuizInvite(senderId: string, receiverId: string, quizId?: string, message?: string): Promise<{ data: QuizInvite | null; error: any }> {
    console.log('NotificationService: Creating quiz invite...');
    console.log('Sender ID:', senderId);
    console.log('Receiver ID:', receiverId);
    console.log('Quiz ID:', quizId);
    console.log('Message:', message);
    
    const { data, error } = await supabase
      .from('quiz_invites')
      .insert([{
        sender_id: senderId,
        receiver_id: receiverId,
        quiz_id: quizId,
        message,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }])
      .select()
      .single()

    console.log('Quiz invite insert result:', { data, error });
    return { data, error }
  },

  // Get quiz invites for a user
  async getQuizInvites(userId: string): Promise<{ data: QuizInvite[] | null; error: any }> {
    const { data, error } = await supabase
      .from('quiz_invites')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    return { data, error }
  },

  // Update quiz invite status
  async updateQuizInviteStatus(inviteId: string, status: 'accepted' | 'declined' | 'expired'): Promise<{ data: QuizInvite | null; error: any }> {
    const { data, error } = await supabase
      .from('quiz_invites')
      .update({ status })
      .eq('id', inviteId)
      .select()
      .single()

    return { data, error }
  },

  // Send notification to couple members
  async sendNotificationToCouple(userId: string, title: string, message: string, type: Notification['type'], data: Record<string, any> = {}): Promise<{ data: any; error: any }> {
    // Get the couple information
    const { data: couple, error: coupleError } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .single()

    if (coupleError || !couple) {
      return { data: null, error: coupleError || 'Couple not found' }
    }

    // Determine the partner's ID
    const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id

    if (!partnerId) {
      return { data: null, error: 'No partner found' }
    }

    // Send notification to partner
    return this.createNotification({
      user_id: partnerId,
      title,
      message,
      type,
      data,
      priority: 'normal'
    })
  },

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<{ data: any; error: any }> {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_deleted: true })
      .lt('expires_at', new Date().toISOString())
      .eq('is_deleted', false)

    return { data, error }
  }
}
