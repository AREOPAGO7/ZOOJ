import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    TextInput,
    View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useSearchSubcategories } from '../../hooks/useServiceData';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

interface SearchResultCardProps {
  subcategory: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    service_categories?: {
      name: string;
    };
  };
  onPress: () => void;
  isDarkMode?: boolean;
}

function SearchResultCard({ subcategory, onPress, isDarkMode = false }: SearchResultCardProps) {
  return (
    <Pressable
      className={`mb-4 p-4 rounded-2xl shadow-sm border ${
        isDarkMode 
          ? 'bg-dark-surface border-dark-border' 
          : 'bg-white border-gray-100'
      }`}
      onPress={onPress}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View className="flex-row items-center">
        {/* Icon */}
        <View className="mr-4">
          <Text className="text-3xl">{subcategory.icon || '📋'}</Text>
        </View>
        
        {/* Subcategory Info */}
        <View className="flex-1">
          <Text className={`text-base font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {subcategory.name}
          </Text>
          
          {subcategory.service_categories && (
            <Text className={`text-sm mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              {subcategory.service_categories.name}
            </Text>
          )}
          
          {subcategory.description && (
            <Text className={`text-sm leading-tight ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {subcategory.description}
            </Text>
          )}
        </View>
        
        {/* Arrow */}
        <MaterialCommunityIcons 
          name="chevron-right" 
          size={20} 
          color={isDarkMode ? '#9CA3AF' : '#9CA3AF'} 
        />
      </View>
    </Pressable>
  );
}

export default function SearchResultsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [showCitySelector, setShowCitySelector] = useState(false);
  
  const { query, city } = useLocalSearchParams<{
    query?: string;
    city?: string;
  }>();
  
  // Initialize search query and city from params
  useEffect(() => {
    if (query) setSearchQuery(query);
    if (city) setSelectedCity(city);
  }, [query, city]);
  
  const { subcategories, loading: searchLoading } = useSearchSubcategories(searchQuery, selectedCity);
  
  const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Agadir', 'Tanger'];

  // Don't render if not authenticated or profile not completed
  if (loading || profileLoading || !user || !isProfileComplete) {
    return null;
  }

  const handleSubcategoryPress = (subcategory: any) => {
    router.push({
      pathname: '/pages/service-providers',
      params: { 
        subcategoryId: subcategory.id,
        subcategoryName: subcategory.name,
        ...(selectedCity && selectedCity !== 'Sélectionnez votre ville' && { city: selectedCity })
      }
    });
  };

  if (searchLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
          <ActivityIndicator size="large" color="#F47CC6" />
          <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            Recherche en cours...
          </Text>
        </View>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
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
              Recherche
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
            placeholder="Rechercher un service..."
            placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          
          {/* City Selector */}
          <Pressable 
            className={`flex-row items-center justify-between p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-dark-bg border-dark-border' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setShowCitySelector(!showCitySelector)}
          >
            <Text className={selectedCity ? (isDarkMode ? "text-white" : "text-gray-900") : (isDarkMode ? "text-gray-300" : "text-gray-500")}>
              {selectedCity || 'Sélectionnez votre ville'}
            </Text>
            <MaterialCommunityIcons 
              name="chevron-down" 
              size={20} 
              color={isDarkMode ? '#9CA3AF' : '#9CA3AF'} 
            />
          </Pressable>
        </View>

        {/* City Selector Dropdown */}
        {showCitySelector && (
          <View className={`mx-4 mb-4 rounded-lg border shadow-sm ${
            isDarkMode 
              ? 'bg-dark-surface border-dark-border' 
              : 'bg-white border-gray-200'
          }`}>
            {cities.map((city) => (
              <Pressable
                key={city}
                className={`p-3 border-b ${
                  isDarkMode ? 'border-dark-border' : 'border-gray-100'
                }`}
                onPress={() => {
                  setSelectedCity(city);
                  setShowCitySelector(false);
                }}
              >
                <Text className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {city}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Search Results */}
        {subcategories.length > 0 ? (
          <FlatList
            data={subcategories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <SearchResultCard 
                subcategory={item} 
                onPress={() => handleSubcategoryPress(item)}
                isDarkMode={isDarkMode}
              />
            )}
          />
        ) : (
          <View className="flex-1 justify-center items-center px-8">
            <MaterialCommunityIcons 
              name="magnify" 
              size={64} 
              color={isDarkMode ? '#4B5563' : '#D1D5DB'} 
            />
            <Text className={`text-lg font-medium mt-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Aucun résultat trouvé
            </Text>
            <Text className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              {searchQuery ? `Aucune catégorie ne correspond à votre recherche "${searchQuery}".` : 'Commencez par taper votre recherche ci-dessus.'}
            </Text>
            <Pressable
              className="mt-4 px-6 py-2 rounded-lg bg-pink-500"
              onPress={() => router.push('/pages/bons-plans')}
            >
              <Text className="text-white font-medium">Nouvelle recherche</Text>
            </Pressable>
          </View>
        )}
      </View>
    </AppLayout>
  );
}
