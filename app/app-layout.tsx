import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import BottomNavigation from '../components/BottomNavigation';
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
      </View>
    );
  }

  // Don't render if not authenticated or profile not completed
  if (!user || !isProfileComplete) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {children}
      </View>
      <BottomNavigation activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#FFFFFF', // Removed - now dynamic
    // Add global top margin for notch safety (5% of screen height)
    paddingTop: '10%',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor: '#FFFFFF', // Removed - now dynamic
    // Add top margin for loading screen too
    paddingTop: '5%',
  },
  loadingText: {
    marginTop: 16,
    // color: '#7A7A7A', // Removed - now dynamic
  },
});
