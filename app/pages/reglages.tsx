import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

export default function ReglagesPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  const settingsOptions = [
    {
      id: 'bons-plans',
      title: t('settings.goodDeals'),
      icon: 'earth',
      route: '/pages/bons-plans'
    },
    {
      id: 'notre-couple',
      title: t('settings.ourCouple'),
      icon: 'heart-outline',
      route: '/pages/notre-couple'
    },

    {
      id: 'notifications',
      title: 'Notifications',
      icon: 'bell-outline',
      route: '/pages/notification-settings'
    },
    {
      id: 'confidentialite',
      title: t('settings.privacy'),
      icon: 'lock-outline',
      route: '/pages/confidentialite'
    },
    {
      id: 'langue',
      title: t('settings.language'),
      icon: 'translate',
      route: '/pages/langue'
    },
    {
      id: 'themes',
      title: t('settings.themes'),
      icon: 'weather-night',
      route: '/pages/themes'
    },
    {
      id: 'jeux',
      title: t('settings.games'),
      icon: 'account-group',
      route: '/pages/jeux'
    },
    {
      id: 'mon-profil',
      title: t('settings.myProfile'),
      icon: 'account-outline',
      route: '/pages/mon-profil'
    },
    {
      id: 'help-support',
      title: t('settings.helpSupport'),
      icon: 'help-circle-outline',
      route: '/pages/help-support'
    },
    {
      id: 'a-propos',
      title: t('settings.about'),
      icon: 'information-outline',
      route: '/pages/a-propos'
    }
  ];

  const handleSettingPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        {/* Header */}
        <View className={`px-6 py-4 border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`} style={styles.header}>
          <Text className={`text-2xl font-bold text-center ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('settings.title')}</Text>
        </View>

        {/* Settings List */}
        <ScrollView style={styles.settingsList} showsVerticalScrollIndicator={false}>
          {settingsOptions.map((option) => (
            <Pressable
              key={option.id}
              className={`mx-4 my-2 px-4 py-4 rounded-lg border ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`}
              style={styles.settingItem}
              onPress={() => handleSettingPress(option.route)}
            >
              <View style={styles.settingLeft}>
                <View style={styles.iconContainer}>
                  <MaterialCommunityIcons 
                    name={option.icon as any} 
                    size={24} 
                    color="#F47CC6" 
                  />
                </View>
                <Text className={`text-base font-medium ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{option.title}</Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color={isDarkMode ? '#CCCCCC' : '#7A7A7A'} 
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    borderBottomWidth: 1,
  },
  settingsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
});
