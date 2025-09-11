import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

const BRAND_BLUE = "#2DB6FF";
const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";

export default function ConfidentialitePage() {
  const router = useRouter();
  const { isDarkMode } = useDarkTheme();
  const { t } = useLanguage();
  const [expandedCards, setExpandedCards] = React.useState<{
    [key: string]: boolean;
  }>({});

  const handleBack = () => {
    router.back();
  };

  const toggleCard = (cardKey: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  };

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        {/* Header */}
        <View className={`flex-row items-center justify-between pt-5 pb-5 px-5 border-b ${isDarkMode ? 'border-dark-border' : 'border-gray-200'}`}>
          <Pressable className="p-2" onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? "#FFFFFF" : BRAND_GRAY} />
          </Pressable>
          <Text className={`text-xl font-bold ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.title')}</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-5 pt-5" showsVerticalScrollIndicator={false}>
          {/* Conditions d'utilisation Section */}
          <View className="mb-10">
            <Text className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.termsOfUse')}</Text>
            <Text className={`text-base leading-6 mb-6 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
              {t('privacy.termsDescription')}
            </Text>
            
            <View className="gap-5">
              <View className="flex-row items-center gap-4">
                <View className={`w-10 h-10 rounded-full justify-center items-center ${isDarkMode ? 'bg-dark-border' : 'bg-gray-200'}`}>
                  <MaterialCommunityIcons name="shield-check" size={24} color={BRAND_BLUE} />
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.copyrightRespect')}</Text>
                  <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('privacy.copyrightSubtitle')}</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-4">
                <View className={`w-10 h-10 rounded-full justify-center items-center ${isDarkMode ? 'bg-dark-border' : 'bg-gray-200'}`}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={BRAND_BLUE} />
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.appropriateUse')}</Text>
                  <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('privacy.appropriateUseSubtitle')}</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-4">
                <View className={`w-10 h-10 rounded-full justify-center items-center ${isDarkMode ? 'bg-dark-border' : 'bg-gray-200'}`}>
                  <MaterialCommunityIcons name="lock" size={24} color={BRAND_BLUE} />
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.dataProtection')}</Text>
                  <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('privacy.dataProtectionSubtitle')}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Informations Légales Section */}
          <View className="mb-10">
            <Text className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.legalInformation')}</Text>
            
            <View className="gap-4">
              <Pressable className={`rounded-xl border ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`} onPress={() => toggleCard('privacy')}>
                <View className="flex-row items-center justify-between p-5">
                  <View className="flex-1">
                    <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.privacyPolicy')}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('privacy.privacyPolicySubtitle')}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['privacy'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={isDarkMode ? "#CCCCCC" : BRAND_GRAY} 
                  />
                </View>
                {expandedCards['privacy'] && (
                  <View className="px-5 pb-5">
                    <Text className={`text-sm leading-5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                      {t('privacy.privacyPolicyContent')}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable className={`rounded-xl border ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`} onPress={() => toggleCard('gdpr')}>
                <View className="flex-row items-center justify-between p-5">
                  <View className="flex-1">
                    <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.gdpr')}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('privacy.gdprSubtitle')}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['gdpr'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={isDarkMode ? "#CCCCCC" : BRAND_GRAY} 
                  />
                </View>
                {expandedCards['gdpr'] && (
                  <View className="px-5 pb-5">
                    <Text className={`text-sm leading-5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                      {t('privacy.gdprContent')}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Pressable className={`rounded-xl border ${isDarkMode ? 'bg-dark-surface border-dark-border' : 'bg-white border-gray-200'}`} onPress={() => toggleCard('cookies')}>
                <View className="flex-row items-center justify-between p-5">
                  <View className="flex-1">
                    <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-dark-text' : 'text-text'}`}>{t('privacy.cookies')}</Text>
                    <Text className={`text-sm ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>{t('privacy.cookiesSubtitle')}</Text>
                  </View>
                  <MaterialCommunityIcons 
                    name={expandedCards['cookies'] ? "chevron-up" : "chevron-down"} 
                    size={24} 
                    color={isDarkMode ? "#CCCCCC" : BRAND_GRAY} 
                  />
                </View>
                {expandedCards['cookies'] && (
                  <View className="px-5 pb-5">
                    <Text className={`text-sm leading-5 ${isDarkMode ? 'text-dark-text-secondary' : 'text-textSecondary'}`}>
                      {t('privacy.cookiesContent')}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}
