import { useDarkTheme } from '@/contexts/DarkThemeContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Notification } from '@/lib/notificationService'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Switch,
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
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}> = ({ notification, onMarkAsRead, onDelete }) => {
  const { colors } = useTheme()
  const { isDarkMode } = useDarkTheme()

  const getIconName = () => {
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
    if (!notification.is_read) {
      onMarkAsRead(notification.id)
    }
    
    // Handle navigation based on notification type
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

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: notification.is_read 
            ? (isDarkMode ? '#1A1A1A' : '#FFFFFF') 
            : (isDarkMode ? '#333333' : '#F8F0FF'),
          borderLeftColor: getPriorityColor(),
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
          <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : colors.text }]}>
            {notification.title}
          </Text>
          <Text style={[styles.message, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }]}>
            {notification.message}
          </Text>
          <Text style={[styles.timestamp, { color: isDarkMode ? '#999999' : colors.textTertiary }]}>
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>
        <View style={styles.actionsContainer}>
          {!notification.is_read && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2DB6FF' }]}
              onPress={() => onMarkAsRead(notification.id)}
            >
              <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF69B4' }]}
            onPress={() => onDelete(notification.id)}
          >
            <MaterialCommunityIcons name="delete" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const NotificationSettings: React.FC<{
  visible: boolean
  onClose: () => void
}> = ({ visible, onClose }) => {
  const { colors } = useTheme()
  const { isDarkMode } = useDarkTheme()
  const { notificationSettings, updateNotificationSettings } = useNotifications()

  if (!notificationSettings) return null

  const handleToggle = (key: keyof typeof notificationSettings, value: boolean) => {
    updateNotificationSettings({ [key]: value })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-gray-100'}`}>
        <View style={[styles.settingsHeader, { borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
          <Text style={[styles.settingsTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
            Paramètres des notifications
          </Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color={isDarkMode ? '#FFFFFF' : '#2D2D2D'} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.settingsContent}>
          <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? '#333333' : colors.border }]}>
            <View>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : colors.text }]}>
                Notifications push
              </Text>
              <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : colors.textSecondary }]}>
                Recevoir des notifications push
              </Text>
            </View>
            <Switch
              value={notificationSettings.push_enabled}
              onValueChange={(value) => handleToggle('push_enabled', value)}
              trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#2DB6FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <View>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
                Événements
              </Text>
              <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#7A7A7A' }]}>
                Notifications pour les événements
              </Text>
            </View>
            <Switch
              value={notificationSettings.events_enabled}
              onValueChange={(value) => handleToggle('events_enabled', value)}
              trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#2DB6FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <View>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
                Questions quotidiennes
              </Text>
              <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#7A7A7A' }]}>
                Notifications pour les questions quotidiennes
              </Text>
            </View>
            <Switch
              value={notificationSettings.daily_questions_enabled}
              onValueChange={(value) => handleToggle('daily_questions_enabled', value)}
              trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#2DB6FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <View>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
                Invitations au quiz
              </Text>
              <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#7A7A7A' }]}>
                Notifications pour les invitations au quiz
              </Text>
            </View>
            <Switch
              value={notificationSettings.quiz_invites_enabled}
              onValueChange={(value) => handleToggle('quiz_invites_enabled', value)}
              trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#2DB6FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <View>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
                Mises à jour du couple
              </Text>
              <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#7A7A7A' }]}>
                Notifications pour les mises à jour du couple
              </Text>
            </View>
            <Switch
              value={notificationSettings.couple_updates_enabled}
              onValueChange={(value) => handleToggle('couple_updates_enabled', value)}
              trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#2DB6FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.settingItem, { borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' }]}>
            <View>
              <Text style={[styles.settingLabel, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>
                Notifications générales
              </Text>
              <Text style={[styles.settingDescription, { color: isDarkMode ? '#CCCCCC' : '#7A7A7A' }]}>
                Autres notifications importantes
              </Text>
            </View>
            <Switch
              value={notificationSettings.general_notifications_enabled}
              onValueChange={(value) => handleToggle('general_notifications_enabled', value)}
              trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#2DB6FF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}

export default function NotificationsPage() {
  const { colors } = useTheme()
  const { isDarkMode } = useDarkTheme()
  const {
    notifications,
    unreadCount,
    isLoading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
  } = useNotifications()
  const [settingsVisible, setSettingsVisible] = useState(false)

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {}
    
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
    
    return groups
  }, [notifications])

  const handleDeleteAll = () => {
    Alert.alert(
      'Supprimer toutes les notifications',
      'Êtes-vous sûr de vouloir supprimer toutes les notifications ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: deleteAllNotifications
        }
      ]
    )
  }

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Marquer comme lu',
      'Marquer toutes les notifications comme lues ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Marquer', onPress: markAllAsRead }
      ]
    )
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

  const renderNotificationGroup = ({ item }: { item: { key: string; data: Notification[] } }) => (
    <View style={styles.groupContainer}>
      <Text style={[styles.groupTitle, { color: isDarkMode ? '#FFFFFF' : '#2D2D2D' }]}>{item.key}</Text>
      {item.data.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkAsRead={markAsRead}
          onDelete={deleteNotification}
        />
      ))}
    </View>
  )

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
            {unreadCount > 0 && (
              <Text style={[styles.unreadCount, { color: '#2DB6FF' }]}>
                {' '}({unreadCount})
              </Text>
            )}
          </Text>
          <TouchableOpacity onPress={() => setSettingsVisible(true)}>
            <MaterialCommunityIcons name="cog" size={24} color={isDarkMode ? '#FFFFFF' : '#2D2D2D'} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        {notifications.length > 0 && (
          <View style={[styles.actions, { 
            backgroundColor: isDarkMode ? '#1A1A1A' : '#FFFFFF', 
            borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' 
          }]}>
            <TouchableOpacity
              style={[styles.headerActionButton, { backgroundColor: '#2DB6FF' }]}
              onPress={handleMarkAllAsRead}
            >
              <MaterialCommunityIcons name="check-all" size={16} color="#FFFFFF" />
              <Text style={[styles.headerActionButtonText, { color: '#FFFFFF' }]}>
                Tout marquer comme lu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerActionButton, { backgroundColor: '#FF69B4' }]}
              onPress={handleDeleteAll}
            >
              <MaterialCommunityIcons name="delete-sweep" size={16} color="#FFFFFF" />
              <Text style={[styles.headerActionButtonText, { color: '#FFFFFF' }]}>
                Tout supprimer
              </Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* Settings Modal */}
        <NotificationSettings
          visible={settingsVisible}
          onClose={() => setSettingsVisible(false)}
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
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  headerActionButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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
  settingsContainer: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsContent: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
  },
})
