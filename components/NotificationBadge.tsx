import { useNotifications } from '@/contexts/NotificationContext'
import { useTheme } from '@/contexts/ThemeContext'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large'
  showCount?: boolean
  maxCount?: number
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  size = 'medium', 
  showCount = true, 
  maxCount = 99 
}) => {
  const { unreadCount } = useNotifications()
  const { colors } = useTheme()

  if (unreadCount === 0) return null

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 16, height: 16, borderRadius: 8 }
      case 'large':
        return { width: 24, height: 24, borderRadius: 12 }
      default:
        return { width: 20, height: 20, borderRadius: 10 }
    }
  }

  const getFontSize = () => {
    switch (size) {
      case 'small':
        return 10
      case 'large':
        return 14
      default:
        return 12
    }
  }

  const displayCount = unreadCount > maxCount ? `${maxCount}+` : unreadCount.toString()

  return (
    <View style={[
      styles.badge,
      getSizeStyles(),
      { backgroundColor: colors.error }
    ]}>
      {showCount && (
        <Text style={[
          styles.count,
          { 
            fontSize: getFontSize(),
            color: colors.surface
          }
        ]}>
          {displayCount}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 16,
    minHeight: 16,
  },
  count: {
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 16,
  },
})
