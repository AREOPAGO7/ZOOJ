import { useNotifications } from '@/contexts/NotificationContext'
import { useAuth } from '@/lib/auth'
import { notificationUtils } from '@/lib/notificationUtils'
import { useCallback } from 'react'

export const useNotificationManager = () => {
  const { user } = useAuth()
  const { createNotification } = useNotifications()

  // Send event notification
  const sendEventNotification = useCallback(async (
    eventTitle: string, 
    eventDate: string, 
    eventId?: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendEventNotification(userId, eventTitle, eventDate, eventId)
  }, [user?.id])

  // Send daily question notification
  const sendDailyQuestion = useCallback(async (
    questionText: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendDailyQuestionNotification(userId, questionText)
  }, [user?.id])

  // Send quiz invite notification
  const sendQuizInvite = useCallback(async (
    receiverId: string,
    quizTitle?: string,
    message?: string,
    quizId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    return await notificationUtils.sendQuizInvite(user.id, receiverId, quizId, message)
  }, [user?.id])

  // Send couple update notification
  const sendCoupleUpdate = useCallback(async (
    updateType: string,
    message: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendCoupleUpdateNotification(userId, updateType, message)
  }, [user?.id])

  // Send general notification
  const sendGeneralNotification = useCallback(async (
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendGeneralNotification(userId, title, message, priority)
  }, [user?.id])

  // Send notification to couple
  const sendNotificationToCouple = useCallback(async (
    title: string,
    message: string,
    type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update',
    data: Record<string, any> = {}
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    return await notificationUtils.sendNotificationToCouple(user.id, title, message, type, data)
  }, [user?.id])

  // Send event notification to couple
  const sendEventToCouple = useCallback(async (
    eventTitle: string,
    eventDate: string,
    eventId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    return await notificationUtils.sendEventNotificationToCouple(user.id, eventTitle, eventDate, eventId)
  }, [user?.id])

  // Send daily question to couple
  const sendDailyQuestionToCouple = useCallback(async (
    questionText: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    return await notificationUtils.sendDailyQuestionNotificationToCouple(user.id, questionText)
  }, [user?.id])

  // Send urgent notification
  const sendUrgentNotification = useCallback(async (
    title: string,
    message: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendUrgentNotification(userId, title, message)
  }, [user?.id])

  // Send reminder notification
  const sendReminder = useCallback(async (
    title: string,
    message: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendReminderNotification(userId, title, message)
  }, [user?.id])

  // Send info notification
  const sendInfo = useCallback(async (
    title: string,
    message: string,
    targetUserId?: string
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    const userId = targetUserId || user.id
    return await notificationUtils.sendInfoNotification(userId, title, message)
  }, [user?.id])

  // Send batch notifications
  const sendBatchNotifications = useCallback(async (
    userIds: string[],
    title: string,
    message: string,
    type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update',
    data: Record<string, any> = {}
  ) => {
    if (!user?.id) return { error: 'User not authenticated' }
    
    return await notificationUtils.sendBatchNotifications(userIds, title, message, type, data)
  }, [user?.id])

  // Create local notification (immediate UI update)
  const createLocalNotification = useCallback((
    title: string,
    message: string,
    type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update',
    data: Record<string, any> = {},
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ) => {
    if (!user?.id) return
    
    createNotification({
      user_id: user.id,
      title,
      message,
      type,
      data,
      priority
    })
  }, [user?.id, createNotification])

  return {
    // High-level notification functions
    sendEventNotification,
    sendDailyQuestion,
    sendQuizInvite,
    sendCoupleUpdate,
    sendGeneralNotification,
    sendNotificationToCouple,
    sendEventToCouple,
    sendDailyQuestionToCouple,
    
    // Priority-based notification functions
    sendUrgentNotification,
    sendReminder,
    sendInfo,
    
    // Batch operations
    sendBatchNotifications,
    
    // Local notification (immediate UI update)
    createLocalNotification,
    
    // Utility functions
    isAuthenticated: !!user?.id
  }
}
