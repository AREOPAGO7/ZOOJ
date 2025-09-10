import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from 'react-native';
import { useDarkTheme } from '../../contexts/DarkThemeContext';
import { useProfileCompletion } from '../../hooks/useProfileCompletion';
import { useServiceCategories, useServiceSubcategories } from '../../hooks/useServiceData';
import { useAuth } from '../../lib/auth';
import AppLayout from '../app-layout';

interface CategoryCardProps {
  category: {
    id: string;
    name: string;
    description?: string;
    icon?: string;
  };
  subcategories: Array<{
    id: string;
    name: string;
    description?: string;
    icon?: string;
  }>;
  onSubcategoryPress: (subcategory: any) => void;
  isDarkMode?: boolean;
}

function CategoryCard({ category, subcategories, onSubcategoryPress, isDarkMode = false }: CategoryCardProps) {
  return (
    <View className="mb-6">
      <Text className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        {category.name}
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {subcategories.map((subcategory, index) => (
          <Pressable
            key={subcategory.id}
            className={`w-[48%] mb-3 p-4 rounded-2xl shadow-sm border ${
              isDarkMode 
                ? 'bg-dark-surface border-dark-border' 
                : 'bg-white border-gray-100'
            }`}
            onPress={() => onSubcategoryPress(subcategory)}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
              elevation: 2,
            }}
          >
            <Text className="text-2xl mb-2">{subcategory.icon || '📋'}</Text>
            <Text className={`text-sm font-semibold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {subcategory.name}
            </Text>
            {subcategory.description && (
              <Text className={`text-xs leading-tight ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {subcategory.description}
              </Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function BonsPlansPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { isDarkMode } = useDarkTheme();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('Sélectionnez votre ville');
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  
  const { categories, loading: categoriesLoading, error: categoriesError } = useServiceCategories();
  const { subcategories, loading: subcategoriesLoading, error: subcategoriesError } = useServiceSubcategories();

  // Debug logging
  console.log('Categories:', categories.length, 'Loading:', categoriesLoading, 'Error:', categoriesError);
  console.log('Subcategories:', subcategories.length, 'Loading:', subcategoriesLoading, 'Error:', subcategoriesError);
  console.log('Dark Mode:', isDarkMode);

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
        ...(selectedCity !== 'Sélectionnez votre ville' && { city: selectedCity })
      }
    });
  };

  const handleSearch = () => {
    router.push({
      pathname: '/pages/search-results',
      params: { 
        ...(selectedCity !== 'Sélectionnez votre ville' && { city: selectedCity })
      }
    });
  };

  const cities = ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Agadir', 'Tanger'];

  // Group subcategories by category and filter by search query
  const categoriesWithSubcategories = categories
    .filter(category => {
      if (!searchQuery.trim()) return true;
      return category.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .map(category => ({
      ...category,
      subcategories: subcategories.filter(sub => sub.category_id === category.id)
    }))
    .filter(cat => cat.subcategories.length > 0);

  if (categoriesLoading || subcategoriesLoading) {
    return (
      <AppLayout>
        <View className={`flex-1 justify-center items-center ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
          <ActivityIndicator size="large" color="#F47CC6" />
          <Text className={`mt-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            Chargement...
          </Text>
        </View>
      </AppLayout>
    );
  }

  if (categoriesError || subcategoriesError) {
    return (
      <AppLayout>
        <View className={`flex-1 justify-center items-center px-8 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={64} 
            color="#DC2626" 
          />
          <Text className={`text-lg font-medium mt-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Erreur de chargement
          </Text>
          <Text className={`text-sm text-center mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            {categoriesError || subcategoriesError}
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
              Bons plans
            </Text>
            <Pressable onPress={() => setShowSearchInput(!showSearchInput)}>
              <MaterialCommunityIcons 
                name="magnify" 
                size={24} 
                color={isDarkMode ? '#FFFFFF' : '#374151'} 
              />
            </Pressable>
          </View>
          
          <Text className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Choisissez la catégorie du service que vous cherchez
          </Text>
          
          {/* Collapsible Search Input */}
          {showSearchInput && (
            <TextInput
              className={`p-3 rounded-lg border mb-3 ${
                isDarkMode 
                  ? 'bg-dark-bg border-dark-border text-white' 
                  : 'bg-white border-gray-200 text-gray-900'
              }`}
              placeholder="Rechercher une catégorie..."
              placeholderTextColor={isDarkMode ? '#9CA3AF' : '#9CA3AF'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoFocus={true}
            />
          )}
          
          {/* City Selector */}
          <Pressable 
            className={`flex-row items-center justify-between p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-dark-bg border-dark-border' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setShowCitySelector(!showCitySelector)}
          >
            <Text className={isDarkMode ? 'text-gray-300' : 'text-gray-500'}>
              Sélectionnez votre ville
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

        {/* Categories and Subcategories */}
        <ScrollView className={`flex-1 px-4 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`} showsVerticalScrollIndicator={false}>
          {categoriesWithSubcategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              subcategories={category.subcategories}
              onSubcategoryPress={handleSubcategoryPress}
              isDarkMode={isDarkMode}
            />
          ))}
        </ScrollView>
      </View>
    </AppLayout>
  );
}
