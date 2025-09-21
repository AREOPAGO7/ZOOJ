import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { NotificationBadge } from '@/components/NotificationBadge';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const pathname = usePathname();

  // Hide tab bar on the index page (first page)
  const isIndexPage = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: isIndexPage ? { display: 'none' } : { 
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.border,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          color: colors.textSecondary,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}>
      <Tabs.Screen
        name="calendrier"
        options={{
          title: t('nav.calendar'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="questions"
        options={{
          title: t('nav.questions'),
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: 'relative' }}>
              <MaterialCommunityIcons name="chat" size={size} color={color} />
              <NotificationBadge size="small" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quizz"
        options={{
          title: t('nav.quiz'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="heart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reglages"
        options={{
          title: t('nav.settings'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
