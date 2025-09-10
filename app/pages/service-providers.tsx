import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    FlatList,
    Image,
    Pressable,
    Text,
    TextInput,
    View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useServiceProviders } from '../../hooks/useServiceData';
import { useAuth } from '../../lib/auth';
import { makePhoneCall } from '../../lib/phoneUtils';
import AppLayout from '../app-layout';

interface ServiceProviderCardProps {
  provider: {
    id: string;
    name: string;
    description?: string;
    address?: string;
    city?: string;
    phone?: string;
    price_range?: string;
    image_url?: string;
    website?: string;
  };
  onCall: (phone: string, serviceProviderId: string) => void;
  onPress: () => void;
  isCalling?: boolean;
}


function ServiceProviderCard({ provider, onCall, onPress, isCalling = false }: ServiceProviderCardProps) {
  const { isDarkMode } = useDarkTheme();
  
  return (
    <Pressable 
      className={`w-[48%] mb-4 p-4 rounded-xl ${isDarkMode ? 'bg-dark-surface' : 'bg-gray-50'}`}
      onPress={onPress}
    >
      {/* Icon/Image */}
      <View className="items-center mb-3">
        {provider.image_url ? (
          <Image 
            source={{ uri: provider.image_url }} 
            className="w-12 h-12 rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className={`w-12 h-12 rounded-full items-center justify-center ${isDarkMode ? 'bg-dark-border' : 'bg-gray-200'}`}>
            <MaterialCommunityIcons 
              name="store" 
              size={24} 
              color={isDarkMode ? '#FFFFFF' : '#374151'} 
            />
          </View>
        )}
      </View>
      
      {/* Provider Name Only */}
      <Text className={`text-sm font-medium text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {provider.name}
      </Text>
    </Pressable>
  );
}


export default function ServiceProvidersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [callingProviderId, setCallingProviderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { subcategoryId, subcategoryName, city } = useLocalSearchParams<{
    subcategoryId: string;
    subcategoryName: string;
    city?: string;
  }>();
  
  const { providers, loading: providersLoading } = useServiceProviders(subcategoryId, city);
  
  // Debug logging
  console.log('Service Providers Debug:', {
    subcategoryId,
    subcategoryName,
    city,
    providersCount: providers.length
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
  useFocusEffect(
    React.useCallback(() => {
      // Reset calling state when page comes into focus
      if (callingProviderId) {
        setCallingProviderId(null);
        setRefreshKey(prev => prev + 1);
      }
    }, [callingProviderId])
  );
  
  // Filter providers based on search query
  const filteredProviders = providers.filter(provider => 
    provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    provider.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleServicePress = (provider: any) => {
    const params = { 
      serviceProviderId: provider.id,
      subcategoryId: subcategoryId,
      subcategoryName: subcategoryName,
      ...(city && city !== 'Sélectionnez votre ville' && { city: city })
    };
    
    console.log('Navigating to service details with params:', params);
    
    router.push({
      pathname: '/pages/service-details',
      params
    });
  };


  if (providersLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`}>
          <ActivityIndicator size="large" color="#F47CC6" />
          <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            Chargement...
          </Text>
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
              {subcategoryName || 'Services'}
            </Text>
            <View className="w-6" />
          </View>
          
          {/* Search Input */}
          <TextInput
            className={`p-3 rounded-lg border mb-3 ${
              isDarkMode 
                ? 'bg-dark-bg border-dark-border text-white' 
                : 'bg-white border-gray-200 text-gray-900'
            }`}
            placeholder="Rechercher dans cette catégorie..."
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          
          <Text className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {city && city !== 'Sélectionnez votre ville' 
              ? `Services disponibles à ${city}` 
              : 'Services disponibles dans toutes les villes'
            }
          </Text>
        </View>

        {/* Services Grid */}
        {filteredProviders.length > 0 ? (
          <FlatList
            data={filteredProviders}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ServiceProviderCard 
                provider={item} 
                onCall={handleCall}
                onPress={() => handleServicePress(item)}
                isCalling={callingProviderId === item.id}
              />
            )}
          />
        ) : (
          <View className="flex-1 justify-center items-center px-8">
            <MaterialCommunityIcons 
              name="store-outline" 
              size={64} 
              color={isDarkMode ? '#4B5563' : '#D1D5DB'} 
            />
            <Text className={`text-lg font-medium mt-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {searchQuery ? 'Aucun service trouvé' : 'Aucun service disponible'}
            </Text>
            <Text className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              {searchQuery 
                ? `Aucun prestataire ne correspond à "${searchQuery}" dans cette catégorie.`
                : city && city !== 'Sélectionnez votre ville'
                  ? `Aucun prestataire n'est disponible pour cette catégorie à ${city}.`
                  : 'Aucun prestataire n\'est disponible pour cette catégorie.'
              }
            </Text>
          </View>
        )}
      </View>

    </AppLayout>
  );
}
