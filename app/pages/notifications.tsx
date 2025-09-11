import { useDarkTheme } from '@/contexts/DarkThemeContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/lib/auth'
import { DailyQuestionNotification } from '@/lib/dailyQuestionNotificationService'
import { Notification } from '@/lib/notificationService'
import { PulseWithSender, pulseService } from '@/lib/pulseService'
import { SimpleChatNotification } from '@/lib/simpleChatNotificationService'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import AppLayout from '../app-layout'
// Helper function to format relative time without external dependencies
const formatRelativeTime = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'À l\'instant'
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`
  if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`
  if (diffInSeconds < 31536000) return `Il y a ${Math.floor(diffInSeconds / 2592000)} mois`
  return `Il y a ${Math.floor(diffInSeconds / 31536000)} an`
}

const NotificationItem: React.FC<{
  notification: Notification | SimpleChatNotification | PulseWithSender | DailyQuestionNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  isChatNotification?: boolean
  isPulse?: boolean
  isDailyQuestion?: boolean
}> = ({ notification, onMarkAsRead, onDelete, isChatNotification = false, isPulse = false, isDailyQuestion = false }) => {
  const { colors } = useTheme()
  const { isDarkMode } = useDarkTheme()

  const getIconName = () => {
    if (isPulse) {
      return 'heart'
    }
    
    if (isDailyQuestion) {
      return 'help-circle'
    }
    
    if (isChatNotification) {
      return 'chat'
    }
    
    switch (notification.type) {
      case 'event':
        return 'calendar'
      case 'daily_question':
        return 'chat-question'
      case 'quiz_invite':
        return 'heart'
      case 'couple_update':
        return 'account-group'
      default:
        return 'bell'
    }
  }

  const getIconColor = () => {
    if (isPulse) {
      return '#FF69B4' // Hot pink for pulses
    }
    
    if (isDailyQuestion) {
      return '#FF6B35' // Orange for daily questions
    }
    
    if (isChatNotification) {
      return '#F47CC6' // Pink for chat notifications
    }
    
    switch (notification.type) {
      case 'event':
        return '#2DB6FF' // Blue
      case 'daily_question':
        return '#F47CC6' // Pink
      case 'quiz_invite':
        return '#FF69B4' // Hot pink
      case 'couple_update':
        return '#87CEEB' // Light blue
      default:
        return '#2DB6FF' // Default blue
    }
  }

  const getPriorityColor = () => {
    switch (notification.priority) {
      case 'urgent':
        return '#FF69B4' // Hot pink
      case 'high':
        return '#2DB6FF' // Blue
      case 'low':
        return '#87CEEB' // Light blue
      default:
        return '#2DB6FF' // Default blue
    }
  }

  const handlePress = () => {
    if (isPulse) {
      // For pulses, check is_read
      if (!(notification as PulseWithSender).is_read) {
        onMarkAsRead(notification.id)
      }
      return
    }
    
    if (isDailyQuestion) {
      // For daily question notifications, check is_read
      if (!(notification as DailyQuestionNotification).is_read) {
        onMarkAsRead(notification.id)
      }
      router.push('/pages/questions')
      return
    }
    
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }
    
    // Handle navigation based on notification type
    
    if (isChatNotification) {
      // Navigate to the specific question chat
      const chatNotification = notification as SimpleChatNotification
      if (chatNotification.question_id) {
        router.push(`/pages/question-chat?questionId=${chatNotification.question_id}`)
      } else {
        router.push('/pages/questions')
      }
    } else {
      switch (notification.type) {
        case 'event':
          router.push('/pages/calendrier')
          break
        case 'daily_question':
          router.push('/pages/questions')
          break
        case 'quiz_invite':
          router.push('/pages/quizz')
          break
        case 'couple_update':
          router.push('/pages/notre-couple')
          break
        default:
          break
      }
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF',
          borderLeftColor: getIconColor(),
          borderLeftWidth: 4,
        }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons
            name={getIconName() as any}
            size={24}
            color={getIconColor()}
          />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
            {isPulse 
              ? `${(notification as PulseWithSender).sender_name} vous a envoyé un pulse`
              : isDailyQuestion
                ? 'Question du Jour'
                : isChatNotification 
                  ? 'Nouveau message' 
                  : notification.title
            }
          </Text>
          <Text style={[styles.message, { color: isDarkMode ? '#CCCCCC' : '#666666' }]}>
            {isPulse 
              ? `${(notification as PulseWithSender).emoji}${(notification as PulseWithSender).message ? ` - ${(notification as PulseWithSender).message}` : ''}`
              : isDailyQuestion
                ? (notification as DailyQuestionNotification).question_content
                : isChatNotification 
                  ? (notification as SimpleChatNotification).message_preview || 'Nouveau message'
                  : notification.message
            }
          </Text>
          <Text style={[styles.timestamp, { color: isDarkMode ? '#999999' : '#999999' }]}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}


export default function NotificationsPage() {
  const { user } = useAuth()
  const { colors } = useTheme()
  const { isDarkMode } = useDarkTheme()
  const {
    notifications,
    chatNotifications,
    dailyQuestionNotifications,
    unreadCount,
    chatUnreadCount,
    dailyQuestionUnreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markChatAsRead,
    markDailyQuestionAsRead,
    deleteNotification
  } = useNotifications()
  const [pulses, setPulses] = useState<PulseWithSender[]>([])
  const [isLoadingPulses, setIsLoadingPulses] = useState(false)

  // Force refresh notifications when page loads
  React.useEffect(() => {
    refreshNotifications()
  }, [])
  
  // Calculate pulse unread count
  const pulseUnreadCount = pulses.filter(pulse => !pulse.is_read).length

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: (Notification | SimpleChatNotification | PulseWithSender | DailyQuestionNotification)[] } = {}
    
    // Add regular notifications
    notifications.forEach(notification => {
      const date = new Date(notification.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      let groupKey: string
      
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Aujourd\'hui'
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Hier'
      } else {
        const diffTime = Math.abs(today.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays < 7) {
          groupKey = `Il y a ${diffDays} jours`
        } else if (diffDays < 14) {
          groupKey = 'Il y a 1 semaine'
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7)
          groupKey = `Il y a ${weeks} semaines`
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30)
          groupKey = `Il y a ${months} mois`
        } else {
          const years = Math.floor(diffDays / 365)
          groupKey = `Il y a ${years} an${years > 1 ? 's' : ''}`
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(notification)
    })
    
    // Add chat notifications
    chatNotifications.forEach(notification => {
      const date = new Date(notification.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      let groupKey: string
      
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Aujourd\'hui'
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Hier'
      } else {
        const diffTime = Math.abs(today.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays < 7) {
          groupKey = `Il y a ${diffDays} jours`
        } else if (diffDays < 14) {
          groupKey = 'Il y a 1 semaine'
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7)
          groupKey = `Il y a ${weeks} semaines`
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30)
          groupKey = `Il y a ${months} mois`
        } else {
          const years = Math.floor(diffDays / 365)
          groupKey = `Il y a ${years} an${years > 1 ? 's' : ''}`
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(notification)
    })
    
    // Add daily question notifications
    dailyQuestionNotifications.forEach(notification => {
      const date = new Date(notification.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      let groupKey: string
      
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Aujourd\'hui'
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Hier'
      } else {
        const diffTime = Math.abs(today.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays < 7) {
          groupKey = `Il y a ${diffDays} jours`
        } else if (diffDays < 14) {
          groupKey = 'Il y a 1 semaine'
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7)
          groupKey = `Il y a ${weeks} semaines`
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30)
          groupKey = `Il y a ${months} mois`
        } else {
          const years = Math.floor(diffDays / 365)
          groupKey = `Il y a ${years} an${years > 1 ? 's' : ''}`
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(notification)
    })
    
    // Add pulses
    pulses.forEach(pulse => {
      const date = new Date(pulse.created_at)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      let groupKey: string
      
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Aujourd\'hui'
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Hier'
      } else {
        const diffTime = Math.abs(today.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        
        if (diffDays < 7) {
          groupKey = `Il y a ${diffDays} jours`
        } else if (diffDays < 14) {
          groupKey = 'Il y a 1 semaine'
        } else if (diffDays < 30) {
          const weeks = Math.floor(diffDays / 7)
          groupKey = `Il y a ${weeks} semaines`
        } else if (diffDays < 365) {
          const months = Math.floor(diffDays / 30)
          groupKey = `Il y a ${months} mois`
        } else {
          const years = Math.floor(diffDays / 365)
          groupKey = `Il y a ${years} an${years > 1 ? 's' : ''}`
        }
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(pulse)
    })
    
    return groups
  }, [notifications, chatNotifications, pulses])

  // Fetch pulses
  const fetchPulses = async () => {
    if (!user?.id) return
    
    setIsLoadingPulses(true)
    try {
      const { data, error } = await pulseService.getAllPulses(user.id)
      if (error) {
        console.error('Error fetching pulses:', error)
        return
      }
      setPulses(data || [])
    } catch (error) {
      console.error('Error fetching pulses:', error)
    } finally {
      setIsLoadingPulses(false)
    }
  }

  // Fetch pulses on component mount
  React.useEffect(() => {
    fetchPulses()
  }, [])

  // Handle pulse deletion
  const handleDeletePulse = async (pulseId: string) => {
    try {
      const { error } = await pulseService.deletePulse(pulseId)
      if (error) {
        console.error('Error deleting pulse:', error)
        return
      }
      // Remove pulse from local state
      setPulses(prev => prev.filter(p => p.id !== pulseId))
    } catch (error) {
      console.error('Error deleting pulse:', error)
    }
  }



  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="bell-off"
          size={64}
          color="#2DB6FF"
        />
        <MaterialCommunityIcons
          name="heart"
          size={24}
          color="#FF69B4"
          style={styles.emptyHeartIcon}
        />
      </View>
      <Text style={[styles.emptyStateTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
        Aucune notification
      </Text>
      <Text style={[styles.emptyStateMessage, { color: isDarkMode ? '#CCCCCC' : '#7A7A7A' }]}>
        Vous n'avez pas encore de notifications
      </Text>
    </View>
  )

  const renderNotificationGroup = ({ item }: { item: { key: string; data: (Notification | SimpleChatNotification | PulseWithSender | DailyQuestionNotification)[] } }) => {
    return (
      <View style={styles.groupContainer}>
        <Text style={[styles.groupTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>{item.key}</Text>
        {item.data.map((notification) => {
          const isChat = 'couple_id' in notification && 'sender_id' in notification;
          const isPulse = 'emoji' in notification;
          const isDailyQuestion = 'question_content' in notification;
          
          return (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={(id) => {
                // Check if it's a chat notification by looking for couple_id property
                const notification = [...notifications, ...chatNotifications, ...dailyQuestionNotifications, ...pulses].find(n => n.id === id)
                if (notification && 'couple_id' in notification && 'sender_id' in notification) {
                  markChatAsRead(id)
                } else if (notification && 'question_content' in notification) {
                  markDailyQuestionAsRead(id)
                } else if (notification && 'emoji' in notification) {
                  // Handle pulse marking as read
                  setPulses(prev => prev.map(p => p.id === id ? { ...p, is_read: true } : p))
                } else {
                  markAsRead(id)
                }
              }}
              onDelete={(id) => {
                // Check if it's a pulse by looking for emoji property
                const notification = [...notifications, ...chatNotifications, ...dailyQuestionNotifications, ...pulses].find(n => n.id === id)
                if (notification && 'emoji' in notification) {
                  handleDeletePulse(id)
                } else if (notification && 'question_content' in notification) {
                  // Daily question notifications cannot be deleted (they're global)
                } else {
                  deleteNotification(id)
                }
              }}
              isChatNotification={isChat}
              isPulse={isPulse}
              isDailyQuestion={isDailyQuestion}
            />
          );
        })}
      </View>
    );
  }

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-100'}`}>
        {/* Header */}
        <View style={[styles.header, { 
          backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF', 
          borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB',
          paddingTop: 20 // Reduced since AppLayout already provides top margin
        }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={isDarkMode ? '#FFFFFF' : '#2D2D2D'} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
            Notifications
            {(unreadCount + chatUnreadCount + dailyQuestionUnreadCount + pulseUnreadCount) > 0 && (
              <Text style={[styles.unreadCount, { color: '#2DB6FF' }]}>
                {' '}({unreadCount + chatUnreadCount + dailyQuestionUnreadCount + pulseUnreadCount})
              </Text>
            )}
          </Text>
          <TouchableOpacity 
            onPress={refreshNotifications}
            style={{ marginRight: 15 }}
          >
            <MaterialCommunityIcons name="refresh" size={24} color={isDarkMode ? '#FFFFFF' : '#2D2D2D'} />
          </TouchableOpacity>
        </View>



        {/* Notifications List */}
        <FlatList
          data={Object.entries(groupedNotifications).map(([key, data]) => ({ key, data }))}
          keyExtractor={(item) => item.key}
          renderItem={renderNotificationGroup}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refreshNotifications}
              colors={['#2DB6FF']}
              tintColor="#2DB6FF"
            />
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

      </View>
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  unreadCount: {
    fontWeight: '400',
  },
  listContainer: {
    flexGrow: 1,
    padding: 16,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  emptyHeartIcon: {
    position: 'absolute',
    top: 20,
    right: -10,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateMessage: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  groupContainer: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginLeft: 16,
    marginTop: 8,
  },
})
