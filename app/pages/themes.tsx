import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

export default function ThemesPage() {
  const router = useRouter();
  const { isDarkMode, setDarkMode } = useDarkTheme();
  const { t } = useLanguage();

  const handleBack = () => {
    router.back();
  };

  const handleThemeChange = (isDark: boolean) => {
    setDarkMode(isDark);
  };

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-white'}`}>
        {/* Header */}
        <View className="flex-row items-center justify-between pt-5 pb-5 px-5 border-b border-gray-200 dark:border-dark-border">
          <Pressable className="p-2" onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? "#FFFFFF" : "#6C6C6C"} />
          </Pressable>
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-gray-800'}`}>{t('themes.title')}</Text>
          <View className="w-10" />
        </View>

        {/* Main Content */}
        <View className="flex-1 px-5 pt-5">
          {/* Light Mode Option */}
          <Pressable 
            className={`flex-row items-center ${isDarkMode ? 'bg-dark-surface' : 'bg-gray-100'} rounded-xl py-5 px-5 mb-4`}
            onPress={() => handleThemeChange(false)}
          >
            <View className="mr-4">
              <View className={`w-5 h-5 rounded-full border-2 ${isDarkMode ? 'border-gray-400' : 'border-gray-500'} ${!isDarkMode ? 'border-primary' : ''} justify-center items-center`}>
                {!isDarkMode && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </View>
            </View>
            <Text className={`text-base ${isDarkMode ? 'text-dark-text' : 'text-gray-800'} font-medium`}>{t('themes.lightMode')}</Text>
          </Pressable>

          {/* Dark Mode Option */}
          <Pressable 
            className={`flex-row items-center ${isDarkMode ? 'bg-dark-surface' : 'bg-gray-100'} rounded-xl py-5 px-5 mb-4`}
            onPress={() => handleThemeChange(true)}
          >
            <View className="mr-4">
              <View className={`w-5 h-5 rounded-full border-2 ${isDarkMode ? 'border-gray-400' : 'border-gray-500'} ${isDarkMode ? 'border-primary' : ''} justify-center items-center`}>
                {isDarkMode && (
                  <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                )}
              </View>
            </View>
            <Text className={`text-base ${isDarkMode ? 'text-dark-text' : 'text-gray-800'} font-medium`}>{t('themes.darkMode')}</Text>
          </Pressable>
        </View>
      </View>
    </AppLayout>
  );
}

