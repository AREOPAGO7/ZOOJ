import { toLocalDateString } from './dateUtils';
import { notificationService } from './notificationService';
import { profileService } from './profileService';
import { supabase } from './supabase';

// Helper function to get translated event reminder messages
const getEventReminderMessage = (language: string = 'fr'): { title: string; partnerName: string; messageTemplate: string } => {
  switch (language) {
    case 'en':
      return {
        title: 'Event reminder tomorrow',
        partnerName: 'Your partner',
        messageTemplate: '{partnerName} has an event tomorrow{timeInfo}: {eventTitle}'
      };
    case 'ar':
      return {
        title: 'تذكير بحدث غداً',
        partnerName: 'شريكك',
        messageTemplate: '{partnerName} لديه حدث غداً{timeInfo}: {eventTitle}'
      };
    case 'ma':
      return {
        title: 'تذكير بإيفان غدا',
        partnerName: 'شريكك',
        messageTemplate: '{partnerName} عندو إيفان غدا{timeInfo}: {eventTitle}'
      };
    case 'fr':
    default:
      return {
        title: 'Rappel d\'événement demain',
        partnerName: 'Votre partenaire',
        messageTemplate: '{partnerName} a un événement demain{timeInfo}: {eventTitle}'
      };
  }
};

export interface Event {
  id: string
  title: string
  description?: string
  event_date: string
  event_time?: string
  place?: string
  couple_id: string
  alarmable: boolean
  created_at: string
}

export const eventNotificationService = {
  // Cache pour éviter les vérifications répétées dans la même session
  _notificationCache: new Map<string, { timestamp: number; sent: boolean }>(),
  
  // Check for events tomorrow and send notifications
  async checkTomorrowEventsAndNotify(language: string = 'fr'): Promise<{ 
    eventsFound: number; 
    notificationsSent: number; 
    errors: string[] 
  }> {
    try {
      console.log('🔍 Checking for events tomorrow...')
      
      // Get tomorrow's date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowDate = toLocalDateString(tomorrow) // YYYY-MM-DD format
      
      console.log('📅 Tomorrow date:', tomorrowDate)
      
      // Find all events for tomorrow
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select(`
          *,
          couples!inner(
            user1_id,
            user2_id
          )
        `)
        .gte('event_date', tomorrowDate)
        .lt('event_date', toLocalDateString(new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)))
      
      if (eventsError) {
        console.error('❌ Error fetching tomorrow events:', eventsError)
        return { eventsFound: 0, notificationsSent: 0, errors: [eventsError.message] }
      }
      
      if (!events || events.length === 0) {
        console.log('📭 No events found for tomorrow')
        return { eventsFound: 0, notificationsSent: 0, errors: [] }
      }
      
      console.log(`📋 Found ${events.length} events for tomorrow`)
      
      let notificationsSent = 0
      const errors: string[] = []
      
      // Process each event and send notifications to both couple members
      for (const event of events) {
        try {
          const couple = event.couples
          if (!couple || !couple.user1_id || !couple.user2_id) {
            console.warn('⚠️ Event has invalid couple data:', event.id)
            continue
          }
          
          // Check if event is alarmable
          if (!event.alarmable) {
            console.log(`🔕 Event "${event.title}" is not alarmable, skipping notifications`)
            continue
          }
          
          // Check if notifications were already sent for this event today
          console.log(`🔍 Checking if notifications already sent for event: ${event.title} (ID: ${event.id})`)
          const alreadyNotified = await this.checkIfAlreadyNotified(event.id, 'tomorrow_reminder')
          if (alreadyNotified) {
            console.log(`✅ Notifications already sent for event: ${event.title}`)
            continue
          }
          
          // Additional cache check for this session
          const cacheKey = `${event.id}_${tomorrowDate}_tomorrow_reminder`
          const cached = this._notificationCache.get(cacheKey)
          if (cached && cached.sent) {
            console.log(`✅ Event "${event.title}" already processed in this session`)
            continue
          }
          
          // Send notification to user1
          const user1Result = await this.sendTomorrowEventNotification(
            couple.user1_id,
            event,
            couple.user2_id,
            language
          )
          
          // Send notification to user2
          const user2Result = await this.sendTomorrowEventNotification(
            couple.user2_id,
            event,
            couple.user1_id,
            language
          )
          
          if (user1Result && user2Result) {
            notificationsSent += 2
            console.log(`✅ Notifications sent for event: ${event.title}`)
            
            // Mark that notifications were sent for this event
            await this.markEventAsNotified(event.id, 'tomorrow_reminder')
            
            // Update cache
            this._notificationCache.set(cacheKey, { 
              timestamp: Date.now(), 
              sent: true 
            })
          } else {
            const errorMsg = `Failed to send notifications for event: ${event.title}`
            console.error('❌', errorMsg)
            errors.push(errorMsg)
          }
          
        } catch (error) {
          const errorMsg = `Error processing event ${event.id}: ${error}`
          console.error('❌', errorMsg)
          errors.push(errorMsg)
        }
      }
      
      console.log(`🎯 Event check complete: ${events.length} events found, ${notificationsSent} notifications sent`)
      return { eventsFound: events.length, notificationsSent, errors }
      
    } catch (error) {
      console.error('❌ Fatal error in checkTomorrowEventsAndNotify:', error)
      return { eventsFound: 0, notificationsSent: 0, errors: [error.message] }
    }
  },
  
  // Send tomorrow event notification to a specific user
  async sendTomorrowEventNotification(
    userId: string, 
    event: Event, 
    partnerId: string,
    language: string = 'fr'
  ): Promise<boolean> {
    try {
      // Get partner's name for the notification
      const { data: partnerProfile } = await profileService.getProfile(partnerId)
      const { title: reminderTitle, partnerName: defaultPartnerName, messageTemplate } = getEventReminderMessage(language)
      const partnerName = partnerProfile?.name || defaultPartnerName
      
      // Format the event time if available
      let timeInfo = ''
      if (event.event_time) {
        timeInfo = ` à ${event.event_time}`
      }
      
      // Create notification message
      const title = reminderTitle
      const message = messageTemplate
        .replace('{partnerName}', partnerName)
        .replace('{timeInfo}', timeInfo)
        .replace('{eventTitle}', event.title)
      
      // Send the notification
      const result = await notificationService.createNotification({
        user_id: userId,
        title,
        message,
        type: 'event',
        data: {
          eventId: event.id,
          eventTitle: event.title,
          eventDate: event.event_date,
          eventTime: event.event_time,
          eventLocation: event.place,
          partnerName,
          reminderType: 'tomorrow'
        },
        priority: 'high'
      })
      
      return !result.error
      
    } catch (error) {
      console.error('❌ Error sending tomorrow event notification:', error)
      return false
    }
  },
  
  // Check if notifications were already sent for this event today
  async checkIfAlreadyNotified(eventId: string, reminderType: string): Promise<boolean> {
    try {
      const today = toLocalDateString(new Date())
      
      // Check cache first for performance
      const cacheKey = `${eventId}_${today}_${reminderType}`
      const cached = this._notificationCache.get(cacheKey)
      if (cached && cached.sent) {
        console.log(`✅ Cache hit: Event ${eventId} already processed today`)
        return true
      }
      
      console.log(`🔍 Checking database for existing notifications for event ${eventId}...`)
      
      // Check database for existing notifications with multiple approaches
      let alreadyNotified = false
      
      // Approach 1: Check by eventId and reminderType in data
      const { data: existingNotifications1, error: error1 } = await supabase
        .from('notifications')
        .select('id, title, message, data, created_at')
        .eq('type', 'event')
        .gte('created_at', today)
        .limit(10)
      
      if (error1) {
        console.error('❌ Error in first database check:', error1)
      } else {
        console.log(`📋 Found ${existingNotifications1?.length || 0} event notifications today`)
        
        // Check if any notification matches our event
        const matchingNotification = existingNotifications1?.find(notification => {
          try {
            const notificationData = notification.data
            return notificationData && 
                   notificationData.eventId === eventId && 
                   notificationData.reminderType === reminderType
          } catch (e) {
            return false
          }
        })
        
        if (matchingNotification) {
          console.log(`✅ Found existing notification for event ${eventId}:`, matchingNotification.id)
          alreadyNotified = true
        }
      }
      
      // Approach 2: If first approach didn't find anything, try a broader search
      if (!alreadyNotified) {
        console.log(`🔍 Trying broader search for event ${eventId}...`)
        
        const { data: existingNotifications2, error: error2 } = await supabase
          .from('notifications')
          .select('id, title, message, data, created_at')
          .eq('type', 'event')
          .gte('created_at', today)
          .limit(50)
        
        if (error2) {
          console.error('❌ Error in second database check:', error2)
        } else {
          // Check if any notification contains our eventId in the data
          const matchingNotification = existingNotifications2?.find(notification => {
            try {
              const notificationData = notification.data
              return notificationData && notificationData.eventId === eventId
            } catch (e) {
              return false
            }
          })
          
          if (matchingNotification) {
            console.log(`✅ Found existing notification for event ${eventId} (broader search):`, matchingNotification.id)
            alreadyNotified = true
          }
        }
      }
      
      // Update cache
      if (alreadyNotified) {
        this._notificationCache.set(cacheKey, { 
          timestamp: Date.now(), 
          sent: true 
        })
        console.log(`📝 Updated cache for event ${eventId}`)
      } else {
        console.log(`📭 No existing notification found for event ${eventId}`)
      }
      
      return alreadyNotified
      
    } catch (error) {
      console.error('❌ Error checking if already notified:', error)
      return false
    }
  },
  
  // Mark event as notified to prevent duplicate notifications
  async markEventAsNotified(eventId: string, reminderType: string): Promise<void> {
    try {
      // This could be stored in a separate table or in the event data
      // For now, we'll use the notifications table as a log
      console.log(`📝 Marked event ${eventId} as notified for ${reminderType}`)
      
      // Update cache
      const today = toLocalDateString(new Date())
      const cacheKey = `${eventId}_${today}_${reminderType}`
      this._notificationCache.set(cacheKey, { 
        timestamp: Date.now(), 
        sent: true 
      })
      
    } catch (error) {
      console.error('❌ Error marking event as notified:', error)
    }
  },
  
  // Clear cache (useful for testing or when cache becomes stale)
  clearCache(): void {
    this._notificationCache.clear()
    console.log('🧹 Notification cache cleared')
  },
  
  // Get cache status for debugging
  getCacheStatus(): { size: number; entries: Array<{ key: string; value: any }> } {
    const entries = Array.from(this._notificationCache.entries()).map(([key, value]) => ({
      key,
      value
    }))
    
    return {
      size: this._notificationCache.size,
      entries
    }
  },
  
  // Get upcoming events for a user (next 7 days)
  async getUpcomingEvents(userId: string): Promise<{ data: Event[] | null; error: any }> {
    try {
      const today = new Date()
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select(`
          *,
          couples!inner(
            user1_id,
            user2_id
          )
        `)
        .gte('event_date', toLocalDateString(today))
        .lte('event_date', toLocalDateString(nextWeek))
        .or(`couples.user1_id.eq.${userId},couples.user2_id.eq.${userId}`)
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true })
      
      return { data, error }
      
    } catch (error) {
      console.error('❌ Error getting upcoming events:', error)
      return { data: null, error }
    }
  }
}
