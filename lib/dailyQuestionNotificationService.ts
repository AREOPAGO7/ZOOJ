import { toLocalDateString } from './dateUtils'
import { notificationService } from './notificationService'
import { profileService } from './profileService'
import { supabase } from './supabase'

export interface DailyQuestionNotification {
  id: string
  couple_id: string
  question_id: string
  scheduled_for: string
  created_at: string
  question?: {
    id: string
    content: string
    created_at: string
    scheduled_time: string
  }
}

export const dailyQuestionNotificationService = {
  // Check for new daily questions created today and send notifications to couples
  async checkNewDailyQuestionsAndNotify(): Promise<{ 
    questionsFound: number; 
    notificationsSent: number; 
    errors: string[] 
  }> {
    try {
      console.log('🔍 Checking for new daily questions created today...')
      
      // Get today's date
      const today = toLocalDateString(new Date())
      console.log('📅 Today date:', today)
      
      // Find all daily questions created today
      const { data: dailyQuestions, error: questionsError } = await supabase
        .from('daily_questions')
        .select(`
          *,
          question:questions(*),
          couples!inner(
            user1_id,
            user2_id
          )
        `)
        .gte('created_at', today)
        .lt('created_at', toLocalDateString(new Date(new Date().getTime() + 24 * 60 * 60 * 1000)))
      
      if (questionsError) {
        console.error('❌ Error fetching today\'s daily questions:', questionsError)
        return { questionsFound: 0, notificationsSent: 0, errors: [questionsError.message] }
      }
      
      if (!dailyQuestions || dailyQuestions.length === 0) {
        console.log('📭 No new daily questions found for today')
        return { questionsFound: 0, notificationsSent: 0, errors: [] }
      }
      
      console.log(`📋 Found ${dailyQuestions.length} new daily questions for today`)
      
      let notificationsSent = 0
      const errors: string[] = []
      
      // Process each daily question and send notifications to both couple members
      for (const dailyQuestion of dailyQuestions) {
        try {
          const couple = dailyQuestion.couples
          if (!couple || !couple.user1_id || !couple.user2_id) {
            console.warn('⚠️ Daily question has invalid couple data:', dailyQuestion.id)
            continue
          }
          
          // Check if notifications were already sent for this daily question today
          const alreadyNotified = await this.checkIfAlreadyNotified(dailyQuestion.id, 'new_daily_question')
          if (alreadyNotified) {
            console.log(`✅ Notifications already sent for daily question: ${dailyQuestion.question?.content || dailyQuestion.id}`)
            continue
          }
          
          // Send notification to user1
          const user1Result = await this.sendDailyQuestionNotification(
            couple.user1_id,
            dailyQuestion,
            couple.user2_id
          )
          
          // Send notification to user2
          const user2Result = await this.sendDailyQuestionNotification(
            couple.user2_id,
            dailyQuestion,
            couple.user1_id
          )
          
          if (user1Result && user2Result) {
            notificationsSent += 2
            console.log(`✅ Notifications sent for daily question: ${dailyQuestion.question?.content || dailyQuestion.id}`)
            
            // Mark that notifications were sent for this daily question
            await this.markDailyQuestionAsNotified(dailyQuestion.id, 'new_daily_question')
          } else {
            const errorMsg = `Failed to send notifications for daily question: ${dailyQuestion.question?.content || dailyQuestion.id}`
            console.error('❌', errorMsg)
            errors.push(errorMsg)
          }
          
        } catch (error) {
          const errorMsg = `Error processing daily question ${dailyQuestion.id}: ${error}`
          console.error('❌', errorMsg)
          errors.push(errorMsg)
        }
      }
      
      console.log(`🎯 Daily question check complete: ${dailyQuestions.length} questions found, ${notificationsSent} notifications sent`)
      return { questionsFound: dailyQuestions.length, notificationsSent, errors }
      
    } catch (error) {
      console.error('❌ Fatal error in checkNewDailyQuestionsAndNotify:', error)
      return { questionsFound: 0, notificationsSent: 0, errors: [error.message] }
    }
  },
  
  // Send daily question notification to a specific user
  async sendDailyQuestionNotification(
    userId: string, 
    dailyQuestion: DailyQuestionNotification, 
    partnerId: string
  ): Promise<boolean> {
    try {
      // Get partner's name for the notification
      const { data: partnerProfile } = await profileService.getProfile(partnerId)
      const partnerName = partnerProfile?.name || 'Votre partenaire'
      
      // Get the question content
      const questionContent = dailyQuestion.question?.content || 'Nouvelle question quotidienne'
      
      // Create notification message
      const title = 'Nouvelle question quotidienne'
      const message = `${partnerName} a une nouvelle question pour vous aujourd'hui : "${questionContent}"`
      
      // Send the notification
      const result = await notificationService.createNotification({
        user_id: userId,
        title,
        message,
        type: 'daily_question',
        data: {
          dailyQuestionId: dailyQuestion.id,
          questionId: dailyQuestion.question_id,
          questionContent,
          scheduledFor: dailyQuestion.scheduled_for,
          partnerName,
          notificationType: 'new_daily_question'
        },
        priority: 'normal'
      })
      
      return !result.error
      
    } catch (error) {
      console.error('❌ Error sending daily question notification:', error)
      return false
    }
  },
  
  // Check if notifications were already sent for this daily question today
  async checkIfAlreadyNotified(dailyQuestionId: string, notificationType: string): Promise<boolean> {
    try {
      const today = toLocalDateString(new Date())
      
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('data->dailyQuestionId', dailyQuestionId)
        .eq('data->notificationType', notificationType)
        .gte('created_at', today)
        .limit(1)
      
      return existingNotifications && existingNotifications.length > 0
      
    } catch (error) {
      console.error('❌ Error checking if already notified:', error)
      return false
    }
  },
  
  // Mark daily question as notified to prevent duplicate notifications
  async markDailyQuestionAsNotified(dailyQuestionId: string, notificationType: string): Promise<void> {
    try {
      // This could be stored in a separate table or in the daily question data
      // For now, we'll use the notifications table as a log
      console.log(`📝 Marked daily question ${dailyQuestionId} as notified for ${notificationType}`)
    } catch (error) {
      console.error('❌ Error marking daily question as notified:', error)
    }
  },
  
  // Get all daily questions created today for a specific couple
  async getTodayDailyQuestions(coupleId: string): Promise<{ data: DailyQuestionNotification[] | null; error: any }> {
    try {
      const today = toLocalDateString(new Date())
      
      const { data, error } = await supabase
        .from('daily_questions')
        .select(`
          *,
          question:questions(*)
        `)
        .eq('couple_id', coupleId)
        .gte('created_at', today)
        .lt('created_at', toLocalDateString(new Date(new Date().getTime() + 24 * 60 * 60 * 1000)))
        .order('created_at', { ascending: false })
      
      return { data, error }
      
    } catch (error) {
      console.error('❌ Error getting today\'s daily questions:', error)
      return { data: null, error }
    }
  },
  
  // Manual trigger to check and send notifications (for testing or manual execution)
  async manualCheck(): Promise<{ 
    questionsFound: number; 
    notificationsSent: number; 
    errors: string[] 
  }> {
    console.log('🚀 Manual daily question notification check triggered...')
    return await this.checkNewDailyQuestionsAndNotify()
  }
}
