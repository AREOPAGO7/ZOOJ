import { useTheme } from '@/contexts/ThemeContext'
import { useNotificationManager } from '@/hooks/useNotificationManager'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import React from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export const NotificationDemo: React.FC = () => {
  const { colors } = useTheme()
  const {
    sendEventNotification,
    sendDailyQuestion,
    sendQuizInvite,
    sendCoupleUpdate,
    sendUrgentNotification,
    sendReminder,
    sendInfo,
    sendEventToCouple,
    sendDailyQuestionToCouple,
    isAuthenticated
  } = useNotificationManager()

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          Connectez-vous pour tester les notifications
        </Text>
      </View>
    )
  }

  const handleSendEventNotification = async () => {
    try {
      const result = await sendEventNotification(
        'Dîner romantique',
        'Ce soir à 20h',
        'event_123'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Notification d\'événement envoyée !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendDailyQuestion = async () => {
    try {
      const result = await sendDailyQuestion(
        'Quel est votre moment préféré de la journée avec votre partenaire ?'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Question quotidienne envoyée !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendQuizInvite = async () => {
    try {
      // Note: In a real app, you'd get the receiver ID from user selection
      const receiverId = 'demo-receiver-id'
      const result = await sendQuizInvite(
        receiverId,
        'Quiz de compatibilité',
        'Voulez-vous tester notre compatibilité ?'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation')
      } else {
        Alert.alert('Succès', 'Invitation au quiz envoyée !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendCoupleUpdate = async () => {
    try {
      const result = await sendCoupleUpdate(
        'profile_update',
        'Votre partenaire a mis à jour son profil'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Notification de couple envoyée !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendUrgentNotification = async () => {
    try {
      const result = await sendUrgentNotification(
        'Rappel important',
        'N\'oubliez pas votre rendez-vous chez le médecin demain !'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Notification urgente envoyée !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendReminder = async () => {
    try {
      const result = await sendReminder(
        'Rappel',
        'Pensez à acheter le cadeau d\'anniversaire'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Rappel envoyé !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendInfo = async () => {
    try {
      const result = await sendInfo(
        'Information',
        'Nouvelle fonctionnalité disponible dans l\'app !'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Information envoyée !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendEventToCouple = async () => {
    try {
      const result = await sendEventToCouple(
        'Week-end en amoureux',
        'Ce week-end'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Notification d\'événement envoyée au couple !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  const handleSendDailyQuestionToCouple = async () => {
    try {
      const result = await sendDailyQuestionToCouple(
        'Quel est votre rêve pour votre couple ?'
      )
      if (result?.error) {
        Alert.alert('Erreur', 'Impossible d\'envoyer la notification')
      } else {
        Alert.alert('Succès', 'Question quotidienne envoyée au couple !')
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue')
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Démo des Notifications
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Testez les différents types de notifications
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications individuelles
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSendEventNotification}
        >
          <MaterialCommunityIcons name="calendar" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Notification d'événement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={handleSendDailyQuestion}
        >
          <MaterialCommunityIcons name="chat-question" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Question quotidienne
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={handleSendQuizInvite}
        >
          <MaterialCommunityIcons name="heart" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Invitation au quiz
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.success }]}
          onPress={handleSendCoupleUpdate}
        >
          <MaterialCommunityIcons name="account-group" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Mise à jour du couple
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications par priorité
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={handleSendUrgentNotification}
        >
          <MaterialCommunityIcons name="alert" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Notification urgente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.warning }]}
          onPress={handleSendReminder}
        >
          <MaterialCommunityIcons name="bell-ring" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Rappel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.textSecondary }]}
          onPress={handleSendInfo}
        >
          <MaterialCommunityIcons name="information" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Information
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Notifications au couple
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSendEventToCouple}
        >
          <MaterialCommunityIcons name="calendar-heart" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Événement au couple
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.secondary }]}
          onPress={handleSendDailyQuestionToCouple}
        >
          <MaterialCommunityIcons name="heart-question" size={20} color={colors.surface} />
          <Text style={[styles.buttonText, { color: colors.surface }]}>
            Question au couple
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
