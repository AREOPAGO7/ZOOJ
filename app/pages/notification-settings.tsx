import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import { useNotificationSettingsStore } from '../../lib/notificationSettingsStore';
import { supabase } from '../../lib/supabase';
import AppLayout from '../app-layout';

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
  const { t } = useLanguage();

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

  // Fetch notification settings and update global state
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      
      // Try to fetch record with id = 1 first
      let { data, error } = await supabase
        .from('notification_setting')
        .select('*')
        .eq('id', 1)
        .single();

      // If no record with id = 1, try to get the first available record
      if (error && error.code === 'PGRST116') {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('notification_setting')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        data = fallbackData;
        error = fallbackError;
      }

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification settings:', error);
      }

      if (data) {
        // Update global state instead of local state (this will also save to AsyncStorage)
        await setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update notification setting - now uses global state directly
  const handleUpdateSetting = async (field: keyof Omit<NotificationSettings, 'id'>, value: boolean) => {
    try {
      // Update global state immediately (this will also save to AsyncStorage)
      await updateSetting(field, value);

      // Update database in background
      const newSettings = { ...settings, [field]: value };
      const { error } = await supabase
        .from('notification_setting')
        .update({
          [field]: value,
          daily_questions: newSettings.daily_questions,
          quiz_invite: newSettings.quiz_invite,
          pulse: newSettings.pulse,
          upcoming_events: newSettings.upcoming_events,
          messages: newSettings.messages,
          sound_enabled: newSettings.sound_enabled,
        })
        .eq('id', 1);

      if (error) {
        console.error('Error updating notification setting:', error);
        // Revert global state on error
        await updateSetting(field, !value);
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      // Revert global state on error
      await updateSetting(field, !value);
    }
  };

  // Toggle master notification setting - now uses global state directly
  const handleToggleMasterSetting = async (value: boolean) => {
    try {
      // Update global state immediately (this will also save to AsyncStorage)
      await toggleMasterSetting(value);

      // Update database in background
      supabase
        .from('notification_setting')
        .update({
          daily_questions: value,
          quiz_invite: value,
          pulse: value,
          upcoming_events: value,
          messages: value,
          sound_enabled: value,
        })
        .eq('id', 1)
        .then(async ({ error }) => {
          if (error) {
            console.error('Error updating master notification setting:', error);
            // Revert global state on error
            await toggleMasterSetting(!value);
          }
        });
    } catch (error) {
      console.error('Error updating master notification setting:', error);
      // Revert global state on error
      await toggleMasterSetting(!value);
    }
  };

  // Toggle sound setting - now uses global state directly
  const handleToggleSoundSetting = async (value: boolean) => {
    try {
      // Update global state immediately (this will also save to AsyncStorage)
      await toggleSoundSetting(value);

      // Update database in background
      supabase
        .from('notification_setting')
        .update({
          sound_enabled: value,
        })
        .eq('id', 1)
        .then(async ({ error }) => {
          if (error) {
            console.error('Error updating sound setting:', error);
            // Revert global state on error
            await toggleSoundSetting(!value);
          }
        });
    } catch (error) {
      console.error('Error updating sound setting:', error);
      // Revert global state on error
      await toggleSoundSetting(!value);
    }
  };

  useEffect(() => {
    // Initialize settings from AsyncStorage first, then fetch from database
    const initializeAndFetch = async () => {
      await initializeSettings();
      await fetchSettings();
    };
    
    initializeAndFetch();
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
            Notifications
          </Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Master Notification Setting */}
          <View className={`mx-5 mb-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
            <View className="flex-row items-center justify-between p-4">
              <View className="flex-1">
                <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                  Activer les notifications
                </Text>
                <Text className={`text-sm mt-1 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-600'}`}>
                  Recevoir toutes les notifications
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
              Types de Notifications
            </Text>
            
            {/* Quiz Invitations */}
            <View className={`${isDarkMode ? 'bg-dark-surface' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-dark-border' : 'border-gray-200'} mb-3`}>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 rounded-full bg-pink-100 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="bell" size={20} color="#F47CC6" />
                  </View>
                  <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>
                    Invitation au quiz
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
                    Question du jour
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
                    Pulse
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
                    Alarme Calendrier
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
                    Messages
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
              Son des notifications
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
                    Son
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
                    Vibration
                  </Text>
                </View>
                <Switch
                  value={true} // This could be connected to a vibration setting
                  onValueChange={() => {}} // Placeholder for vibration toggle
                  trackColor={{ false: isDarkMode ? '#333333' : '#E5E7EB', true: '#34D399' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}
