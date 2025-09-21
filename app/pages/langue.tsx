import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { Language, useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

// Language options
interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'ma', name: 'Ma', nativeName: 'Ma', flag: '🇲🇦' },
];

export default function LanguePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { language: currentLanguage, setLanguage, t } = useLanguage();
  const { isDarkMode } = useDarkTheme();

  const handleBack = () => {
    router.back();
  };

  const [selectedLanguage, setSelectedLanguage] = useState<Language>(currentLanguage);
  const [showSaved, setShowSaved] = useState(false);

  // Update selected language when current language changes
  useEffect(() => {
    setSelectedLanguage(currentLanguage);
  }, [currentLanguage]);

  const handleLanguageSelect = useCallback((language: Language) => {
    setSelectedLanguage(language);
  }, []);

  const handleSave = useCallback(async () => {
    await setLanguage(selectedLanguage);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }, [selectedLanguage, setLanguage]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }



  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-white'}`}>
        <View className={`flex-row items-center justify-between pt-5 pb-8 px-5 border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
          <Pressable style={{ padding: 8 }} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? "#FFFFFF" : "#6C6C6C"} />
          </Pressable>
          <View className="items-center flex-1">
            <MaterialCommunityIcons name="translate" size={32} color="#F47CC6" />
            <Text className={`text-2xl font-bold mt-3 ${isDarkMode ? 'text-dark-text' : 'text-gray-700'}`}>{t('language.title')}</Text>
            <Text className={`text-base text-center mt-2 ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}`}>{t('language.subtitle')}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView 
          className="flex-1" 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 pt-5">
          {/* Current Language Display */}
          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-dark-text' : 'text-gray-700'}`}>{t('language.currentLanguage')}</Text>
            <View className={`flex-row items-center p-5 rounded-xl border-2 border-green-500 ${isDarkMode ? 'bg-dark-surface' : 'bg-gray-100'}`}>
              <Text className="text-2xl mr-4">{languages.find(l => l.code === currentLanguage)?.flag}</Text>
              <View className="flex-1">
                <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-gray-700'}`}>
                  {languages.find(l => l.code === currentLanguage)?.nativeName}
                </Text>
                <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-gray-500'}`}>
                  {languages.find(l => l.code === currentLanguage)?.name}
                </Text>
              </View>
            </View>
          </View>

          {/* Language Selection */}
          <View className="mb-8">
            <Text className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-dark-text' : 'text-gray-700'}`}>{t('language.selectLanguage')}</Text>
            <View className="gap-3">
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  className={`flex-row items-center p-4 rounded-xl border-2 ${
                    selectedLanguage === language.code 
                      ? 'bg-green-50 border-green-500' 
                      : isDarkMode 
                        ? 'bg-dark-surface border-dark-border' 
                        : 'bg-gray-50 border-gray-200'
                  }`}
                  onPress={() => handleLanguageSelect(language.code)}
                >
                  <Text className="text-2xl mr-4">{language.flag}</Text>
                  <View className="flex-1">
                    <Text className={`text-base font-semibold mb-1 ${
                      selectedLanguage === language.code 
                        ? 'text-green-600' 
                        : isDarkMode 
                          ? 'text-dark-text' 
                          : 'text-gray-700'
                    }`}>
                      {language.nativeName}
                    </Text>
                    <Text className={`text-sm ${
                      selectedLanguage === language.code 
                        ? 'text-green-500' 
                        : isDarkMode 
                          ? 'text-dark-text-secondary' 
                          : 'text-gray-500'
                    }`}>
                      {language.name}
                    </Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <MaterialCommunityIcons name="check-circle" size={24} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <View className="mb-5">
            <TouchableOpacity
              className={`flex-row items-center justify-center px-6 py-4 rounded-full shadow-lg ${
                selectedLanguage === currentLanguage 
                  ? 'bg-green-500' 
                  : 'bg-blue-500'
              }`}
              onPress={handleSave}
            >
              <MaterialCommunityIcons 
                name={selectedLanguage === currentLanguage ? "check" : "content-save"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text className="text-white text-base font-semibold ml-2">
                {selectedLanguage === currentLanguage ? t('language.confirm') : t('language.save')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Saved Message */}
          {showSaved && (
            <View className={`flex-row items-center justify-center px-4 py-3 rounded-full bg-green-50 border border-green-500`}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
              <Text className="text-green-600 text-sm font-semibold ml-2">{t('language.saved')}</Text>
            </View>
          )}
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}
