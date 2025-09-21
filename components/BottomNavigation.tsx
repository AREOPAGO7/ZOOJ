import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDarkTheme } from '../contexts/DarkThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface BottomNavigationProps {
  activeTab: string;
  onTabPress: (tabName: string) => void;
}

const tabs = [
  { id: 'accueil', labelKey: 'nav.home', icon: 'home' },
  { id: 'calendrier', labelKey: 'nav.calendar', icon: 'calendar' },
  { id: 'questions', labelKey: 'nav.questions', icon: 'message-text' },
  { id: 'quizz', labelKey: 'nav.quiz', icon: 'heart' },
  { id: 'reglages', labelKey: 'nav.settings', icon: 'cog' },
];

export default function BottomNavigation({ activeTab, onTabPress }: BottomNavigationProps) {
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();
  
  return (
    <View className={`flex-row ${isDarkMode ? 'bg-dark-bg border-t border-dark-border' : 'bg-white border-t border-gray-200'} pb-5 pt-2`}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          className="flex-1 items-center justify-center py-2"
          onPress={() => onTabPress(tab.id)}
        >
          <MaterialCommunityIcons
            name={tab.icon as any}
            size={24}
            color={activeTab === tab.id ? '#F47CC6' : (isDarkMode ? '#CCCCCC' : '#9CA3AF')}
          />
          <Text className={`text-xs font-medium mt-1 ${activeTab === tab.id ? (isDarkMode ? 'text-white' : 'text-secondary') : (isDarkMode ? 'text-dark-text-secondary' : 'text-gray-400')}`}>
            {t(tab.labelKey)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

