import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    Image,
    Pressable,
    ScrollView,
    Text,
    View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { getProviderDescription, getProviderName, useServiceProviders } from '../../hooks/useServiceData';
import { useAuth } from '../../lib/auth';
import { makePhoneCall } from '../../lib/phoneUtils';
import AppLayout from '../app-layout';

export default function ServiceDetailsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  const { t, language: currentLanguage } = useLanguage();
  
  const [callingProviderId, setCallingProviderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { serviceProviderId, subcategoryId, subcategoryName, city } = useLocalSearchParams<{
    serviceProviderId: string;
    subcategoryId: string;
    subcategoryName: string;
    city?: string;
  }>();
  
  const { providers, loading: providersLoading } = useServiceProviders(subcategoryId, city);
  
  // Find the specific provider
  const provider = providers.find(p => p.id === serviceProviderId);
  
  // Debug logging
  console.log('Service Details Debug:', {
    serviceProviderId,
    subcategoryId,
    subcategoryName,
    city,
    providersCount: providers.length,
    providerFound: !!provider
  });

  // Handle app state changes (when returning from phone app)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active' && callingProviderId) {
        // App came back to foreground and we were calling someone
        // Reset the calling state and refresh the page
        setCallingProviderId(null);
        setRefreshKey(prev => prev + 1);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [callingProviderId]);

  // Handle page focus (when returning from phone app or other screens)
  React.useEffect(() => {
    // Reset calling state when page comes into focus
    if (callingProviderId) {
      setCallingProviderId(null);
      setRefreshKey(prev => prev + 1);
    }
  }, [callingProviderId]);

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  const handleCall = async (phone: string, serviceProviderId: string) => {
    // Prevent multiple simultaneous calls
    if (callingProviderId) {
      return;
    }

    try {
      setCallingProviderId(serviceProviderId);
      await makePhoneCall(phone, serviceProviderId, user?.id);
    } catch (error) {
      console.error('Error handling call:', error);
    } finally {
      // Reset calling state after a short delay
      setTimeout(() => {
        setCallingProviderId(null);
      }, 1000);
    }
  };

  if (providersLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#F47CC6" />
          <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            {t('serviceDetails.loading')}
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (!provider) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center px-8`}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={64} 
            color="#DC2626" 
          />
          <Text className={`text-lg font-medium mt-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('serviceDetails.notFound')}
          </Text>
          <Text className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            {t('serviceDetails.notFoundDescription')}
          </Text>
          <Pressable
            className={`mt-6 px-6 py-3 rounded-lg ${isDarkMode ? 'bg-primary' : 'bg-pink-500'}`}
            onPress={() => router.back()}
          >
            <Text className="text-white font-medium">{t('serviceDetails.back')}</Text>
          </Pressable>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View key={refreshKey} className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
        {/* Header */}
        <View className={`px-4 pt-4 pb-6 ${isDarkMode ? 'bg-dark-surface' : 'bg-gray-100'}`}>
          <View className="flex-row items-center justify-between mb-4">
            <Pressable onPress={() => router.back()}>
              <MaterialCommunityIcons 
                name="chevron-left" 
                size={24} 
                color={isDarkMode ? '#FFFFFF' : '#374151'} 
              />
            </Pressable>
            <Text className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {provider ? getProviderName(provider, currentLanguage) : t('serviceDetails.title')}
            </Text>
            <View className="w-6" />
          </View>
        </View>

        {/* Service Image */}
        <View className="mx-4 mb-4">
          {provider.image_url ? (
            <Image 
              source={{ uri: provider.image_url }} 
              className="w-full h-72 rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <View className={`w-full h-72 rounded-xl items-center justify-center ${
              isDarkMode ? 'bg-dark-surface' : 'bg-gray-100'
            }`} style={{
              borderWidth: 2,
              borderColor: isDarkMode ? '#374151' : '#E5E7EB',
              borderStyle: 'dashed',
            }}>
              <View className="items-center">
                <MaterialCommunityIcons 
                  name="image-outline" 
                  size={48} 
                  color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
                />
                <Text className={`text-sm mt-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {t('serviceDetails.noImage')}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Service Details Content */}
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Information Card */}
          <View className={`p-6 rounded-xl mb-6 ${
            isDarkMode ? 'bg-dark-surface' : 'bg-white'
          }`} style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            {/* Service Name */}
            <Text className={`text-xl font-bold mb-3 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {getProviderName(provider, currentLanguage)}
            </Text>

            {/* Description */}
            {getProviderDescription(provider, currentLanguage) && (
              <Text className={`text-sm leading-relaxed mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {getProviderDescription(provider, currentLanguage)}
              </Text>
            )}

            {/* Address */}
            {provider.address && (
              <View className="flex-row items-start mb-3">
                <MaterialCommunityIcons 
                  name="map-marker" 
                  size={16} 
                  color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
                />
                <Text className={`text-sm ml-2 flex-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {provider.address}
                </Text>
              </View>
            )}

            {/* Opening Hours */}
            <View className="flex-row items-start mb-3">
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={16} 
                color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
              />
              <Text className={`text-sm ml-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {t('serviceDetails.openingHours')}
              </Text>
            </View>

            {/* Price Range */}
            {provider.price_range && (
              <View className="flex-row items-start">
                <MaterialCommunityIcons 
                  name="currency-eur" 
                  size={16} 
                  color={isDarkMode ? '#9CA3AF' : '#6B7280'} 
                />
                <Text className={`text-sm ml-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {provider.price_range}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Call Button */}
        {provider.phone && (
          <View className="px-4 pb-6">
            <Pressable
              className="p-4 rounded-xl"
              onPress={() => handleCall(provider.phone!, provider.id)}
              disabled={callingProviderId === provider.id}
              style={{
                backgroundColor: callingProviderId === provider.id 
                  ? '#9CA3AF' 
                  : '#EC4899', // Pink gradient color as fallback
              }}
            >
              <View className="flex-row items-center justify-center">
                {callingProviderId === provider.id ? (
                  <MaterialCommunityIcons 
                    name="loading" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                ) : (
                  <MaterialCommunityIcons 
                    name="phone" 
                    size={20} 
                    color="#FFFFFF" 
                  />
                )}
                <Text className="text-white text-base font-medium ml-2">
                  {callingProviderId === provider.id ? t('serviceDetails.calling') : t('serviceDetails.call')}
                </Text>
              </View>
            </Pressable>
          </View>
        )}
      </View>
    </AppLayout>
  );
}
