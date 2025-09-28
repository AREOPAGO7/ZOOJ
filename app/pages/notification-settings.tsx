import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, Vibration, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import notificationSettingsTranslations from '../../lib/notification-settings-translations.json';
import { useNotificationSettingsStore } from '../../lib/notificationSettingsStore';
import AppLayout from '../app-layout';

// Translation helper function for notification settings page
const getNotificationSettingsTranslation = (key: string, language: string): string => {
  const keys = key.split('.');
  let value: any = notificationSettingsTranslations[language as keyof typeof notificationSettingsTranslations];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key; // Return key if translation not found
    }
  }
  
  return typeof value === 'string' ? value : key;
};

interface NotificationSettings {
  id: number;
  daily_questions: boolean;
  quiz_invite: boolean;
  pulse: boolean;
  upcoming_events: boolean;
  messages: boolean;
  sound_enabled: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  const { t, language } = useLanguage();
  const [vibrationEnabled, setVibrationEnabled] = React.useState(true);

  // Use global state instead of local state
  const { 
    settings, 
    isLoading, 
    isInitialized,
    setSettings, 
    updateSetting, 
    toggleMasterSetting, 
    toggleSoundSetting,
    setIsLoading,
    initializeSettings
  } = useNotificationSettingsStore();

  // Initialize settings from AsyncStorage only (no database fetch)
  const initializeSettingsOnly = async () => {
    try {
      setIsLoading(true);
      await initializeSettings();
    } catch (error) {
      console.log('Error initializing settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update notification setting - uses global state only
  const handleUpdateSetting = async (field: keyof Omit<NotificationSettings, 'id'>, value: boolean) => {
    try {
      // Update global state immediately (this will also save to AsyncStorage)
      await updateSetting(field, value);
    } catch (error) {
      console.log('Error updating notification setting:', error);
    }
  };

  // Toggle master notification setting - uses global state only
  const handleToggleMasterSetting = async (value: boolean) => {
    try {
      // Update global state immediately (this will also save to AsyncStorage)
      await toggleMasterSetting(value);
    } catch (error) {
      console.log('Error updating master notification setting:', error);
    }
  };

  // Toggle sound setting - uses global state only
  const handleToggleSoundSetting = async (value: boolean) => {
    console.log('🔊 Sound toggle button pressed, value:', value);
    
    try {
      // Update global state immediately (this will also save to AsyncStorage)
      await toggleSoundSetting(value);
      console.log('✅ Sound setting updated in global state');
      
      // Play sound when enabling
      if (value) {
        console.log('🎵 Attempting to play notification sound...');
        
        try {
          // Method 1: Try the local WAV file
          console.log('📁 Loading notification.wav file...');
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/notification.wav'),
            { shouldPlay: true, volume: 1.0, isLooping: false }
          );
          
          console.log('✅ WAV file loaded successfully');
          console.log('🔊 Playing sound at volume 1.0...');
          
          // Wait for the sound to finish, then clean up
          sound.setOnPlaybackStatusUpdate((status) => {
            console.log('📊 Sound status update:', status);
            if (status.isLoaded && status.didJustFinish) {
              console.log('✅ Sound finished playing, cleaning up...');
              sound.unloadAsync();
            }
          });
          
          // Also try to play it again after a short delay to ensure it works
          setTimeout(async () => {
            try {
              console.log('🔄 Attempting to play sound again...');
              await sound.replayAsync();
            } catch (replayError) {
              console.log('❌ Replay failed:', replayError);
            }
          }, 100);
          
        } catch (soundError) {
          console.log('❌ WAV file method failed:', soundError);
          
          // Method 2: Try a simple system beep using data URI
          try {
            console.log('🔔 Trying system beep method...');
            const { sound } = await Audio.Sound.createAsync(
              { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjuBzvLZizEIHm7A7+OZURE=' },
              { shouldPlay: true, volume: 1.0 }
            );
            console.log('✅ System beep loaded');
            setTimeout(() => sound.unloadAsync(), 2000);
          } catch (beepError) {
            console.log('❌ System beep also failed:', beepError);
            
            // Method 3: Use HapticFeedback as fallback
            try {
              console.log('📳 Using haptic feedback as sound alternative...');
              const Haptics = await import('expo-haptics');
              await Haptics.default.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              console.log('✅ Haptic feedback triggered');
            } catch (hapticError) {
              console.log('❌ Haptic feedback failed:', hapticError);
            }
          }
        }
      } else {
        console.log('🔇 Sound disabled');
      }
    } catch (error) {
      console.log('❌ Error updating sound setting:', error);
    }
  };

  // Toggle vibration setting
  const handleToggleVibrationSetting = async (value: boolean) => {
    console.log('📳 Vibration toggle button pressed, value:', value);
    
    try {
      setVibrationEnabled(value);
      console.log('✅ Vibration setting updated in local state');
      
      // Trigger vibration when enabling
      if (value) {
        console.log('📳 Triggering phone vibration for 200ms...');
        Vibration.vibrate(200); // Vibrate for 200ms
        console.log('✅ Vibration triggered successfully');
      } else {
        console.log('📳 Vibration disabled');
      }
    } catch (error) {
      console.log('❌ Error updating vibration setting:', error);
    }
  };

  useEffect(() => {
    // Initialize settings from AsyncStorage only
    initializeSettingsOnly();
  }, []);

  const isMasterEnabled = settings.daily_questions && 
                        settings.quiz_invite && 
                        settings.pulse && 
                        settings.upcoming_events && 
                        settings.messages;

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-white'}`}>
        {/* Header */}
        <View className={`flex-row items-center px-5 pt-4 pb-5 ${isDarkMode ? 'bg-dark-bg' : 'bg-white'}`}>
          <TouchableOpacity 
            className="mr-3 p-2"
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons 
              name="arrow-left" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#000000'} 
            />
          </TouchableOpacity>
          <Text className={`text-xl font-semibold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
            {getNotificationSettingsTranslation('notificationSettings.title', language)}
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Master Notification Setting */}
          <View className={`mx-5 mb-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-1">
                <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                  {getNotificationSettingsTranslation('notificationSettings.activateNotifications', language)}
                </Text>
                <Text className={`text-sm mt-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                  {getNotificationSettingsTranslation('notificationSettings.receiveAllNotifications', language)}
                </Text>
              </View>
              <Switch
                value={isMasterEnabled}
                onValueChange={handleToggleMasterSetting}
                trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                thumbColor={isMasterEnabled ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
              />
            </View>
          </View>

          {/* Notification Types Section */}
          <View className="mx-5 mb-6">
            <Text className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {getNotificationSettingsTranslation('notificationSettings.notificationTypes', language)}
            </Text>
            
            {/* Quiz Invitations */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="bell" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.quizInvitation', language)}
                  </Text>
                </View>
                <Switch
                  value={settings.quiz_invite}
                  onValueChange={(value) => handleUpdateSetting('quiz_invite', value)}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={settings.quiz_invite ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Daily Questions */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="file-document" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.dailyQuestion', language)}
                  </Text>
                </View>
                <Switch
                  value={settings.daily_questions}
                  onValueChange={(value) => handleUpdateSetting('daily_questions', value)}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={settings.daily_questions ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Pulse */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="information" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.pulse', language)}
                  </Text>
                </View>
                <Switch
                  value={settings.pulse}
                  onValueChange={(value) => handleUpdateSetting('pulse', value)}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={settings.pulse ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Calendar Alarm */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="calendar" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.calendarAlarm', language)}
                  </Text>
                </View>
                <Switch
                  value={settings.upcoming_events}
                  onValueChange={(value) => handleUpdateSetting('upcoming_events', value)}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={settings.upcoming_events ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Messages */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="message" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.messages', language)}
                  </Text>
                </View>
                <Switch
                  value={settings.messages}
                  onValueChange={(value) => handleUpdateSetting('messages', value)}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={settings.messages ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>

          {/* Notification Sound Section */}
          <View className="mx-5 mb-6">
            <Text className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {getNotificationSettingsTranslation('notificationSettings.notificationSound', language)}
            </Text>
            
            {/* Sound */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons 
                      name={settings.sound_enabled ? "volume-high" : "volume-off"} 
                      size={20} 
                      color="#F47CC6" 
                    />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.sound', language)}
                  </Text>
                </View>
                <Switch
                  value={settings.sound_enabled}
                  onValueChange={handleToggleSoundSetting}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={settings.sound_enabled ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>

            {/* Vibration */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="vibrate" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    {getNotificationSettingsTranslation('notificationSettings.vibration', language)}
                  </Text>
                </View>
                <Switch
                  value={vibrationEnabled}
                  onValueChange={handleToggleVibrationSetting}
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor={vibrationEnabled ? '#FFFFFF' : isDarkMode ? '#666666' : '#FFFFFF'}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}
