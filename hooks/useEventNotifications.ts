import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { Event, eventNotificationService } from '../lib/eventNotificationService'

export const useEventNotifications = () => {
  const { user } = useAuth()
  const [isChecking, setIsChecking] = useState(false)
  const [lastCheckResult, setLastCheckResult] = useState<{
    eventsFound: number
    notificationsSent: number
    errors: string[]
    timestamp: Date
  } | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])

  // Check for tomorrow's events and send notifications
  const checkTomorrowEvents = useCallback(async () => {
    if (!user?.id) {
      console.log('⚠️ User not authenticated, skipping event check')
      return
    }

    setIsChecking(true)
    try {
      console.log('🚀 Starting automatic event check...')
      
      const result = await eventNotificationService.checkTomorrowEventsAndNotify()
      
      setLastCheckResult({
        ...result,
        timestamp: new Date()
      })
      
      if (result.notificationsSent > 0) {
        console.log(`🎉 Successfully sent ${result.notificationsSent} notifications for ${result.eventsFound} events`)
      } else if (result.eventsFound > 0) {
        console.log(`📋 Found ${result.eventsFound} events but no new notifications were needed`)
      } else {
        console.log('📭 No events found for tomorrow')
      }
      
      if (result.errors.length > 0) {
        console.warn(`⚠️ ${result.errors.length} errors occurred during event check`)
        result.errors.forEach(error => console.error('Error:', error))
      }
      
    } catch (error) {
      console.error('❌ Error in checkTomorrowEvents:', error)
      setLastCheckResult({
        eventsFound: 0,
        notificationsSent: 0,
        errors: [error.message],
        timestamp: new Date()
      })
    } finally {
      setIsChecking(false)
    }
  }, [user?.id])

  // Get upcoming events for the current user
  const getUpcomingEvents = useCallback(async () => {
    if (!user?.id) return

    try {
      const result = await eventNotificationService.getUpcomingEvents(user.id)
      if (!result.error && result.data) {
        setUpcomingEvents(result.data)
      }
    } catch (error) {
      console.error('❌ Error getting upcoming events:', error)
    }
  }, [user?.id])

  // Auto-check when the hook is first used
  useEffect(() => {
    if (user?.id) {
      checkTomorrowEvents()
      getUpcomingEvents()
    }
  }, [user?.id, checkTomorrowEvents, getUpcomingEvents])

  // Refresh upcoming events
  const refreshUpcomingEvents = useCallback(() => {
    getUpcomingEvents()
  }, [getUpcomingEvents])

  // Manual check for tomorrow's events
  const manualCheck = useCallback(() => {
    checkTomorrowEvents()
  }, [checkTomorrowEvents])

  return {
    // State
    isChecking,
    lastCheckResult,
    upcomingEvents,
    
    // Actions
    checkTomorrowEvents,
    manualCheck,
    refreshUpcomingEvents,
    
    // Computed values
    hasUpcomingEvents: upcomingEvents.length > 0,
    nextEvent: upcomingEvents[0] || null,
         eventsThisWeek: upcomingEvents.filter(event => {
       const eventDate = new Date(event.event_date)
       const weekFromNow = new Date()
       weekFromNow.setDate(weekFromNow.getDate() + 7)
       return eventDate <= weekFromNow
     }).length
  }
}
