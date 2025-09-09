import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
import { useDarkTheme } from '../contexts/DarkThemeContext';
import { useTheme } from '../contexts/ThemeContext';
import { useProfileCompletion } from '../hooks/useProfileCompletion';
import { useAuth } from '../lib/auth';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isProfileComplete, isLoading: profileLoading } = useProfileCompletion();
  const { colors } = useTheme();
  const { isDarkMode } = useDarkTheme();
  const [activeTab, setActiveTab] = useState('accueil');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  // Update active tab based on current route
  useEffect(() => {
    const path = pathname.split('/').pop();
    if (path && ['accueil', 'calendrier', 'questions', 'quizz', 'reglages'].includes(path)) {
      setActiveTab(path);
    }
  }, [pathname]);

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);
    // Navigate to the corresponding page
    router.push(`/pages/${tabName}`);
  };

  // Show loading while checking auth or profile completion
  if (loading || profileLoading) {
    return (
      <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'} justify-center items-center`} style={{ paddingTop: '10%' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className={`mt-4 ${isDarkMode ? 'text-dark-text-secondary' : 'text-text-secondary'}`}>Chargement...</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  return (
    <View className={`flex-1 ${isDarkMode ? 'bg-dark-bg' : 'bg-background'}`} style={{ paddingTop: '10%' }}>
      <View className="flex-1">
        {children}
      </View>
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

