import { notificationService } from './notificationService'
import { profileService } from './profileService'

// Utility functions for sending notifications throughout the app

export const notificationUtils = {
  // Send event notification to a user
  async sendEventNotification(userId: string, eventTitle: string, eventDate: string, eventId?: string) {
    try {
      const result = await notificationService.createEventNotification(userId, eventTitle, eventDate, eventId)
      if (result.error) {
        console.error('Error sending event notification:', result.error)
      }
      return result
    } catch (error) {
      console.error('Error sending event notification:', error)
      return { data: null, error }
    }
  },

  // Send daily question notification to a user
  async sendDailyQuestionNotification(userId: string, questionText: string) {
    try {
      const result = await notificationService.createDailyQuestionNotification(userId, questionText)
      if (result.error) {
        console.error('Error sending daily question notification:', result.error)
      }
      return result
    } catch (error) {
      console.error('Error sending daily question notification:', error)
      return { data: null, error }
    }
  },

  // Send quiz invite notification to a user
  async sendQuizInviteNotification(receiverId: string, senderName: string, quizTitle?: string, message?: string) {
    try {
      const result = await notificationService.createQuizInviteNotification(receiverId, senderName, quizTitle, message)
      if (result.error) {
        console.error('Error sending quiz invite notification:', result.error)
      }
      return result
    } catch (error) {
      console.error('Error sending quiz invite notification:', error)
      return { data: null, error }
    }
  },

  // Send couple update notification to a user
  async sendCoupleUpdateNotification(userId: string, updateType: string, message: string) {
    try {
      const result = await notificationService.createCoupleUpdateNotification(userId, updateType, message)
      if (result.error) {
        console.error('Error sending couple update notification:', result.error)
      }
      return result
    } catch (error) {
      console.error('Error sending couple update notification:', error)
      return { data: null, error }
    }
  },

  // Send general notification to a user
  async sendGeneralNotification(userId: string, title: string, message: string, priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal') {
    try {
      const result = await notificationService.createGeneralNotification(userId, title, message, priority)
      if (result.error) {
        console.error('Error sending general notification:', result.error)
      }
      return result
    } catch (error) {
      console.error('Error sending general notification:', error)
      return { data: null, error }
    }
  },

  // Send notification to both members of a couple
  async sendNotificationToCouple(userId: string, title: string, message: string, type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update', data: Record<string, any> = {}) {
    try {
      const result = await notificationService.sendNotificationToCouple(userId, title, message, type, data)
      if (result.error) {
        console.error('Error sending notification to couple:', result.error)
      }
      return result
    } catch (error) {
      console.error('Error sending notification to couple:', error)
      return { data: null, error }
    }
  },

  // Send quiz invite and notification
  async sendQuizInvite(senderId: string, receiverId: string, quizId?: string, message?: string) {
    try {
      console.log('NotificationUtils: Starting sendQuizInvite...');
      console.log('Sender ID:', senderId);
      console.log('Receiver ID:', receiverId);
      console.log('Quiz ID:', quizId);
      console.log('Message:', message);
      
      // Create the quiz invite
      console.log('Creating quiz invite...');
      const inviteResult = await notificationService.createQuizInvite(senderId, receiverId, quizId, message)
      console.log('Quiz invite result:', inviteResult);
      
      if (inviteResult.error) {
        console.error('Error creating quiz invite:', inviteResult.error)
        return inviteResult
      }

      // Get sender's profile for the notification
      console.log('Getting sender profile...');
      const senderProfile = await profileService.getProfile(senderId)
      console.log('Sender profile:', senderProfile);
      
      const senderName = senderProfile.data?.name || 'Votre partenaire'

      // Send notification to receiver
      console.log('Sending quiz invite notification...');
      const notificationResult = await this.sendQuizInviteNotification(
        receiverId,
        senderName,
        quizId,
        message
      )
      console.log('Notification result:', notificationResult);

      return {
        invite: inviteResult.data,
        notification: notificationResult.data,
        error: inviteResult.error || notificationResult.error
      }
    } catch (error) {
      console.error('Error sending quiz invite:', error)
      return { invite: null, notification: null, error }
    }
  },

  // Send event notification to a couple
  async sendEventNotificationToCouple(userId: string, eventTitle: string, eventDate: string, eventId?: string) {
    try {
      const result = await this.sendNotificationToCouple(
        userId,
        'Nouvel événement',
        `Vous avez un nouvel événement: ${eventTitle} le ${eventDate}`,
        'event',
        { eventId, eventTitle, eventDate }
      )
      return result
    } catch (error) {
      console.error('Error sending event notification to couple:', error)
      return { data: null, error }
    }
  },

  // Send daily question notification to a couple
  async sendDailyQuestionNotificationToCouple(userId: string, questionText: string) {
    try {
      const result = await this.sendNotificationToCouple(
        userId,
        'Nouvelle question quotidienne',
        `Votre question du jour: ${questionText}`,
        'daily_question',
        { questionText }
      )
      return result
    } catch (error) {
      console.error('Error sending daily question notification to couple:', error)
      return { data: null, error }
    }
  },

  // Send urgent notification (high priority)
  async sendUrgentNotification(userId: string, title: string, message: string) {
    return this.sendGeneralNotification(userId, title, message, 'urgent')
  },

  // Send reminder notification
  async sendReminderNotification(userId: string, title: string, message: string) {
    return this.sendGeneralNotification(userId, title, message, 'high')
  },

  // Send informational notification (low priority)
  async sendInfoNotification(userId: string, title: string, message: string) {
    return this.sendGeneralNotification(userId, title, message, 'low')
  },

  // Batch send notifications to multiple users
  async sendBatchNotifications(userIds: string[], title: string, message: string, type: 'event' | 'daily_question' | 'quiz_invite' | 'general' | 'couple_update', data: Record<string, any> = {}) {
    try {
      const promises = userIds.map(userId => 
        notificationService.createNotification({
          user_id: userId,
          title,
          message,
          type,
          data,
          priority: 'normal'
        })
      )

      const results = await Promise.allSettled(promises)
      const successful = results.filter(result => result.status === 'fulfilled' && !result.value.error)
      const failed = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value.error))

      return {
        successful: successful.length,
        failed: failed.length,
        total: userIds.length,
        errors: failed.map(result => 
          result.status === 'rejected' ? result.reason : result.value.error
        )
      }
    } catch (error) {
      console.error('Error sending batch notifications:', error)
      return {
        successful: 0,
        failed: userIds.length,
        total: userIds.length,
        errors: [error]
      }
    }
  }
}

// Convenience functions for common notification patterns
export const sendEventReminder = (userId: string, eventTitle: string, eventDate: string) =>
  notificationUtils.sendEventNotification(userId, eventTitle, eventDate)

export const sendDailyQuestion = (userId: string, questionText: string) =>
  notificationUtils.sendDailyQuestionNotification(userId, questionText)

export const sendQuizInvite = (senderId: string, receiverId: string, quizTitle?: string, message?: string) =>
  notificationUtils.sendQuizInvite(senderId, receiverId, undefined, message)

export const sendCoupleUpdate = (userId: string, updateType: string, message: string) =>
  notificationUtils.sendCoupleUpdateNotification(userId, updateType, message)

export const sendUrgentAlert = (userId: string, title: string, message: string) =>
  notificationUtils.sendUrgentNotification(userId, title, message)

export const sendReminder = (userId: string, title: string, message: string) =>
  notificationUtils.sendReminderNotification(userId, title, message)

export const sendInfo = (userId: string, title: string, message: string) =>
  notificationUtils.sendInfoNotification(userId, title, message)
