import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import AppLayout from '../app-layout';

const BRAND_PINK = "#F47CC6";
const BRAND_GRAY = "#6C6C6C";
const LIGHT_GRAY = "#F3F4F6";
const DARK_GRAY = "#374151";

export default function HelpSupportPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { isDarkMode } = useDarkTheme();

  const handleBack = () => {
    router.back();
  };

  const handleEmailContact = () => {
    // Open email client or copy email to clipboard
    console.log('Email contact clicked');
  };

  const handlePhoneContact = () => {
    // Open phone dialer or copy phone number to clipboard
    console.log('Phone contact clicked');
  };

  const handleFAQItem = (faqType: string) => {
    // Navigate to FAQ details or show answer
    console.log('FAQ clicked:', faqType);
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
          <Text style={{ fontSize: 20, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : DARK_GRAY }}>{t('helpSupport.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Main Content */}
        <ScrollView 
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        >
          {/* Contact Us Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 15 }}>{t('helpSupport.contactUs')}</Text>
            
            <Pressable style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
              borderRadius: 10, 
              paddingVertical: 15, 
              paddingHorizontal: 20, 
              marginBottom: 10 
            }} onPress={handleEmailContact}>
              <MaterialCommunityIcons name="email-outline" size={24} color={BRAND_PINK} />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 2 }}>{t('helpSupport.byEmail')}</Text>
                <Text style={{ fontSize: 14, color: isDarkMode ? '#CCCCCC' : BRAND_GRAY }}>{t('helpSupport.emailAddress')}</Text>
              </View>
            </Pressable>

            <Pressable style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
              borderRadius: 10, 
              paddingVertical: 15, 
              paddingHorizontal: 20, 
              marginBottom: 10 
            }} onPress={handlePhoneContact}>
              <MaterialCommunityIcons name="phone-outline" size={24} color={BRAND_PINK} />
              <View style={{ marginLeft: 15, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 2 }}>{t('helpSupport.byPhone')}</Text>
                <Text style={{ fontSize: 14, color: isDarkMode ? '#CCCCCC' : BRAND_GRAY }}>{t('helpSupport.phoneNumber')}</Text>
              </View>
            </Pressable>
          </View>

          {/* FAQ Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 15 }}>{t('helpSupport.faq')}</Text>
            
            <Pressable style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
              borderRadius: 10, 
              paddingVertical: 15, 
              paddingHorizontal: 20, 
              marginBottom: 10 
            }} onPress={() => handleFAQItem('payments')}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={BRAND_PINK} />
              <Text style={{ flex: 1, fontSize: 16, color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginLeft: 15 }}>{t('helpSupport.payments')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#CCCCCC' : BRAND_GRAY} />
            </Pressable>

            <Pressable style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
              borderRadius: 10, 
              paddingVertical: 15, 
              paddingHorizontal: 20, 
              marginBottom: 10 
            }} onPress={() => handleFAQItem('password')}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={BRAND_PINK} />
              <Text style={{ flex: 1, fontSize: 16, color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginLeft: 15 }}>{t('helpSupport.changePassword')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#CCCCCC' : BRAND_GRAY} />
            </Pressable>

            <Pressable style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
              borderRadius: 10, 
              paddingVertical: 15, 
              paddingHorizontal: 20, 
              marginBottom: 10 
            }} onPress={() => handleFAQItem('delete-account')}>
              <MaterialCommunityIcons name="help-circle-outline" size={24} color={BRAND_PINK} />
              <Text style={{ flex: 1, fontSize: 16, color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginLeft: 15 }}>{t('helpSupport.deleteAccount')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={isDarkMode ? '#CCCCCC' : BRAND_GRAY} />
            </Pressable>
          </View>

          {/* Company Address Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 15 }}>{t('helpSupport.ourAddress')}</Text>
            
            <View style={{ 
              backgroundColor: isDarkMode ? '#1A1A1A' : LIGHT_GRAY, 
              borderRadius: 10, 
              padding: 20 
            }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'flex-start', 
                marginBottom: 20 
              }}>
                <MaterialCommunityIcons name="map-marker-outline" size={24} color={BRAND_PINK} />
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 2 }}>{t('helpSupport.companyName')}</Text>
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#CCCCCC' : BRAND_GRAY, marginBottom: 1 }}>{t('helpSupport.streetAddress')}</Text>
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#CCCCCC' : BRAND_GRAY, marginBottom: 1 }}>{t('helpSupport.cityAddress')}</Text>
                </View>
              </View>
              
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'flex-start', 
                marginBottom: 20 
              }}>
                <MaterialCommunityIcons name="clock-outline" size={24} color={BRAND_PINK} />
                <View style={{ marginLeft: 15, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: isDarkMode ? '#FFFFFF' : DARK_GRAY, marginBottom: 2 }}>{t('helpSupport.openingHours')}</Text>
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#CCCCCC' : BRAND_GRAY, marginBottom: 1 }}>{t('helpSupport.weekdayHours')}</Text>
                  <Text style={{ fontSize: 14, color: isDarkMode ? '#CCCCCC' : BRAND_GRAY, marginBottom: 1 }}>{t('helpSupport.saturdayHours')}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
}
