import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

const BRAND_GRAY = "#6C6C6C";
const LIGHT_GRAY = "#F3F4F6";
const DARK_GRAY = "#374151";

export default function AProposPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();

  const handleBack = () => {
    router.back();
  };

  const handleVersionInfo = () => {
    // Navigate to version details or show version information
    console.log('Version info clicked');
  };

  const handleTechnicalInfo = () => {
    // Navigate to technical information page
    console.log('Technical info clicked');
  };

  return (
    <AppLayout>
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }}>
        {/* Header */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingTop: 20, 
          paddingBottom: 20, 
          paddingHorizontal: 20, 
          borderBottomWidth: 1, 
          borderBottomColor: isDarkMode ? '#333333' : '#E5E7EB' 
        }}>
          <Pressable style={{ padding: 8 }} onPress={handleBack}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={isDarkMode ? "#FFFFFF" : BRAND_GRAY} />
          </Pressable>
          <Text style={{ fontSize: 20, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : DARK_GRAY }}>{t('about.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Main Content */}
        <View style={{ 
          flex: 1, 
          alignItems: 'center', 
          paddingTop: 40, 
          paddingHorizontal: 20 
        }}>
          {/* Application Logo */}
          <View style={{ marginBottom: 20 }}>
            <MaterialCommunityIcons name="github" size={80} color={isDarkMode ? '#FFFFFF' : DARK_GRAY} />
          </View>

          {/* Current Version */}
          <Text style={{ 
            fontSize: 16, 
            color: isDarkMode ? '#CCCCCC' : BRAND_GRAY, 
            marginBottom: 40 
          }}>{t('about.currentVersion')}</Text>

          {/* Version Information Card */}
          <Pressable style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
            borderRadius: 10, 
            paddingVertical: 15, 
            paddingHorizontal: 20, 
            width: '100%', 
            marginBottom: 15 
          }} onPress={handleVersionInfo}>
            <MaterialCommunityIcons name="cellphone" size={24} color={isDarkMode ? '#FFFFFF' : DARK_GRAY} />
            <Text style={{ 
              flex: 1, 
              fontSize: 16, 
              color: isDarkMode ? '#FFFFFF' : DARK_GRAY, 
              marginLeft: 15 
            }}>{t('about.versionInfo')}</Text>
          </Pressable>

          {/* Technical Information Card */}
          <Pressable style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
            borderRadius: 10, 
            paddingVertical: 15, 
            paddingHorizontal: 20, 
            width: '100%', 
            marginBottom: 15 
          }} onPress={handleTechnicalInfo}>
            <MaterialCommunityIcons name="file-document" size={24} color={isDarkMode ? '#FFFFFF' : DARK_GRAY} />
            <Text style={{ 
              flex: 1, 
              fontSize: 16, 
              color: isDarkMode ? '#FFFFFF' : DARK_GRAY, 
              marginLeft: 15 
            }}>{t('about.technicalInfo')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#CCCCCC' : BRAND_GRAY} />
          </Pressable>
        </View>
      </View>
    </AppLayout>
  );
}
