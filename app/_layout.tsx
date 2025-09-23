import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import "../app/global.css";

import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkThemeProvider } from '../contexts/DarkThemeContext';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { AuthProvider } from '../lib/auth';

// Inner component that waits for language loading
function AppContent() {
  const colorScheme = useColorScheme();
  const { isLoading } = useLanguage();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#2DB6FF" />
      </View>
    );
  }

  return (
    <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="pages" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <DarkThemeProvider>
            <NotificationProvider>
              <AppContent />
            </NotificationProvider>
          </DarkThemeProvider>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}
