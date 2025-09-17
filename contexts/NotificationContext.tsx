import { useAuth } from '@/lib/auth'
import { DailyQuestionNotification, dailyQuestionNotificationService } from '@/lib/dailyQuestionNotificationService'
import { Notification, notificationService, NotificationSettings } from '@/lib/notificationService'
import { Pulse, pulseService } from '@/lib/pulseService'
import { SimpleChatNotification, simpleChatNotificationService } from '@/lib/simpleChatNotificationService'
import { supabase } from '@/lib/supabase'
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react'

interface ChatNotification {
  id: string
  thread_id: string
  message_id: string
  sender_id: string
  receiver_id: string
  question_id: string
  question_content: string
  sender_name: string
  message_preview: string
  is_read: boolean
  is_delivered: boolean
  created_at: string
  expires_at: string
  updated_at: string
}

interface NotificationContextType {
  notifications: Notification[]
  chatNotifications: SimpleChatNotification[]
  chatNotificationsTable: ChatNotification[]
  dailyQuestionNotifications: DailyQuestionNotification[]
  pulses: Pulse[]
  unreadCount: number
  chatUnreadCount: number
  chatNotificationsTableUnreadCount: number
  dailyQuestionUnreadCount: number
  pulseUnreadCount: number
  notificationSettings: NotificationSettings | null
  isLoading: boolean
  refreshNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markChatAsRead: (notificationId: string) => Promise<void>
  markDailyQuestionAsRead: (notificationId: string) => Promise<void>
  markPulseAsRead: (pulseId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  // Daily question notifications cannot be deleted (they're global)
  deleteAllNotifications: () => Promise<void>
  updateNotificationSettings: (updates: Partial<NotificationSettings>) => Promise<void>
  createNotification: (notificationData: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'is_deleted'>) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [chatNotifications, setChatNotifications] = useState<SimpleChatNotification[]>([])
  const [chatNotificationsTable, setChatNotificationsTable] = useState<ChatNotification[]>([])
  const [dailyQuestionNotifications, setDailyQuestionNotifications] = useState<DailyQuestionNotification[]>([])
  const [pulses, setPulses] = useState<Pulse[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [chatNotificationsTableUnreadCount, setChatNotificationsTableUnreadCount] = useState(0)
  const [dailyQuestionUnreadCount, setDailyQuestionUnreadCount] = useState(0)
  const [pulseUnreadCount, setPulseUnreadCount] = useState(0)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const refreshNotifications = async () => {
    if (!user?.id) return

    setIsLoading(true)
    try {
      // Get couple ID first
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      const coupleId = coupleData?.id

      const [notificationsResult, unreadResult, chatNotificationsResult, chatNotificationsTableResult, dailyQuestionResult, dailyQuestionUnreadResult, pulsesResult, settingsResult] = await Promise.all([
        notificationService.getNotifications(user.id),
        notificationService.getUnreadCount(user.id),
        coupleId ? simpleChatNotificationService.getNotifications(user.id, coupleId, 3) : Promise.resolve({ data: [], error: null }),
        supabase
          .from('chat_notifications')
          .select('*')
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(20),
        dailyQuestionNotificationService.getDailyQuestionNotifications(user.id),
        dailyQuestionNotificationService.getUnreadCount(user.id),
        supabase
          .from('pulses')
          .select('*')
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        notificationService.getNotificationSettings(user.id)
      ])


      if (notificationsResult.data) {
        setNotifications(notificationsResult.data)
      }
      if (unreadResult.data !== null) {
        setUnreadCount(unreadResult.data)
      }
      if (chatNotificationsResult.data) {
        console.log('NotificationContext: Fetched simple chat notifications:', chatNotificationsResult.data.length);
        console.log('NotificationContext: Simple chat notifications data:', chatNotificationsResult.data);
        setChatNotifications(chatNotificationsResult.data)
        // Set chat unread count to the number of notifications (since we don't have read/unread status)
        setChatUnreadCount(chatNotificationsResult.data.length)
      }
      if (chatNotificationsResult.error) {
        console.error('Error fetching simple chat notifications:', chatNotificationsResult.error)
      }
      
      if (chatNotificationsTableResult.data) {
        console.log('NotificationContext: Fetched chat notifications table:', chatNotificationsTableResult.data.length);
        setChatNotificationsTable(chatNotificationsTableResult.data)
        setChatNotificationsTableUnreadCount(chatNotificationsTableResult.data.length)
      }
      if (dailyQuestionResult.data) {
        setDailyQuestionNotifications(dailyQuestionResult.data)
      }
      if (dailyQuestionUnreadResult.data !== null) {
        setDailyQuestionUnreadCount(dailyQuestionUnreadResult.data)
      }
      
      if (pulsesResult.data) {
        console.log('NotificationContext: Fetched pulses:', pulsesResult.data.length);
        setPulses(pulsesResult.data)
        setPulseUnreadCount(pulsesResult.data.length)
      }
      if (pulsesResult.error) {
        console.error('Error fetching pulses:', pulsesResult.error)
      }
      
      if (settingsResult.data) {
        setNotificationSettings(settingsResult.data)
      }
    } catch (error) {
      console.error('Error refreshing notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return

    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markChatAsRead = async (notificationId: string) => {
    if (!user?.id) return

    try {
      // For simple chat notifications, we just delete them when "read"
      await simpleChatNotificationService.deleteNotification(notificationId)
      setChatNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      setChatUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking chat notification as read:', error)
    }
  }

  const markDailyQuestionAsRead = async (notificationId: string) => {
    if (!user?.id) return

    try {
      await dailyQuestionNotificationService.markAsRead(notificationId)
      setDailyQuestionNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      )
      setDailyQuestionUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking daily question notification as read:', error)
    }
  }

  const markPulseAsRead = async (pulseId: string) => {
    if (!user?.id) return

    try {
      await pulseService.markPulseAsRead(pulseId)
      setPulses(prev => 
        prev.map(pulse => 
          pulse.id === pulseId ? { ...pulse, is_read: true } : pulse
        )
      )
      setPulseUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking pulse as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return

    try {
      // Get couple ID for chat notifications
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      const coupleId = coupleData?.id

      await Promise.all([
        notificationService.markAllAsRead(user.id),
        coupleId ? simpleChatNotificationService.deleteAllNotifications(coupleId) : Promise.resolve(),
        supabase
          .from('chat_notifications')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false),
        dailyQuestionNotificationService.markAllAsRead(user.id),
        supabase
          .from('pulses')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false)
      ])
      
      setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
      setChatNotifications([]) // Clear all chat notifications
      setChatNotificationsTable(prev => prev.map(notif => ({ ...notif, is_read: true })))
      setDailyQuestionNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })))
      setPulses(prev => prev.map(pulse => ({ ...pulse, is_read: true })))
      setUnreadCount(0)
      setChatUnreadCount(0)
      setChatNotificationsTableUnreadCount(0)
      setDailyQuestionUnreadCount(0)
      setPulseUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user?.id) return

    try {
      await notificationService.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
      // Update unread count if the deleted notification was unread
      const deletedNotif = notifications.find(n => n.id === notificationId)
      if (deletedNotif && !deletedNotif.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Daily question notifications cannot be deleted (they're global)

  const deleteAllNotifications = async () => {
    if (!user?.id) return

    try {
      // Get couple ID for chat notifications
      const { data: coupleData } = await supabase
        .from('couples')
        .select('id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .single()

      const coupleId = coupleData?.id

      // Delete regular notifications
      await notificationService.deleteAllNotifications(user.id)
      
      // Delete simple chat notifications for the couple
      if (coupleId) {
        await simpleChatNotificationService.deleteAllNotifications(coupleId)
      }

      // Delete chat notifications table
      await supabase
        .from('chat_notifications')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)

      // Delete daily question notifications
      await dailyQuestionNotificationService.deleteAllNotifications(user.id)
      
      // Mark all pulses as read
      await supabase
        .from('pulses')
        .update({ is_read: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)
      
      setNotifications([])
      setChatNotifications([])
      setChatNotificationsTable([])
      setDailyQuestionNotifications([])
      setPulses([])
      setUnreadCount(0)
      setChatUnreadCount(0)
      setChatNotificationsTableUnreadCount(0)
      setDailyQuestionUnreadCount(0)
      setPulseUnreadCount(0)
    } catch (error) {
      console.error('Error deleting all notifications:', error)
    }
  }

  const updateNotificationSettings = async (updates: Partial<NotificationSettings>) => {
    if (!user?.id) return

    try {
      const result = await notificationService.updateNotificationSettings(user.id, updates)
      if (result.data) {
        setNotificationSettings(result.data)
      }
    } catch (error) {
      console.error('Error updating notification settings:', error)
    }
  }

  const createNotification = async (notificationData: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'is_deleted'>) => {
    if (!user?.id) return

    try {
      const result = await notificationService.createNotification(notificationData)
      if (result.data) {
        setNotifications(prev => [result.data!, ...prev])
        if (!result.data.is_read) {
          setUnreadCount(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Error creating notification:', error)
    }
  }

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification
            setNotifications(prev => 
              prev.map(notif => 
                notif.id === updatedNotification.id ? updatedNotification : notif
              )
            )
            // Update unread count
            if (updatedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedNotification = payload.old as Notification
            setNotifications(prev => prev.filter(notif => notif.id !== deletedNotification.id))
            if (!deletedNotification.is_read) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  // Initial load
  useEffect(() => {
    if (user?.id) {
      refreshNotifications()
    }
  }, [user?.id])

  const value: NotificationContextType = {
    notifications,
    chatNotifications,
    chatNotificationsTable,
    dailyQuestionNotifications,
    pulses,
    unreadCount,
    chatUnreadCount,
    chatNotificationsTableUnreadCount,
    dailyQuestionUnreadCount,
    pulseUnreadCount,
    notificationSettings,
    isLoading,
    refreshNotifications,
    markAsRead,
    markChatAsRead,
    markDailyQuestionAsRead,
    markPulseAsRead,
    markAllAsRead,
    deleteNotification,
    // deleteDailyQuestionNotification removed - daily question notifications are global
    deleteAllNotifications,
    updateNotificationSettings,
    createNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}
